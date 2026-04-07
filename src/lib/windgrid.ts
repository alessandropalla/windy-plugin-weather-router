import { getPointForecastData } from '@windy/fetch';
import type { DataHash, WeatherDataPayload } from '@windy/interfaces.d';
import type { HttpPayload } from '@windy/http.d';
import type { Waypoint, WindAtPoint } from '../types/routing';
import { msToKnots, distanceNm } from './geo';

/** Cached wind data for a grid of points */
export interface WindGrid {
    /** Grid points with their forecast data */
    points: GridPoint[];
    /** Bounding box of the grid */
    bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
    /** Grid resolution in degrees */
    resolution: number;
}

interface GridPoint {
    lat: number;
    lon: number;
    /** Forecast timestamps (ms) */
    timestamps: number[];
    /** Wind speed in m/s at each timestamp */
    windSpeed: number[];
    /** Wind direction (meteorological, degrees) at each timestamp */
    windDir: number[];
    /** Gust speed in m/s at each timestamp */
    gust: number[];
}

/**
 * Fetch wind forecast data for a grid covering the route corridor.
 * @param waypoints Route waypoints
 * @param product Forecast model ('ecmwf', 'gfs', etc.)
 * @param pluginName Plugin name for API attribution
 * @param corridorWidthNm Width of corridor on each side of route (nm)
 * @param resolution Grid spacing in degrees (~0.5° ≈ 30nm)
 * @param onProgress Progress callback
 */
export async function fetchWindGrid(
    waypoints: Waypoint[],
    product: string,
    pluginName: string,
    corridorWidthNm = 60,
    resolution = 0.5,
    onProgress?: (fetched: number, total: number) => void,
): Promise<WindGrid> {
    // Compute bounding box around all waypoints with corridor padding
    const corridorDeg = corridorWidthNm / 60; // rough: 1° lat ≈ 60nm
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const wp of waypoints) {
        minLat = Math.min(minLat, wp.lat);
        maxLat = Math.max(maxLat, wp.lat);
        minLon = Math.min(minLon, wp.lon);
        maxLon = Math.max(maxLon, wp.lon);
    }
    minLat -= corridorDeg;
    maxLat += corridorDeg;
    minLon -= corridorDeg;
    maxLon += corridorDeg;

    // Clamp to valid range
    minLat = Math.max(-85, minLat);
    maxLat = Math.min(85, maxLat);

    // Generate grid points
    const gridLats: number[] = [];
    const gridLons: number[] = [];
    for (let lat = minLat; lat <= maxLat; lat += resolution) gridLats.push(lat);
    for (let lon = minLon; lon <= maxLon; lon += resolution) gridLons.push(lon);

    const totalPoints = gridLats.length * gridLons.length;
    const points: GridPoint[] = [];
    let fetched = 0;

    // Fetch in batches to avoid overwhelming the API
    const BATCH_SIZE = 8;
    const requests: Array<{ lat: number; lon: number }> = [];
    for (const lat of gridLats) {
        for (const lon of gridLons) {
            requests.push({ lat, lon });
        }
    }

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
        const batch = requests.slice(i, i + BATCH_SIZE);
        const promises = batch.map(({ lat, lon }) =>
            getPointForecastData(product as any, { lat, lon }, pluginName)
                .then((response: HttpPayload<WeatherDataPayload<DataHash>>) => {
                    const data = response.data.data;
                    return {
                        lat,
                        lon,
                        timestamps: data.ts as number[],
                        windSpeed: data.wind as number[],
                        windDir: data.windDir as number[],
                        gust: data.gust as number[],
                    } satisfies GridPoint;
                })
                .catch(() => null),
        );

        const results = await Promise.all(promises);
        for (const r of results) {
            if (r) points.push(r);
        }
        fetched += batch.length;
        onProgress?.(fetched, totalPoints);
    }

    return {
        points,
        bounds: { minLat, maxLat, minLon, maxLon },
        resolution,
    };
}

/**
 * Get interpolated wind at a specific lat/lon and timestamp from the cached grid.
 * Uses inverse-distance-weighted interpolation from nearest grid points
 * and linear interpolation in time.
 */
export function getWindAtPointAndTime(
    lat: number,
    lon: number,
    timestamp: number,
    grid: WindGrid,
): WindAtPoint {
    // Find nearest grid points (up to 4 closest)
    const nearest = findNearestPoints(lat, lon, grid.points, 4);
    if (nearest.length === 0) {
        return { tws: 0, twd: 0, gust: 0 };
    }

    // If only one point or exact match, just interpolate in time
    if (nearest.length === 1 || nearest[0].dist < 0.001) {
        return interpolateInTime(nearest[0].point, timestamp);
    }

    // Inverse-distance-weighted spatial interpolation
    const totalInvDist = nearest.reduce((sum, n) => sum + 1 / n.dist, 0);
    let twsSum = 0, gustSum = 0;
    let twdSin = 0, twdCos = 0; // circular mean for direction

    for (const n of nearest) {
        const weight = (1 / n.dist) / totalInvDist;
        const wind = interpolateInTime(n.point, timestamp);
        twsSum += wind.tws * weight;
        gustSum += wind.gust * weight;
        const twdRad = wind.twd * Math.PI / 180;
        twdSin += Math.sin(twdRad) * weight;
        twdCos += Math.cos(twdRad) * weight;
    }

    const twd = ((Math.atan2(twdSin, twdCos) * 180 / Math.PI) + 360) % 360;
    return { tws: msToKnots(twsSum), twd, gust: msToKnots(gustSum) };
}

/** Interpolate wind data at a specific timestamp for a single grid point */
function interpolateInTime(point: GridPoint, timestamp: number): WindAtPoint {
    const { timestamps, windSpeed, windDir, gust } = point;

    // Before first timestamp: use first value
    if (timestamp <= timestamps[0]) {
        return {
            tws: msToKnots(windSpeed[0]),
            twd: windDir[0],
            gust: msToKnots(gust[0]),
        };
    }

    // After last timestamp: use last value
    if (timestamp >= timestamps[timestamps.length - 1]) {
        const last = timestamps.length - 1;
        return {
            tws: msToKnots(windSpeed[last]),
            twd: windDir[last],
            gust: msToKnots(gust[last]),
        };
    }

    // Find bracket and interpolate
    for (let i = 0; i < timestamps.length - 1; i++) {
        if (timestamp >= timestamps[i] && timestamp <= timestamps[i + 1]) {
            const frac = (timestamp - timestamps[i]) / (timestamps[i + 1] - timestamps[i]);

            const tws = msToKnots(windSpeed[i] * (1 - frac) + windSpeed[i + 1] * frac);
            const g = msToKnots(gust[i] * (1 - frac) + gust[i + 1] * frac);

            // Circular interpolation for wind direction
            const d1 = windDir[i] * Math.PI / 180;
            const d2 = windDir[i + 1] * Math.PI / 180;
            const sin = Math.sin(d1) * (1 - frac) + Math.sin(d2) * frac;
            const cos = Math.cos(d1) * (1 - frac) + Math.cos(d2) * frac;
            const twd = ((Math.atan2(sin, cos) * 180 / Math.PI) + 360) % 360;

            return { tws, twd, gust: g };
        }
    }

    // Fallback
    return { tws: 0, twd: 0, gust: 0 };
}

/** Find N nearest grid points to a given lat/lon */
function findNearestPoints(
    lat: number,
    lon: number,
    points: GridPoint[],
    n: number,
): Array<{ point: GridPoint; dist: number }> {
    const withDist = points.map(p => ({
        point: p,
        dist: distanceNm(lat, lon, p.lat, p.lon),
    }));
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist.slice(0, n);
}
