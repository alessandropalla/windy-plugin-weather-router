import { describe, expect, it } from 'vitest';
import { isLegCrossingNoGoZone, isPointInNoGoZone } from './nogozones';
import type { NoGoZone } from '../types/routing';

const square: NoGoZone = {
    id: 'z1',
    name: 'Square',
    vertices: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 1 },
        { lat: 1, lon: 1 },
        { lat: 1, lon: 0 },
    ],
};

describe('nogozones', () => {
    it('detects point inclusion', () => {
        expect(isPointInNoGoZone(0.5, 0.5, [square])).toBe(true);
        expect(isPointInNoGoZone(1.5, 0.5, [square])).toBe(false);
    });

    it('detects crossing leg and clear leg', () => {
        expect(isLegCrossingNoGoZone(0.5, -0.5, 0.5, 1.5, [square])).toBe(true);
        expect(isLegCrossingNoGoZone(2, 2, 3, 3, [square])).toBe(false);
    });

    it('treats endpoints inside polygon as crossing', () => {
        expect(isLegCrossingNoGoZone(0.5, 0.5, 2, 2, [square])).toBe(true);
    });
});
