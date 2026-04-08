import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    interpolateBoatSpeed,
    parsePolarCSV,
    polarToCSV,
    savePolar,
    loadAllPolars,
    loadPolar,
    deletePolar,
    findBestUpwindTWA,
} from './polar';
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

describe('parsePolarCSV and serialization helpers', () => {
    it('parses whitespace-delimited POL content with comments', () => {
        const text = `
! expedition style
# second comment
twa/tws 10 20
30 5 7
60 6 10
`;

        const polar = parsePolarCSV(text, 'FromPOL');
        expect(polar.name).toBe('FromPOL');
        expect(polar.twsValues).toEqual([10, 20]);
        expect(polar.twaValues).toEqual([30, 60]);
        expect(polar.speeds).toEqual([
            [5, 7],
            [6, 10],
        ]);
    });

    it('parses semicolon-delimited rows and clamps invalid speed values to 0', () => {
        const text = `TWA/TWS;8;12\n45;4.2;bad\n90;-1;7.5`;
        const polar = parsePolarCSV(text, 'Semicolon');

        expect(polar.twsValues).toEqual([8, 12]);
        expect(polar.twaValues).toEqual([45, 90]);
        expect(polar.speeds).toEqual([
            [4.2, 0],
            [0, 7.5],
        ]);
    });

    it('throws when header has no valid TWS values', () => {
        expect(() => parsePolarCSV('TWA/TWS,foo,bar\n45,5,6')).toThrowError(/No valid TWS/);
    });

    it('round-trips via TSV serialization and parser', () => {
        const serialized = polarToCSV(testPolar);
        const parsed = parsePolarCSV(serialized, 'RoundTrip');

        expect(parsed.twaValues).toEqual(testPolar.twaValues);
        expect(parsed.twsValues).toEqual(testPolar.twsValues);
        expect(parsed.speeds).toEqual(testPolar.speeds);
    });
});

describe('polar localStorage helpers', () => {
    beforeEach(() => {
        const store = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: vi.fn((key: string) => store.get(key) ?? null),
            setItem: vi.fn((key: string, value: string) => {
                store.set(key, value);
            }),
            removeItem: vi.fn((key: string) => {
                store.delete(key);
            }),
            clear: vi.fn(() => {
                store.clear();
            }),
        });
    });

    it('saves, loads, and deletes named polars', () => {
        savePolar(testPolar);
        expect(Object.keys(loadAllPolars())).toEqual(['test']);
        expect(loadPolar('test')?.name).toBe('test');

        deletePolar('test');
        expect(loadPolar('test')).toBeNull();
    });
});

describe('findBestUpwindTWA', () => {
    it('selects the best upwind VMG angle for given wind', () => {
        const best = findBestUpwindTWA(testPolar, 15);
        expect(best).toBe(30);
    });
});
