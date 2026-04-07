import { describe, expect, it, vi } from 'vitest';
import { computeRoute } from './routing';
import type { RouteConfig, Waypoint } from '../types/routing';
import type { BoatConfig } from '../types/polar';

vi.mock('./windgrid', () => ({
    getWindAtPointAndTime: vi.fn(() => ({
        tws: 10,
        twd: 0,
        gust: 10,
        waveHeight: 0,
        waveDir: 0,
        wavePeriod: 0,
    })),
    isPointOnLand: vi.fn(() => false),
    isLegOverLand: vi.fn(() => false),
}));

const boat: BoatConfig = {
    polar: {
        name: 'routing-test-polar',
        twaValues: [0, 30, 60, 90, 120, 150, 180],
        twsValues: [5, 10, 15],
        speeds: [
            [0, 0, 0],
            [4, 4, 4],
            [5, 5, 5],
            [6, 6, 6],
            [5, 5, 5],
            [4, 4, 4],
            [3, 3, 3],
        ],
    },
    motor: {
        enabled: false,
        motorSpeed: 5,
        windThreshold: 4,
        maxMotorHours: 0,
        fuelBurnLph: 2,
    },
};

const waypoints: Waypoint[] = [
    { lat: 0, lon: 0, name: 'Start' },
    { lat: 0, lon: 0.1, name: 'Finish' },
];

function makeConfig(mode: RouteConfig['mode']): RouteConfig {
    return {
        departureTime: Date.UTC(2026, 0, 1, 0, 0, 0),
        timeStepHours: 1,
        angularResolution: 90,
        maxDurationHours: 8,
        mode,
        optimizeDeparture: false,
        departureWindowHours: 0,
        departureStepHours: 1,
        product: 'test',
        boat,
    };
}

describe('routing computeRoute metrics and scoring', () => {
    it('builds a feasible route with positive metrics and min-time score', () => {
        const result = computeRoute(waypoints, makeConfig('min-time'), { points: [], bounds: { minLat: -1, maxLat: 1, minLon: -1, maxLon: 1 }, resolution: 1 });

        expect(result.optimalPath.length).toBeGreaterThanOrEqual(2);
        expect(result.metrics.totalDistanceNm).toBeGreaterThan(0);
        expect(result.metrics.totalTimeHours).toBeGreaterThan(0);
        expect(result.metrics.arrivalTime).toBeGreaterThan(result.departureTime);
        expect(result.optimizationScore).toBeCloseTo(result.metrics.totalTimeHours, 6);
    });

    it('throws when arrival deadline is impossible', () => {
        const impossibleDeadline = Date.UTC(2025, 0, 1, 0, 0, 0);
        const config = {
            ...makeConfig('arrival-deadline'),
            arrivalDeadline: impossibleDeadline,
        };

        expect(() =>
            computeRoute(waypoints, config, { points: [], bounds: { minLat: -1, maxLat: 1, minLon: -1, maxLon: 1 }, resolution: 1 }),
        ).toThrowError(/Arrival deadline/);
    });
});
