const R_EARTH_NM = 3440.065; // Earth radius in nautical miles
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/** Convert m/s to knots */
export function msToKnots(ms: number): number {
    return ms * 1.94384;
}

/** Convert knots to m/s */
export function knotsToMs(kt: number): number {
    return kt / 1.94384;
}

/** Haversine distance between two points in nautical miles */
export function distanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = (lat2 - lat1) * DEG2RAD;
    const dLon = (lon2 - lon1) * DEG2RAD;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R_EARTH_NM * c;
}

/** Initial bearing from point 1 to point 2 in degrees (0-360) */
export function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * DEG2RAD;
    const y = Math.sin(dLon) * Math.cos(lat2 * DEG2RAD);
    const x =
        Math.cos(lat1 * DEG2RAD) * Math.sin(lat2 * DEG2RAD) -
        Math.sin(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.cos(dLon);
    return ((Math.atan2(y, x) * RAD2DEG) + 360) % 360;
}

/**
 * Compute destination point given start, bearing, and distance.
 * @param lat  Start latitude (degrees)
 * @param lon  Start longitude (degrees)
 * @param brng Bearing in degrees (0-360)
 * @param distNm Distance in nautical miles
 * @returns [lat, lon] of destination
 */
export function destinationPoint(
    lat: number,
    lon: number,
    brng: number,
    distNm: number,
): [number, number] {
    const angDist = distNm / R_EARTH_NM;
    const brngRad = brng * DEG2RAD;
    const lat1 = lat * DEG2RAD;
    const lon1 = lon * DEG2RAD;

    const sinLat1 = Math.sin(lat1);
    const cosLat1 = Math.cos(lat1);
    const sinAngDist = Math.sin(angDist);
    const cosAngDist = Math.cos(angDist);

    const lat2 = Math.asin(sinLat1 * cosAngDist + cosLat1 * sinAngDist * Math.cos(brngRad));
    const lon2 =
        lon1 +
        Math.atan2(
            Math.sin(brngRad) * sinAngDist * cosLat1,
            cosAngDist - sinLat1 * Math.sin(lat2),
        );

    return [lat2 * RAD2DEG, ((lon2 * RAD2DEG) + 540) % 360 - 180];
}

/**
 * Compute True Wind Angle (TWA) from boat heading and true wind direction.
 * TWD is where the wind comes FROM (meteorological convention).
 * Returns 0-180 (symmetric, starboard/port doesn't matter for polars).
 */
export function computeTWA(heading: number, twd: number): number {
    let angle = Math.abs(twd - heading);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(deg: number): number {
    return ((deg % 360) + 360) % 360;
}

/**
 * Angular difference between two bearings (signed, -180 to +180)
 */
export function angularDifference(a: number, b: number): number {
    let d = b - a;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
}
