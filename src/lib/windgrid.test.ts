import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getElevation } from '@windy/fetch';
import type { Waypoint } from '../types/routing';

vi.mock('@windy/fetch', () => ({
    getPointForecastData: vi.fn(),
    getElevation: vi.fn(async () => ({ data: 0 })),
}));

type StorageLike = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
};

function makeLocalStorageMock(): StorageLike {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
    };
}

const singleCellWaypoints: Waypoint[] = [
    { lat: 10, lon: 20 },
    { lat: 10, lon: 20 },
];

const multiCellWaypoints: Waypoint[] = [
    { lat: 10, lon: 20 },
    { lat: 11, lon: 21 },
];

describe('windgrid elevation fetch caching and settings', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
        (globalThis as { localStorage?: StorageLike }).localStorage = makeLocalStorageMock();
        vi.mocked(getElevation).mockResolvedValue({ data: 123 } as never);
    });

    it('reuses in-memory grid cache for identical fetches', async () => {
        const { fetchElevationGrid } = await import('./windgrid');
        const progress = vi.fn();

        await fetchElevationGrid(singleCellWaypoints, 0, 1, progress);
        expect(vi.mocked(getElevation)).toHaveBeenCalledTimes(1);

        await fetchElevationGrid(singleCellWaypoints, 0, 1, progress);
        expect(vi.mocked(getElevation)).toHaveBeenCalledTimes(1);
        expect(progress).toHaveBeenLastCalledWith(1, 1);
    });

    it('hydrates point cache from localStorage after reset', async () => {
        const firstModule = await import('./windgrid');
        await firstModule.fetchElevationGrid(singleCellWaypoints, 0, 1);
        expect(vi.mocked(getElevation)).toHaveBeenCalledTimes(1);

        vi.resetModules();
        vi.mocked(getElevation).mockResolvedValue({ data: 999 } as never);
        const secondModule = await import('./windgrid');

        const grid = await secondModule.fetchElevationGrid(singleCellWaypoints, 0, 1);

        expect(vi.mocked(getElevation)).toHaveBeenCalledTimes(1);
        expect(grid.data[0][0]).toBe(123);
    });

    it('changes elevation fetch progress cadence with batch size', async () => {
        const { fetchElevationGrid, setElevationFetchBatchSize } = await import('./windgrid');
        const progressBatch3 = vi.fn();

        setElevationFetchBatchSize(3);
        await fetchElevationGrid(multiCellWaypoints, 0, 1, progressBatch3);
        expect(progressBatch3).toHaveBeenCalledTimes(2);
        expect(progressBatch3).toHaveBeenLastCalledWith(4, 4);

        vi.resetModules();
        const freshModule = await import('./windgrid');
        const progressBatch1 = vi.fn();

        freshModule.setElevationFetchBatchSize(0);
        await freshModule.fetchElevationGrid(multiCellWaypoints, 0, 1, progressBatch1);
        expect(progressBatch1).toHaveBeenCalledTimes(4);
        expect(progressBatch1).toHaveBeenLastCalledWith(4, 4);
    });
});
