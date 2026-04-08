import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeRoute, computeRouteWithDepartureOptimization } from './routing';
import type { RouteConfig, Waypoint } from '../types/routing';
import type { BoatConfig } from '../types/polar';
import { getWindAtPointAndTime } from './windgrid';

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
    beforeEach(() => {
        vi.mocked(getWindAtPointAndTime).mockImplementation(() => ({
            tws: 10,
            twd: 0,
            gust: 10,
            waveHeight: 0,
            waveDir: 0,
            wavePeriod: 0,
        }));
    });

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

    it('passes exactly through intermediate waypoints', () => {
        const multiWaypointRoute: Waypoint[] = [
            { lat: 0, lon: 0, name: 'Start' },
            { lat: 0, lon: 0.05, name: 'Mid' },
            { lat: 0, lon: 0.1, name: 'Finish' },
        ];

        const result = computeRoute(
            multiWaypointRoute,
            makeConfig('min-time'),
            { points: [], bounds: { minLat: -1, maxLat: 1, minLon: -1, maxLon: 1 }, resolution: 1 },
        );

        const containsMidpoint = result.optimalPath.some(
            p => Math.abs(p.lat - multiWaypointRoute[1].lat) < 1e-9 && Math.abs(p.lon - multiWaypointRoute[1].lon) < 1e-9,
        );

        expect(containsMidpoint).toBe(true);
    });

    it('optimizes departure and returns ordered departure analysis', () => {
        const base = makeConfig('min-time');
        const config: RouteConfig = {
            ...base,
            optimizeDeparture: true,
            departureWindowHours: 2,
            departureStepHours: 1,
        };

        const progress = vi.fn();
        const result = computeRouteWithDepartureOptimization(
            waypoints,
            config,
            { points: [], bounds: { minLat: -1, maxLat: 1, minLon: -1, maxLon: 1 }, resolution: 1 },
            progress,
        );

        expect(result.optimizedDeparture).toBe(true);
        expect(result.departureAnalysis?.length).toBe(3);
        expect(result.departureAnalysis?.[0].departureTime).toBe(config.departureTime);
        expect(result.departureAnalysis?.[1].departureTime).toBe(config.departureTime + 3600 * 1000);
        expect(result.departureAnalysis?.[2].departureTime).toBe(config.departureTime + 2 * 3600 * 1000);
        expect(result.departureAnalysis?.filter(r => r.selected).length).toBe(1);
        expect(progress).toHaveBeenCalled();
    });

    it('picks the latest feasible departure in arrival-deadline optimization mode', () => {
        const stepMs = 3600 * 1000;
        const startTime = Date.UTC(2026, 0, 1, 0, 0, 0);
        const config: RouteConfig = {
            ...makeConfig('arrival-deadline'),
            departureTime: startTime,
            optimizeDeparture: true,
            departureWindowHours: 2,
            departureStepHours: 1,
            arrivalDeadline: startTime + 10 * stepMs,
        };

        const result = computeRouteWithDepartureOptimization(
            waypoints,
            config,
            { points: [], bounds: { minLat: -1, maxLat: 1, minLon: -1, maxLon: 1 }, resolution: 1 },
        );

        expect(result.departureTime).toBe(startTime + 2 * stepMs);
        expect(result.optimizationMode).toBe('arrival-deadline');
        expect(result.metrics.arrivalTime).toBeLessThanOrEqual(config.arrivalDeadline!);
    });
});
