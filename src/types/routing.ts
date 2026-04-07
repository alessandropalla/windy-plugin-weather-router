import type { BoatConfig } from './polar';

export interface Waypoint {
    lat: number;
    lon: number;
    name?: string;
}

/** How to optimize the route */
export type OptimizationMode =
    | 'min-time'
    | 'min-motoring'
    | 'min-max-wind'
    | 'min-wave-exposure'
    | 'comfort-balanced'
    | 'arrival-deadline';

export interface RouteConfig {
    /** Departure timestamp (ms since epoch) */
    departureTime: number;
    /** Time step for isochrone expansion in hours */
    timeStepHours: number;
    /** Angular resolution for heading fan in degrees */
    angularResolution: number;
    /** Maximum route duration in hours */
    maxDurationHours: number;
    /** Optimization mode */
    mode: OptimizationMode;
    /** Target arrival time (ms) — used when mode='arrival-deadline' */
    arrivalDeadline?: number;
    /** Whether to optimize departure time across a window */
    optimizeDeparture: boolean;
    /** Window in hours over which to test departure times */
    departureWindowHours: number;
    /** Step between departure test times in hours */
    departureStepHours: number;
    /** Forecast model to use */
    product: string;
    /** UI time mode for inputs and chart labels */
    useLocalTime?: boolean;
    /** Boat configuration (polars + motor) */
    boat: BoatConfig;
    /** Maximum true wind speed in knots; route points above this are excluded. 0 = disabled. */
    maxWindLimitKt?: number;
    /** Maximum wave height in meters; isochrone points in higher seas are excluded. 0 = disabled. */
    maxWaveHeightM?: number;
    /** Whether to compute alternative routes using other optimization objectives. */
    routeAlternatives?: boolean;
}

/** A single point on an isochrone front */
export interface IsochronePoint {
    lat: number;
    lon: number;
    /** Timestamp at this point (ms) */
    time: number;
    /** Index of parent point in previous isochrone (-1 for start) */
    parentIndex: number;
    /** Heading sailed to reach this point (degrees true) */
    heading: number;
    /** Boat speed at this point (knots) */
    boatSpeed: number;
    /** True wind speed at this point (knots) */
    tws: number;
    /** True wind direction at this point (degrees) */
    twd: number;
    /** True wind angle at this point (degrees, 0-180) */
    twa: number;
    /** Significant wave height at this point (meters) */
    waveHeight: number;
    /** Wave direction at this point (degrees) */
    waveDir: number;
    /** Wave period at this point (seconds) */
    wavePeriod: number;
    /** Whether boat is motoring at this point */
    isMotoring: boolean;
    /** Cumulative distance from start (nm) */
    distanceFromStart: number;
    /** Cumulative motor hours */
    motorHoursUsed: number;
    /** Index of current target waypoint */
    waypointIndex: number;
}

/** One isochrone front (a ring of points at the same time) */
export type IsochroneFront = IsochronePoint[];

/** Wind data at a particular point and time */
export interface WindAtPoint {
    /** True wind speed in knots */
    tws: number;
    /** True wind direction in degrees (where wind comes FROM, meteorological convention) */
    twd: number;
    /** Gust speed in knots */
    gust: number;
    /** Significant wave height in meters */
    waveHeight: number;
    /** Wave direction in degrees */
    waveDir: number;
    /** Wave period in seconds */
    wavePeriod: number;
}

/** Metrics for a computed route */
export interface RouteMetrics {
    totalDistanceNm: number;
    totalTimeHours: number;
    arrivalTime: number;
    avgSpeedKt: number;
    maxWindKt: number;
    maxGustKt: number;
    maxWaveM: number;
    motoringTimeHours: number;
    motoringDistanceNm: number;
    fuelConsumedLiters: number;
    /** Per-leg breakdown */
    legs: LegMetrics[];
}

/** Metrics for a single leg between waypoints */
export interface LegMetrics {
    fromWaypoint: number;
    toWaypoint: number;
    distanceNm: number;
    timeHours: number;
    avgSpeedKt: number;
    avgWindKt: number;
    maxWindKt: number;
    motoringPercent: number;
}

/** Full result of a routing computation */
export interface RouteResult {
    /** The optimal path from start to finish */
    optimalPath: IsochronePoint[];
    /** All isochrone fronts (for visualization) */
    isochrones: IsochroneFront[];
    /** Computed route metrics */
    metrics: RouteMetrics;
    /** Departure time used */
    departureTime: number;
    /** Whether this was an optimized departure */
    optimizedDeparture: boolean;
    /** Optimization objective used for selecting this route. */
    optimizationMode: OptimizationMode;
    /** Human-readable objective label for UI. */
    optimizationLabel: string;
    /** Numeric score used for route ranking (lower is better). */
    optimizationScore: number;
    /** Label to distinguish primary route from alternatives in UI. */
    variantLabel?: string;
    /** Departure optimization analysis rows, ordered by tested departure time. */
    departureAnalysis?: DepartureAnalysisRow[];
}

/** Summary row for a departure-time candidate tested during optimization. */
export interface DepartureAnalysisRow {
    departureTime: number;
    arrivalTime: number;
    totalDistanceNm: number;
    totalTimeHours: number;
    avgSpeedKt: number;
    motoringTimeHours: number;
    fuelConsumedLiters: number;
    maxWindKt: number;
    maxWaveM: number;
    optimizationScore: number;
    selected: boolean;
}

/** Progress callback for long computations */
export interface RoutingProgress {
    /** Current isochrone step */
    step: number;
    /** Total expected steps */
    totalSteps: number;
    /** Points in current front */
    frontSize: number;
    /** Message for display */
    message: string;
}

/** A user-defined polygonal no-go zone */
export interface NoGoZone {
    /** Unique identifier */
    id: string;
    /** Display name */
    name: string;
    /** Polygon vertices (lat/lon). First and last vertex are implicitly connected. */
    vertices: { lat: number; lon: number }[];
}
