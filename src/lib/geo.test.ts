import { describe, expect, it } from 'vitest';
import {
    bearing,
    destinationPoint,
    distanceNm,
    normalizeAngle,
    computeTWA,
    msToKnots,
    knotsToMs,
    angularDifference,
} from './geo';

describe('geo', () => {
    it('computes approximately 60nm for one degree of longitude at equator', () => {
        const d = distanceNm(0, 0, 0, 1);
        expect(d).toBeGreaterThan(59.9);
        expect(d).toBeLessThan(60.2);
    });

    it('computes cardinal bearings', () => {
        expect(bearing(0, 0, 1, 0)).toBeCloseTo(0, 6);
        expect(bearing(0, 0, 0, 1)).toBeCloseTo(90, 6);
    });

    it('reaches expected destination for due-east travel', () => {
        const [lat, lon] = destinationPoint(0, 0, 90, 60);
        expect(lat).toBeCloseTo(0, 3);
        expect(lon).toBeCloseTo(1, 2);
    });

    it('normalizes angles and computes symmetric TWA', () => {
        expect(normalizeAngle(-10)).toBe(350);
        expect(normalizeAngle(725)).toBe(5);
        expect(computeTWA(350, 10)).toBe(20);
        expect(computeTWA(10, 350)).toBe(20);
    });

    it('converts m/s and knots consistently', () => {
        expect(msToKnots(0)).toBe(0);
        expect(knotsToMs(0)).toBe(0);

        const ms = 12.34;
        expect(knotsToMs(msToKnots(ms))).toBeCloseTo(ms, 10);

        const kt = 24.5;
        expect(msToKnots(knotsToMs(kt))).toBeCloseTo(kt, 10);
    });

    it('computes signed wrapped angular difference', () => {
        expect(angularDifference(10, 20)).toBe(10);
        expect(angularDifference(350, 10)).toBe(20);
        expect(angularDifference(10, 350)).toBe(-20);
        expect(angularDifference(0, 181)).toBe(-179);
    });
});
