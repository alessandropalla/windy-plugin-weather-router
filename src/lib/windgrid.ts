import { getPointForecastData, getElevation } from '@windy/fetch';
import { msToKnots, distanceNm } from './geo';
import type { DataHash, WeatherDataPayload } from '@windy/interfaces.d';
import type { HttpPayload } from '@windy/http.d';
import type { Waypoint, WindAtPoint } from '../types/routing';

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
    /** Wave forecast timestamps (ms) */
    waveTimestamps: number[];
    /** Significant wave height in meters at each timestamp */
    waves: number[];
    /** Wave direction in degrees at each timestamp */
    wavesDir: number[];
    /** Wave period in seconds at each timestamp */
    wavesPeriod: number[];
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
    const waveProduct = resolveWaveProduct(product);

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
    for (let lat = minLat; lat <= maxLat; lat += resolution) {
        gridLats.push(lat);
    }
    for (let lon = minLon; lon <= maxLon; lon += resolution) {
        gridLons.push(lon);
    }

    const totalPoints = gridLats.length * gridLons.length;
    const points: GridPoint[] = [];
    let fetched = 0;

    // Fetch in batches to avoid overwhelming the API
    const BATCH_SIZE = 8;
    const requests: { lat: number; lon: number }[] = [];
    for (const lat of gridLats) {
        for (const lon of gridLons) {
            requests.push({ lat, lon });
        }
    }

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
        const batch = requests.slice(i, i + BATCH_SIZE);
        const promises = batch.map(({ lat, lon }) =>
            Promise.all([
                getPointForecastData(product as any, { lat, lon }, pluginName as any),
                waveProduct
                    ? getPointForecastData(waveProduct as any, { lat, lon }, pluginName as any).catch(() => null)
                    : Promise.resolve(null),
            ])
                .then(([windResp, wavesResp]) => {
                    const data = (windResp as HttpPayload<WeatherDataPayload<DataHash>>).data.data;
                    const waveData = (wavesResp as HttpPayload<WeatherDataPayload<DataHash>> | null)?.data.data;
                    return {
                        lat,
                        lon,
                        timestamps: data.ts as number[],
                        windSpeed: data.wind as number[],
                        windDir: data.windDir as number[],
                        gust: data.gust as number[],
                        waveTimestamps: (waveData?.ts || data.ts || []) as number[],
                        waves: (waveData?.waves || data.waves || []) as number[],
                        wavesDir: (waveData?.wavesDir || data.wavesDir || []) as number[],
                        wavesPeriod: (waveData?.wavesPeriod || data.wavesPeriod || []) as number[],
                    } satisfies GridPoint;
                })
                .catch(() => null),
        );

        const results = await Promise.all(promises);
        for (const r of results) {
            if (r) {
                points.push(r);
            }
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
        return { tws: 0, twd: 0, gust: 0, waveHeight: 0, waveDir: 0, wavePeriod: 0 };
    }

    // If only one point or exact match, just interpolate in time
    if (nearest.length === 1 || nearest[0].dist < 0.001) {
        return interpolateInTime(nearest[0].point, timestamp);
    }

    // Inverse-distance-weighted spatial interpolation
    const totalInvDist = nearest.reduce((sum, n) => sum + 1 / n.dist, 0);
    let twsSum = 0, gustSum = 0, waveHeightSum = 0, wavePeriodSum = 0;
    let twdSin = 0, twdCos = 0; // circular mean for direction
    let waveDirSin = 0, waveDirCos = 0;

    for (const n of nearest) {
        const weight = (1 / n.dist) / totalInvDist;
        const wind = interpolateInTime(n.point, timestamp);
        twsSum += wind.tws * weight;
        gustSum += wind.gust * weight;
        waveHeightSum += wind.waveHeight * weight;
        wavePeriodSum += wind.wavePeriod * weight;
        const twdRad = wind.twd * Math.PI / 180;
        twdSin += Math.sin(twdRad) * weight;
        twdCos += Math.cos(twdRad) * weight;
        const waveDirRad = wind.waveDir * Math.PI / 180;
        waveDirSin += Math.sin(waveDirRad) * weight;
        waveDirCos += Math.cos(waveDirRad) * weight;
    }

    const twd = ((Math.atan2(twdSin, twdCos) * 180 / Math.PI) + 360) % 360;
    const waveDir = ((Math.atan2(waveDirSin, waveDirCos) * 180 / Math.PI) + 360) % 360;
    return {
        tws: msToKnots(twsSum),
        twd,
        gust: msToKnots(gustSum),
        waveHeight: waveHeightSum,
        waveDir,
        wavePeriod: wavePeriodSum,
    };
}

/** Interpolate wind data at a specific timestamp for a single grid point */
function interpolateInTime(point: GridPoint, timestamp: number): WindAtPoint {
    const { timestamps, windSpeed, windDir, gust, waveTimestamps, waves, wavesDir, wavesPeriod } = point;
    const lerp = (a: number, b: number, frac: number) => a * (1 - frac) + b * frac;

    const [waveHeightInterp, waveDirInterp, wavePeriodInterp] = interpolateWaves(
        waveTimestamps,
        waves,
        wavesDir,
        wavesPeriod,
        timestamp,
    );

    // Before first timestamp: use first value
    if (timestamp <= timestamps[0]) {
        return {
            tws: msToKnots(windSpeed[0]),
            twd: windDir[0],
            gust: msToKnots(gust[0]),
            waveHeight: waveHeightInterp,
            waveDir: waveDirInterp,
            wavePeriod: wavePeriodInterp,
        };
    }

    // After last timestamp: use last value
    if (timestamp >= timestamps[timestamps.length - 1]) {
        const last = timestamps.length - 1;
        return {
            tws: msToKnots(windSpeed[last]),
            twd: windDir[last],
            gust: msToKnots(gust[last]),
            waveHeight: waveHeightInterp,
            waveDir: waveDirInterp,
            wavePeriod: wavePeriodInterp,
        };
    }

    // Find bracket and interpolate
    for (let i = 0; i < timestamps.length - 1; i++) {
        if (timestamp >= timestamps[i] && timestamp <= timestamps[i + 1]) {
            const frac = (timestamp - timestamps[i]) / (timestamps[i + 1] - timestamps[i]);

            const tws = msToKnots(lerp(windSpeed[i], windSpeed[i + 1], frac));
            const g = msToKnots(lerp(gust[i], gust[i + 1], frac));

            // Circular interpolation for wind direction
            const d1 = windDir[i] * Math.PI / 180;
            const d2 = windDir[i + 1] * Math.PI / 180;
            const sin = Math.sin(d1) * (1 - frac) + Math.sin(d2) * frac;
            const cos = Math.cos(d1) * (1 - frac) + Math.cos(d2) * frac;
            const twd = ((Math.atan2(sin, cos) * 180 / Math.PI) + 360) % 360;

            return {
                tws,
                twd,
                gust: g,
                waveHeight: waveHeightInterp,
                waveDir: waveDirInterp,
                wavePeriod: wavePeriodInterp,
            };
        }
    }

    // Fallback
    return { tws: 0, twd: 0, gust: 0, waveHeight: 0, waveDir: 0, wavePeriod: 0 };
}

function interpolateWaves(
    timestamps: number[],
    waves: number[],
    wavesDir: number[],
    wavesPeriod: number[],
    timestamp: number,
): [number, number, number] {
    if (timestamps.length === 0) {
        return [0, 0, 0];
    }

    const safeAt = (arr: number[], idx: number) => (idx >= 0 && idx < arr.length ? arr[idx] : 0);
    const lerp = (a: number, b: number, frac: number) => a * (1 - frac) + b * frac;
    const interpDir = (d1: number, d2: number, frac: number) => {
        const r1 = d1 * Math.PI / 180;
        const r2 = d2 * Math.PI / 180;
        const sin = Math.sin(r1) * (1 - frac) + Math.sin(r2) * frac;
        const cos = Math.cos(r1) * (1 - frac) + Math.cos(r2) * frac;
        return ((Math.atan2(sin, cos) * 180 / Math.PI) + 360) % 360;
    };

    if (timestamp <= timestamps[0]) {
        return [safeAt(waves, 0), safeAt(wavesDir, 0), safeAt(wavesPeriod, 0)];
    }

    const last = timestamps.length - 1;
    if (timestamp >= timestamps[last]) {
        return [safeAt(waves, last), safeAt(wavesDir, last), safeAt(wavesPeriod, last)];
    }

    for (let i = 0; i < timestamps.length - 1; i++) {
        if (timestamp >= timestamps[i] && timestamp <= timestamps[i + 1]) {
            const frac = (timestamp - timestamps[i]) / (timestamps[i + 1] - timestamps[i]);
            const waveHeight = lerp(safeAt(waves, i), safeAt(waves, i + 1), frac);
            const wavePeriod = lerp(safeAt(wavesPeriod, i), safeAt(wavesPeriod, i + 1), frac);
            const waveDir = interpDir(safeAt(wavesDir, i), safeAt(wavesDir, i + 1), frac);
            return [waveHeight, waveDir, wavePeriod];
        }
    }

    return [0, 0, 0];
}

function resolveWaveProduct(product: string): string | null {
    if (product === 'ecmwf') {
        return 'ecmwfWaves';
    }
    if (product === 'gfs') {
        return 'gfsWaves';
    }
    if (product === 'icon') {
        return 'iconEuWaves';
    }
    return null;
}

/** Find N nearest grid points to a given lat/lon */
function findNearestPoints(
    lat: number,
    lon: number,
    points: GridPoint[],
    n: number,
): { point: GridPoint; dist: number }[] {
    const withDist = points.map(p => ({
        point: p,
        dist: distanceNm(lat, lon, p.lat, p.lon),
    }));
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist.slice(0, n);
}

// ─── Elevation Grid for Land Avoidance ───────────────────────────────────────

export interface ElevationGrid {
    /** 2D array of elevation values in meters AMSL: data[latIdx][lonIdx] */
    data: number[][];
    minLat: number;
    minLon: number;
    latStep: number;
    lonStep: number;
    latCount: number;
    lonCount: number;
}

const LAND_ELEVATION_THRESHOLD = 0; // meters AMSL — anything above is land

/**
 * Fetch an elevation grid covering the route corridor.
 * Uses the Windy getElevation API to build a 2D grid for fast synchronous lookups.
 */
export async function fetchElevationGrid(
    waypoints: Waypoint[],
    corridorWidthNm = 60,
    resolution = 0.1,
    onProgress?: (fetched: number, total: number) => void,
): Promise<ElevationGrid> {
    const corridorDeg = corridorWidthNm / 60;
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const wp of waypoints) {
        minLat = Math.min(minLat, wp.lat);
        maxLat = Math.max(maxLat, wp.lat);
        minLon = Math.min(minLon, wp.lon);
        maxLon = Math.max(maxLon, wp.lon);
    }
    minLat = Math.max(-85, minLat - corridorDeg);
    maxLat = Math.min(85, maxLat + corridorDeg);
    minLon -= corridorDeg;
    maxLon += corridorDeg;

    const gridLats: number[] = [];
    const gridLons: number[] = [];
    for (let lat = minLat; lat <= maxLat; lat += resolution) gridLats.push(lat);
    for (let lon = minLon; lon <= maxLon; lon += resolution) gridLons.push(lon);

    const latCount = gridLats.length;
    const lonCount = gridLons.length;
    const totalPoints = latCount * lonCount;

    // Initialize grid with 0 (water)
    const data: number[][] = Array.from({ length: latCount }, () => new Array(lonCount).fill(0));

    // Build request list
    const requests: { latIdx: number; lonIdx: number; lat: number; lon: number }[] = [];
    for (let li = 0; li < latCount; li++) {
        for (let lj = 0; lj < lonCount; lj++) {
            requests.push({ latIdx: li, lonIdx: lj, lat: gridLats[li], lon: gridLons[lj] });
        }
    }

    const BATCH_SIZE = 16;
    let fetched = 0;

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
        const batch = requests.slice(i, i + BATCH_SIZE);
        const promises = batch.map(({ latIdx, lonIdx, lat, lon }) =>
            getElevation(lat, lon)
                .then((resp: HttpPayload<number>) => {
                    data[latIdx][lonIdx] = resp.data;
                })
                .catch(() => {
                    // On error, assume water (0)
                    data[latIdx][lonIdx] = 0;
                }),
        );
        await Promise.all(promises);
        fetched += batch.length;
        onProgress?.(Math.min(fetched, totalPoints), totalPoints);
    }

    return {
        data,
        minLat: gridLats[0],
        minLon: gridLons[0],
        latStep: resolution,
        lonStep: resolution,
        latCount,
        lonCount,
    };
}

/** Get bilinear-interpolated elevation at a point from the cached grid. */
export function getElevationAtPoint(lat: number, lon: number, grid: ElevationGrid): number {
    const latIdx = (lat - grid.minLat) / grid.latStep;
    const lonIdx = (lon - grid.minLon) / grid.lonStep;

    const i0 = Math.floor(latIdx);
    const j0 = Math.floor(lonIdx);

    // Outside the grid → assume water
    if (i0 < 0 || i0 >= grid.latCount - 1 || j0 < 0 || j0 >= grid.lonCount - 1) {
        return 0;
    }

    const i1 = i0 + 1;
    const j1 = j0 + 1;
    const fLat = latIdx - i0;
    const fLon = lonIdx - j0;

    return (
        grid.data[i0][j0] * (1 - fLat) * (1 - fLon) +
        grid.data[i0][j1] * (1 - fLat) * fLon +
        grid.data[i1][j0] * fLat * (1 - fLon) +
        grid.data[i1][j1] * fLat * fLon
    );
}

/** Check whether a point is on land. */
export function isPointOnLand(lat: number, lon: number, grid: ElevationGrid): boolean {
    return getElevationAtPoint(lat, lon, grid) > LAND_ELEVATION_THRESHOLD;
}

/**
 * Check whether a straight leg between two points crosses land.
 * Samples intermediate points along the segment.
 */
export function isLegOverLand(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
    grid: ElevationGrid,
    samples = 5,
): boolean {
    for (let i = 1; i < samples; i++) {
        const frac = i / samples;
        const lat = lat1 + (lat2 - lat1) * frac;
        const lon = lon1 + (lon2 - lon1) * frac;
        if (isPointOnLand(lat, lon, grid)) {
            return true;
        }
    }
    return false;
}
