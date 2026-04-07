import type { Waypoint } from '../types/routing';
import { distanceNm, bearing } from './geo';

const STORAGE_KEY = 'windy-router-waypoints';

/** Compute total route distance in nautical miles */
export function totalRouteDistance(waypoints: Waypoint[]): number {
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
        total += distanceNm(
            waypoints[i - 1].lat,
            waypoints[i - 1].lon,
            waypoints[i].lat,
            waypoints[i].lon,
        );
    }
    return total;
}

/** Compute distance of each leg */
export function legDistances(waypoints: Waypoint[]): number[] {
    const distances: number[] = [];
    for (let i = 1; i < waypoints.length; i++) {
        distances.push(
            distanceNm(
                waypoints[i - 1].lat,
                waypoints[i - 1].lon,
                waypoints[i].lat,
                waypoints[i].lon,
            ),
        );
    }
    return distances;
}

/** Compute initial bearing for each leg */
export function legBearings(waypoints: Waypoint[]): number[] {
    const bearings: number[] = [];
    for (let i = 1; i < waypoints.length; i++) {
        bearings.push(
            bearing(
                waypoints[i - 1].lat,
                waypoints[i - 1].lon,
                waypoints[i].lat,
                waypoints[i].lon,
            ),
        );
    }
    return bearings;
}

/** Save waypoints to localStorage */
export function saveWaypoints(waypoints: Waypoint[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(waypoints));
}

/** Load waypoints from localStorage */
export function loadWaypoints(): Waypoint[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

/** Generate a default name for a waypoint based on its index */
export function defaultWaypointName(index: number): string {
    return `WPT ${index + 1}`;
}

/** Format lat/lon for display */
export function formatLatLon(lat: number, lon: number): string {
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(3)}°${ns} ${Math.abs(lon).toFixed(3)}°${ew}`;
}
