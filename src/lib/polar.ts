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
