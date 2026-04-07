import { describe, expect, it } from 'vitest';
import { interpolateBoatSpeed } from './polar';
import type { PolarDiagram } from '../types/polar';

const testPolar: PolarDiagram = {
    name: 'test',
    twaValues: [30, 60],
    twsValues: [10, 20],
    speeds: [
        [5, 7],
        [6, 10],
    ],
};

describe('interpolateBoatSpeed', () => {
    it('returns exact grid values on breakpoints', () => {
        expect(interpolateBoatSpeed(testPolar, 30, 10)).toBe(5);
        expect(interpolateBoatSpeed(testPolar, 60, 20)).toBe(10);
    });

    it('performs bilinear interpolation within the table', () => {
        const speed = interpolateBoatSpeed(testPolar, 45, 15);
        expect(speed).toBeCloseTo(7, 6);
    });

    it('clamps twa and tws at upper bounds', () => {
        expect(interpolateBoatSpeed(testPolar, 200, 50)).toBe(10);
    });

    it('returns 0 for invalid low wind or below minimum twa', () => {
        expect(interpolateBoatSpeed(testPolar, 20, 12)).toBe(0);
        expect(interpolateBoatSpeed(testPolar, 45, 0)).toBe(0);
    });

    it('scales linearly for wind below first tws breakpoint', () => {
        const speed = interpolateBoatSpeed(testPolar, 30, 5);
        expect(speed).toBeCloseTo(2.5, 6);
    });
});
