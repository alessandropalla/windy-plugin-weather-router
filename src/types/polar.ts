/** True Wind Angle in degrees (0-180, symmetric) */
export type TWA = number;

/** True Wind Speed in knots */
export type TWS = number;

/** Boat speed in knots */
export type BoatSpeed = number;

/**
 * Polar diagram: 2D lookup table.
 * Rows indexed by TWA (0-180°), columns by TWS.
 * Values are boat speeds in knots.
 */
export interface PolarDiagram {
    /** Display name for this polar set (e.g. "J/105") */
    name: string;
    /** TWA breakpoints in degrees (sorted ascending, 0-180) */
    twaValues: TWA[];
    /** TWS breakpoints in knots (sorted ascending) */
    twsValues: TWS[];
    /**
     * Speed matrix: speeds[twaIndex][twsIndex] = boat speed in knots.
     * Dimensions: twaValues.length × twsValues.length
     */
    speeds: BoatSpeed[][];
}

/** Motor sailing configuration */
export interface MotorConfig {
    /** Whether motoring is allowed */
    enabled: boolean;
    /** Motor speed in knots */
    motorSpeed: number;
    /** Below this wind speed (kt), switch to motor */
    windThreshold: number;
    /** Maximum hours of motoring allowed (0 = unlimited) */
    maxMotorHours: number;
}

/** Combined boat configuration */
export interface BoatConfig {
    polar: PolarDiagram;
    motor: MotorConfig;
}

/** Default TWA breakpoints for an empty polar (degrees) */
export const DEFAULT_TWA_VALUES: TWA[] = [0, 30, 40, 52, 60, 75, 90, 110, 120, 135, 150, 165, 180];

/** Default TWS breakpoints for an empty polar (knots) */
export const DEFAULT_TWS_VALUES: TWS[] = [4, 6, 8, 10, 12, 14, 16, 20, 25, 30];

export const DEFAULT_MOTOR_CONFIG: MotorConfig = {
    enabled: false,
    motorSpeed: 5.0,
    windThreshold: 4.0,
    maxMotorHours: 0,
};
