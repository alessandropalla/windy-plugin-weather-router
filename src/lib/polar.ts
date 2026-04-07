import type { PolarDiagram, BoatSpeed } from '../types/polar';
import { DEFAULT_TWA_VALUES, DEFAULT_TWS_VALUES } from '../types/polar';

const STORAGE_KEY = 'windy-router-polars';

/**
 * Bilinear interpolation of boat speed from polar diagram.
 * @param polar The polar diagram
 * @param twa True Wind Angle in degrees (0-180)
 * @param tws True Wind Speed in knots
 * @returns Boat speed in knots (0 if outside polar range)
 */
export function interpolateBoatSpeed(polar: PolarDiagram, twa: number, tws: number): BoatSpeed {
    const { twaValues, twsValues, speeds } = polar;

    // Clamp TWA to [0, 180]
    twa = Math.max(0, Math.min(180, twa));

    // If TWS is below minimum polar TWS or TWA=0 (dead into wind), return 0
    if (tws <= 0 || twa < twaValues[0]) return 0;

    // Clamp TWS to polar range (extrapolate flat beyond max)
    tws = Math.min(tws, twsValues[twsValues.length - 1]);

    // Find TWA bracket
    let twaLo = 0;
    let twaHi = twaValues.length - 1;
    for (let i = 0; i < twaValues.length - 1; i++) {
        if (twa >= twaValues[i] && twa <= twaValues[i + 1]) {
            twaLo = i;
            twaHi = i + 1;
            break;
        }
    }

    // Find TWS bracket
    let twsLo = 0;
    let twsHi = twsValues.length - 1;
    for (let i = 0; i < twsValues.length - 1; i++) {
        if (tws >= twsValues[i] && tws <= twsValues[i + 1]) {
            twsLo = i;
            twsHi = i + 1;
            break;
        }
    }

    // Handle edge: below min TWS
    if (tws < twsValues[0]) {
        // Linear interpolation from 0 at TWS=0 to value at min TWS
        const ratio = tws / twsValues[0];
        const twaFrac =
            twaLo === twaHi
                ? 0
                : (twa - twaValues[twaLo]) / (twaValues[twaHi] - twaValues[twaLo]);
        const speedAtMinTws =
            speeds[twaLo][0] * (1 - twaFrac) + speeds[twaHi][0] * twaFrac;
        return speedAtMinTws * ratio;
    }

    // Bilinear interpolation
    const twaFrac =
        twaLo === twaHi
            ? 0
            : (twa - twaValues[twaLo]) / (twaValues[twaHi] - twaValues[twaLo]);
    const twsFrac =
        twsLo === twsHi
            ? 0
            : (tws - twsValues[twsLo]) / (twsValues[twsHi] - twsValues[twsLo]);

    const s00 = speeds[twaLo]?.[twsLo] ?? 0;
    const s01 = speeds[twaLo]?.[twsHi] ?? 0;
    const s10 = speeds[twaHi]?.[twsLo] ?? 0;
    const s11 = speeds[twaHi]?.[twsHi] ?? 0;

    const s0 = s00 * (1 - twsFrac) + s01 * twsFrac;
    const s1 = s10 * (1 - twsFrac) + s11 * twsFrac;

    return s0 * (1 - twaFrac) + s1 * twaFrac;
}

/**
 * Parse a standard polar CSV/POL file.
 * Supports:
 *  - Tab, comma, or semicolon delimiters
 *  - Space/whitespace delimiter (common in .pol files from Expedition, B&G, ORC)
 *  - Comment lines prefixed with ! or # (Expedition .pol format)
 *
 * First row: header with TWS values (first cell is ignored label)
 * Subsequent rows: TWA followed by boat speeds
 */
export function parsePolarCSV(text: string, name = 'Imported Polar'): PolarDiagram {
    // Strip comment lines and blank lines
    const lines = text.trim().split(/\r?\n/).filter(l => {
        const t = l.trim();
        return t.length > 0 && !t.startsWith('!') && !t.startsWith('#');
    });
    if (lines.length < 2) throw new Error('Polar file must have at least a header row and one data row');

    // Auto-detect delimiter; fall back to whitespace for .pol files
    const splitLine = (line: string): string[] => {
        const t = line.trim();
        if (t.includes('\t')) return t.split('\t').map(s => s.trim()).filter(s => s.length > 0);
        if (t.includes(';')) return t.split(';').map(s => s.trim()).filter(s => s.length > 0);
        if (t.includes(',')) return t.split(',').map(s => s.trim()).filter(s => s.length > 0);
        // Space-separated (standard .pol format)
        return t.split(/\s+/).filter(s => s.length > 0);
    };

    const headerCells = splitLine(lines[0]);
    // First cell is a label (e.g. "twa/tws"), rest are TWS values
    const twsValues = headerCells.slice(1).map(Number).filter(n => !isNaN(n) && n > 0);
    if (twsValues.length === 0) throw new Error('No valid TWS values found in header');

    const twaValues: number[] = [];
    const speeds: number[][] = [];

    for (let i = 1; i < lines.length; i++) {
        const cells = splitLine(lines[i]);
        const twa = Number(cells[0]);
        if (isNaN(twa) || twa < 0 || twa > 180) continue;

        twaValues.push(twa);
        const row = cells.slice(1, twsValues.length + 1).map(s => {
            const v = Number(s);
            return isNaN(v) ? 0 : Math.max(0, v);
        });
        while (row.length < twsValues.length) row.push(0);
        speeds.push(row);
    }

    if (twaValues.length === 0) throw new Error('No valid TWA rows found');
    return { name, twaValues, twsValues, speeds };
}

/** Create an empty polar diagram with default breakpoints */
export function createEmptyPolar(name = 'New Polar'): PolarDiagram {
    const speeds = DEFAULT_TWA_VALUES.map(() => DEFAULT_TWS_VALUES.map(() => 0));
    return {
        name,
        twaValues: [...DEFAULT_TWA_VALUES],
        twsValues: [...DEFAULT_TWS_VALUES],
        speeds,
    };
}

/** Serialize polar to CSV text */
export function polarToCSV(polar: PolarDiagram): string {
    const header = ['TWA/TWS', ...polar.twsValues.map(String)].join('\t');
    const rows = polar.twaValues.map((twa, i) =>
        [String(twa), ...polar.speeds[i].map(s => s.toFixed(1))].join('\t'),
    );
    return [header, ...rows].join('\n');
}

/** Save polar diagram to localStorage */
export function savePolar(polar: PolarDiagram): void {
    const stored = loadAllPolars();
    stored[polar.name] = polar;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

/** Load all saved polar diagrams from localStorage */
export function loadAllPolars(): Record<string, PolarDiagram> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

/** Load a specific polar by name */
export function loadPolar(name: string): PolarDiagram | null {
    return loadAllPolars()[name] ?? null;
}

/** Delete a polar by name */
export function deletePolar(name: string): void {
    const stored = loadAllPolars();
    delete stored[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

/** Get a built-in example polar (generic cruising sailboat ~35ft) */
export function getExamplePolar(): PolarDiagram {
    return {
        name: 'Example 35ft Cruiser',
        twaValues: [0, 30, 40, 52, 60, 75, 90, 110, 120, 135, 150, 165, 180],
        twsValues: [4, 6, 8, 10, 12, 14, 16, 20, 25, 30],
        speeds: [
            // TWA=0: dead into wind
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            // TWA=30: close hauled, pinching
            [1.5, 2.5, 3.5, 4.2, 4.5, 4.6, 4.5, 4.0, 3.5, 3.0],
            // TWA=40
            [2.2, 3.5, 4.5, 5.2, 5.6, 5.8, 5.7, 5.2, 4.8, 4.2],
            // TWA=52: optimal upwind VMG
            [2.8, 4.0, 5.0, 5.8, 6.2, 6.4, 6.3, 5.8, 5.3, 4.5],
            // TWA=60
            [3.0, 4.2, 5.3, 6.0, 6.5, 6.7, 6.6, 6.0, 5.5, 4.8],
            // TWA=75
            [3.2, 4.5, 5.5, 6.3, 6.8, 7.0, 7.0, 6.5, 6.0, 5.2],
            // TWA=90: beam reach
            [3.3, 4.6, 5.7, 6.5, 7.0, 7.2, 7.2, 6.8, 6.3, 5.5],
            // TWA=110: broad reach
            [3.2, 4.5, 5.6, 6.4, 6.9, 7.1, 7.1, 6.7, 6.2, 5.3],
            // TWA=120
            [3.0, 4.3, 5.4, 6.2, 6.7, 6.9, 6.9, 6.5, 6.0, 5.0],
            // TWA=135
            [2.8, 4.0, 5.1, 5.9, 6.4, 6.6, 6.6, 6.2, 5.7, 4.8],
            // TWA=150: deep broad reach
            [2.5, 3.7, 4.7, 5.5, 6.0, 6.2, 6.2, 5.8, 5.3, 4.5],
            // TWA=165
            [2.2, 3.3, 4.3, 5.0, 5.5, 5.7, 5.7, 5.3, 4.8, 4.0],
            // TWA=180: dead downwind
            [2.0, 3.0, 4.0, 4.7, 5.2, 5.4, 5.4, 5.0, 4.5, 3.8],
        ],
    };
}

/**
 * Find the True Wind Angle that maximises upwind VMG (speed × cos TWA) for the given TWS.
 * Used to compute tacking laylines to a mark.
 */
export function findBestUpwindTWA(polar: PolarDiagram, tws: number): number {
    let bestVMG = 0;
    let bestTWA = 45; // Sensible default if polar has no data
    for (const twa of polar.twaValues) {
        if (twa <= 0 || twa >= 90) continue; // upwind only
        const speed = interpolateBoatSpeed(polar, twa, tws);
        const vmg = speed * Math.cos(twa * Math.PI / 180);
        if (vmg > bestVMG) {
            bestVMG = vmg;
            bestTWA = twa;
        }
    }
    return bestTWA;
}

/**
 * Wizard preset boat classes
 */
export type BoatClass = 'dinghy' | 'dayboat' | 'cruiser' | 'race-cruiser' | 'ior-maxi' | 'tp52' | 'foiler' | 'multihull';

/**
 * Generate a default polar based on boat class
 */
export function generateBoatClassPolar(boatClass: BoatClass): PolarDiagram {
    const twaValues = [0, 30, 40, 52, 60, 75, 90, 110, 120, 135, 150, 165, 180];
    const twsValues = [4, 6, 8, 10, 12, 14, 16, 20, 25, 30];

    let speeds: BoatSpeed[][] = [];

    switch (boatClass) {
        case 'dinghy':
            // Fast, light, responsive - high speeds but sensitive to wind
            speeds = [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [2.0, 3.2, 4.2, 5.0, 5.5, 5.8, 5.8, 5.5, 5.0, 4.5],
                [3.0, 4.5, 5.5, 6.4, 7.0, 7.3, 7.3, 6.8, 6.2, 5.5],
                [3.8, 5.3, 6.5, 7.4, 8.0, 8.3, 8.3, 7.7, 7.0, 6.2],
                [4.2, 5.8, 7.0, 8.0, 8.6, 9.0, 9.0, 8.3, 7.6, 6.8],
                [4.5, 6.2, 7.5, 8.6, 9.2, 9.6, 9.6, 9.0, 8.2, 7.2],
                [4.6, 6.3, 7.6, 8.7, 9.4, 9.8, 9.8, 9.2, 8.4, 7.4],
                [4.4, 6.2, 7.5, 8.6, 9.2, 9.6, 9.6, 9.0, 8.2, 7.2],
                [4.2, 6.0, 7.2, 8.3, 8.9, 9.3, 9.3, 8.7, 7.9, 7.0],
                [3.8, 5.4, 6.6, 7.6, 8.2, 8.6, 8.6, 8.0, 7.2, 6.2],
                [3.2, 4.6, 5.6, 6.5, 7.0, 7.3, 7.3, 6.8, 6.2, 5.4],
                [2.6, 3.8, 4.6, 5.3, 5.8, 6.0, 6.0, 5.6, 5.0, 4.3],
                [2.2, 3.2, 4.0, 4.6, 5.0, 5.2, 5.2, 4.8, 4.3, 3.7],
            ];
            return { name: 'Small Dinghy', twaValues, twsValues, speeds };

        case 'dayboat':
            // Medium, good all-rounder
            speeds = [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [1.8, 2.8, 3.6, 4.4, 4.8, 5.0, 5.0, 4.7, 4.2, 3.7],
                [2.6, 4.0, 5.0, 6.0, 6.5, 6.8, 6.8, 6.4, 5.8, 5.1],
                [3.2, 4.7, 5.9, 6.8, 7.4, 7.7, 7.7, 7.2, 6.6, 5.8],
                [3.5, 5.1, 6.4, 7.4, 8.0, 8.3, 8.3, 7.8, 7.1, 6.3],
                [3.7, 5.4, 6.7, 7.8, 8.5, 8.8, 8.8, 8.3, 7.6, 6.7],
                [3.8, 5.5, 6.8, 7.9, 8.6, 9.0, 9.0, 8.5, 7.8, 6.9],
                [3.7, 5.4, 6.7, 7.8, 8.5, 8.8, 8.8, 8.3, 7.6, 6.7],
                [3.5, 5.1, 6.4, 7.4, 8.0, 8.3, 8.3, 7.8, 7.1, 6.3],
                [3.2, 4.7, 5.9, 6.8, 7.4, 7.7, 7.7, 7.2, 6.6, 5.8],
                [2.8, 4.2, 5.3, 6.2, 6.8, 7.0, 7.0, 6.6, 6.0, 5.3],
                [2.3, 3.5, 4.4, 5.1, 5.6, 5.8, 5.8, 5.4, 4.9, 4.3],
                [2.0, 3.0, 3.8, 4.4, 4.8, 5.0, 5.0, 4.7, 4.2, 3.7],
            ];
            return { name: 'Day Boat', twaValues, twsValues, speeds };

        case 'cruiser':
            // Comfortable, steady, good downwind
            speeds = [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [1.5, 2.4, 3.2, 3.9, 4.2, 4.4, 4.4, 4.1, 3.7, 3.2],
                [2.2, 3.5, 4.5, 5.3, 5.8, 6.0, 6.0, 5.6, 5.1, 4.5],
                [2.8, 4.1, 5.2, 6.0, 6.6, 6.9, 6.9, 6.4, 5.8, 5.1],
                [3.1, 4.5, 5.7, 6.6, 7.2, 7.5, 7.5, 7.0, 6.4, 5.6],
                [3.3, 4.8, 6.0, 7.0, 7.6, 7.9, 7.9, 7.4, 6.8, 5.9],
                [3.4, 4.9, 6.1, 7.1, 7.8, 8.1, 8.1, 7.6, 7.0, 6.1],
                [3.3, 4.8, 6.0, 7.0, 7.6, 7.9, 7.9, 7.4, 6.8, 5.9],
                [3.1, 4.5, 5.7, 6.6, 7.2, 7.5, 7.5, 7.0, 6.4, 5.6],
                [2.8, 4.1, 5.2, 6.0, 6.6, 6.9, 6.9, 6.4, 5.8, 5.1],
                [2.4, 3.6, 4.6, 5.3, 5.8, 6.1, 6.1, 5.7, 5.2, 4.5],
                [2.0, 3.0, 3.9, 4.5, 5.0, 5.2, 5.2, 4.9, 4.4, 3.8],
                [1.7, 2.6, 3.3, 3.9, 4.3, 4.5, 4.5, 4.2, 3.8, 3.3],
            ];
            return { name: 'Cruiser', twaValues, twsValues, speeds };

        case 'race-cruiser':
            // Fast racer with cruising ability
            speeds = [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [1.8, 2.7, 3.6, 4.5, 4.9, 5.2, 5.2, 4.9, 4.4, 3.8],
                [2.6, 4.0, 5.2, 6.2, 6.8, 7.1, 7.1, 6.7, 6.1, 5.3],
                [3.2, 4.7, 6.0, 7.1, 7.8, 8.1, 8.1, 7.6, 7.0, 6.1],
                [3.6, 5.2, 6.6, 7.8, 8.5, 8.9, 8.9, 8.3, 7.6, 6.7],
                [3.8, 5.5, 7.0, 8.2, 9.0, 9.4, 9.4, 8.8, 8.1, 7.1],
                [3.9, 5.7, 7.2, 8.5, 9.3, 9.7, 9.7, 9.1, 8.3, 7.3],
                [3.8, 5.5, 7.0, 8.2, 9.0, 9.4, 9.4, 8.8, 8.1, 7.1],
                [3.6, 5.2, 6.6, 7.8, 8.5, 8.9, 8.9, 8.3, 7.6, 6.7],
                [3.2, 4.7, 6.0, 7.1, 7.8, 8.1, 8.1, 7.6, 7.0, 6.1],
                [2.7, 4.1, 5.3, 6.3, 6.9, 7.2, 7.2, 6.8, 6.2, 5.4],
                [2.2, 3.3, 4.3, 5.1, 5.6, 5.9, 5.9, 5.5, 5.0, 4.3],
                [1.9, 2.9, 3.7, 4.4, 4.8, 5.1, 5.1, 4.8, 4.3, 3.7],
            ];
            return { name: 'Race Cruiser', twaValues, twsValues, speeds };

        case 'ior-maxi':
            // Large offshore racer
            speeds = [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [2.0, 3.0, 4.0, 4.9, 5.4, 5.8, 5.8, 5.4, 4.9, 4.3],
                [2.9, 4.3, 5.5, 6.6, 7.2, 7.6, 7.6, 7.1, 6.5, 5.7],
                [3.5, 5.2, 6.6, 7.9, 8.6, 9.1, 9.1, 8.5, 7.8, 6.8],
                [3.9, 5.7, 7.3, 8.7, 9.5, 10.0, 10.0, 9.4, 8.6, 7.6],
                [4.2, 6.1, 7.8, 9.3, 10.2, 10.8, 10.8, 10.1, 9.3, 8.2],
                [4.3, 6.3, 8.1, 9.7, 10.6, 11.2, 11.2, 10.5, 9.6, 8.5],
                [4.2, 6.1, 7.8, 9.3, 10.2, 10.8, 10.8, 10.1, 9.3, 8.2],
                [3.9, 5.7, 7.3, 8.7, 9.5, 10.0, 10.0, 9.4, 8.6, 7.6],
                [3.5, 5.2, 6.6, 7.9, 8.6, 9.1, 9.1, 8.5, 7.8, 6.8],
                [3.0, 4.4, 5.6, 6.7, 7.3, 7.7, 7.7, 7.2, 6.6, 5.8],
                [2.4, 3.5, 4.5, 5.4, 5.9, 6.2, 6.2, 5.8, 5.3, 4.6],
                [2.1, 3.1, 4.0, 4.8, 5.2, 5.5, 5.5, 5.1, 4.6, 4.0],
            ];
            return { name: 'IOR Maxi', twaValues, twsValues, speeds };

        case 'tp52':
            // TP52 modern racer - fast and high-tech
            speeds = [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [2.2, 3.3, 4.4, 5.3, 5.8, 6.2, 6.2, 5.8, 5.3, 4.6],
                [3.1, 4.6, 5.9, 7.0, 7.7, 8.1, 8.1, 7.6, 6.9, 6.0],
                [3.8, 5.6, 7.1, 8.4, 9.2, 9.7, 9.7, 9.1, 8.3, 7.2],
                [4.3, 6.3, 8.0, 9.5, 10.4, 11.0, 11.0, 10.3, 9.4, 8.2],
                [4.6, 6.8, 8.7, 10.3, 11.3, 12.0, 12.0, 11.2, 10.2, 8.9],
                [4.8, 7.1, 9.1, 10.8, 11.8, 12.6, 12.6, 11.8, 10.8, 9.4],
                [4.6, 6.8, 8.7, 10.3, 11.3, 12.0, 12.0, 11.2, 10.2, 8.9],
                [4.3, 6.3, 8.0, 9.5, 10.4, 11.0, 11.0, 10.3, 9.4, 8.2],
                [3.8, 5.6, 7.1, 8.4, 9.2, 9.7, 9.7, 9.1, 8.3, 7.2],
                [3.2, 4.7, 6.0, 7.1, 7.8, 8.2, 8.2, 7.7, 7.0, 6.1],
                [2.6, 3.8, 4.9, 5.8, 6.4, 6.8, 6.8, 6.4, 5.8, 5.0],
                [2.2, 3.2, 4.1, 4.9, 5.4, 5.7, 5.7, 5.3, 4.8, 4.2],
            ];
            return { name: 'TP52', twaValues, twsValues, speeds };

        case 'foiler':
            // Foiling yacht - extreme speeds, especially downwind
            speeds = [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [2.5, 3.8, 5.0, 6.2, 7.0, 7.5, 7.5, 7.0, 6.4, 5.5],
                [3.5, 5.2, 6.6, 8.0, 8.8, 9.4, 9.4, 8.8, 8.0, 7.0],
                [4.3, 6.4, 8.2, 9.8, 10.8, 11.5, 11.5, 10.8, 9.8, 8.6],
                [4.9, 7.3, 9.3, 11.1, 12.2, 13.0, 13.0, 12.2, 11.1, 9.7],
                [5.3, 7.9, 10.1, 12.0, 13.2, 14.1, 14.1, 13.2, 12.0, 10.5],
                [5.5, 8.2, 10.5, 12.5, 13.8, 14.7, 14.7, 13.8, 12.5, 10.9],
                [5.3, 7.9, 10.1, 12.0, 13.2, 14.1, 14.1, 13.2, 12.0, 10.5],
                [4.9, 7.3, 9.3, 11.1, 12.2, 13.0, 13.0, 12.2, 11.1, 9.7],
                [4.3, 6.4, 8.2, 9.8, 10.8, 11.5, 11.5, 10.8, 9.8, 8.6],
                [3.6, 5.3, 6.8, 8.1, 8.9, 9.5, 9.5, 8.9, 8.1, 7.0],
                [2.9, 4.3, 5.5, 6.6, 7.2, 7.7, 7.7, 7.2, 6.6, 5.7],
                [2.4, 3.6, 4.6, 5.5, 6.0, 6.4, 6.4, 6.0, 5.5, 4.7],
            ];
            return { name: 'Foiler', twaValues, twsValues, speeds };

        case 'multihull':
            // Catamaran/Trimaran - wide beam, fast, especially downwind
            speeds = [
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                [1.8, 2.8, 3.8, 4.8, 5.4, 5.8, 5.8, 5.4, 4.8, 4.2],
                [2.8, 4.2, 5.4, 6.6, 7.4, 8.0, 8.0, 7.4, 6.6, 5.7],
                [3.6, 5.4, 6.9, 8.4, 9.3, 10.0, 10.0, 9.3, 8.4, 7.3],
                [4.2, 6.3, 8.1, 9.9, 11.0, 11.8, 11.8, 11.0, 9.9, 8.6],
                [4.6, 6.9, 8.8, 10.8, 12.0, 12.9, 12.9, 12.0, 10.8, 9.4],
                [4.8, 7.2, 9.2, 11.3, 12.6, 13.5, 13.5, 12.6, 11.3, 9.8],
                [4.6, 6.9, 8.8, 10.8, 12.0, 12.9, 12.9, 12.0, 10.8, 9.4],
                [4.2, 6.3, 8.1, 9.9, 11.0, 11.8, 11.8, 11.0, 9.9, 8.6],
                [3.6, 5.4, 6.9, 8.4, 9.3, 10.0, 10.0, 9.3, 8.4, 7.3],
                [3.0, 4.5, 5.8, 7.0, 7.8, 8.4, 8.4, 7.8, 7.0, 6.0],
                [2.4, 3.6, 4.6, 5.6, 6.2, 6.7, 6.7, 6.2, 5.6, 4.8],
                [2.0, 3.0, 3.9, 4.7, 5.2, 5.6, 5.6, 5.2, 4.7, 4.0],
            ];
            return { name: 'Multihull', twaValues, twsValues, speeds };

        default:
            return getExamplePolar();
    }
}

/**
 * Scale a polar diagram based on boat length.
 * Longer boats generally have better performance.
 * Uses a curve based on typical sailboat scaling laws.
 * Reference length (base) is assumed to be 10 meters.
 * @param polar The base polar diagram
 * @param lengthMeters Boat length in meters
 * @returns A new polar with scaled speeds
 */
export function scalePolarByLength(polar: PolarDiagram, lengthMeters: number): PolarDiagram {
    const baseLength = 10; // Reference length in meters
    const lengthRatio = lengthMeters / baseLength;
    
    // Speed scaling based on boat length
    // For sailboats, speed scales roughly as √(length), but we use a slightly gentler curve
    // to account for increased weight/drag with size
    const speedMultiplier = Math.pow(lengthRatio, 0.45);
    
    const scaledSpeeds = polar.speeds.map(row =>
        row.map(speed => speed * speedMultiplier)
    );

    return {
        ...polar,
        speeds: scaledSpeeds,
    };
}
