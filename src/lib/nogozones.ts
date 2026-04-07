import type { NoGoZone } from '../types/routing';

/**
 * Test whether a point lies inside a polygon using the ray-casting algorithm.
 * Vertices define a closed polygon (last edge connects last vertex to first).
 */
function pointInPolygon(
    lat: number,
    lon: number,
    vertices: { lat: number; lon: number }[],
): boolean {
    const n = vertices.length;
    if (n < 3) return false;

    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const yi = vertices[i].lat, xi = vertices[i].lon;
        const yj = vertices[j].lat, xj = vertices[j].lon;

        if ((yi > lat) !== (yj > lat) &&
            lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Test whether two line segments intersect.
 * Segment 1: (ax,ay)-(bx,by), Segment 2: (cx,cy)-(dx,dy).
 */
function segmentsIntersect(
    ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, dx: number, dy: number,
): boolean {
    const cross = (ux: number, uy: number, vx: number, vy: number) => ux * vy - uy * vx;

    const abx = bx - ax, aby = by - ay;
    const acx = cx - ax, acy = cy - ay;
    const adx = dx - ax, ady = dy - ay;

    const d1 = cross(abx, aby, acx, acy);
    const d2 = cross(abx, aby, adx, ady);
    if (d1 * d2 > 0) return false;

    const cdx = dx - cx, cdy = dy - cy;
    const cax = ax - cx, cay = ay - cy;
    const cbx = bx - cx, cby = by - cy;

    const d3 = cross(cdx, cdy, cax, cay);
    const d4 = cross(cdx, cdy, cbx, cby);
    if (d3 * d4 > 0) return false;

    return true;
}

/** Check whether a point is inside any no-go zone. */
export function isPointInNoGoZone(
    lat: number,
    lon: number,
    zones: NoGoZone[],
): boolean {
    for (const zone of zones) {
        if (pointInPolygon(lat, lon, zone.vertices)) {
            return true;
        }
    }
    return false;
}

/** Check whether a leg segment crosses any no-go zone polygon edge. */
export function isLegCrossingNoGoZone(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
    zones: NoGoZone[],
): boolean {
    for (const zone of zones) {
        const verts = zone.vertices;
        const n = verts.length;
        if (n < 3) continue;

        // Check if either endpoint is inside the polygon
        if (pointInPolygon(lat1, lon1, verts) || pointInPolygon(lat2, lon2, verts)) {
            return true;
        }

        // Check if segment intersects any polygon edge
        for (let i = 0, j = n - 1; i < n; j = i++) {
            if (segmentsIntersect(
                lon1, lat1, lon2, lat2,
                verts[j].lon, verts[j].lat, verts[i].lon, verts[i].lat,
            )) {
                return true;
            }
        }
    }
    return false;
}
