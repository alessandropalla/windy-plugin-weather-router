import { getWindAtPointAndTime } from './windgrid';
import { interpolateBoatSpeed } from './polar';
import {
    distanceNm,
    bearing,
    destinationPoint,
    computeTWA,
    normalizeAngle,
} from './geo';
import type { MotorConfig } from '../types/polar';
import type {
    Waypoint,
    RouteConfig,
    IsochronePoint,
    IsochroneFront,
    RouteResult,
    RouteMetrics,
    LegMetrics,
    RoutingProgress,
} from '../types/routing';
import type { WindGrid } from './windgrid';

const ARRIVAL_RADIUS_NM = 2; // Consider arrived when within this radius of destination

/**
 * Main entry point: compute optimal weather route using isochrone method.
 *
 * @param waypoints    Ordered waypoints defining the route
 * @param config       Routing configuration (departure time, time step, polar, motor, etc.)
 * @param windGrid     Pre-fetched wind data grid
 * @param onProgress   Progress callback
 * @returns RouteResult with optimal path, isochrones, and metrics
 */
export function computeRoute(
    waypoints: Waypoint[],
    config: RouteConfig,
    windGrid: WindGrid,
    onProgress?: (progress: RoutingProgress) => void,
): RouteResult {
    if (waypoints.length < 2) {
        throw new Error('Need at least 2 waypoints');
    }

    const { boat, departureTime, timeStepHours, angularResolution, maxDurationHours } = config;
    const timeStepMs = timeStepHours * 3600 * 1000;
    const maxSteps = Math.ceil(maxDurationHours / timeStepHours);

    // Start point
    const start = waypoints[0];
    const allIsochrones: IsochroneFront[] = [];

    // Initialize first isochrone with just the start point
    let currentFront: IsochroneFront = [
        {
            lat: start.lat,
            lon: start.lon,
            time: departureTime,
            parentIndex: -1,
            heading: 0,
            boatSpeed: 0,
            tws: 0,
            twd: 0,
            twa: 0,
            waveHeight: 0,
            waveDir: 0,
            wavePeriod: 0,
            isMotoring: false,
            distanceFromStart: 0,
            motorHoursUsed: 0,
            waypointIndex: 1, // targeting first destination waypoint
        },
    ];

    allIsochrones.push(currentFront);

    // Track all fronts for backtracking
    const allFronts: IsochroneFront[] = [currentFront];

    let arrivedPoint: IsochronePoint | null = null;

    for (let step = 0; step < maxSteps; step++) {
        const currentTime = departureTime + (step + 1) * timeStepMs;

        onProgress?.({
            step: step + 1,
            totalSteps: maxSteps,
            frontSize: currentFront.length,
            message: `Step ${step + 1}/${maxSteps} — ${currentFront.length} front points`,
        });

        const nextFront: IsochronePoint[] = [];

        for (let pi = 0; pi < currentFront.length; pi++) {
            const parent = currentFront[pi];
            const targetWp = waypoints[parent.waypointIndex];

            // Generate candidate headings: fan around the bearing to target
            const bearingToTarget = bearing(parent.lat, parent.lon, targetWp.lat, targetWp.lon);
            const headings = generateHeadings(bearingToTarget, angularResolution);

            for (const hdg of headings) {
                // Get wind at parent position and current time
                const wind = getWindAtPointAndTime(parent.lat, parent.lon, currentTime, windGrid);

                // Compute True Wind Angle
                const twa = computeTWA(hdg, wind.twd);

                // Look up boat speed from polars
                let boatSpeed = interpolateBoatSpeed(boat.polar, twa, wind.tws);
                let isMotoring = false;

                // Check if we should motor
                if (boat.motor.enabled) {
                    const canMotor =
                        boat.motor.maxMotorHours === 0 ||
                        parent.motorHoursUsed < boat.motor.maxMotorHours;

                    if (canMotor && wind.tws < boat.motor.windThreshold) {
                        boatSpeed = boat.motor.motorSpeed;
                        isMotoring = true;
                    } else if (canMotor && boatSpeed < boat.motor.motorSpeed * 0.5) {
                        // Motor when sailing is very slow (less than half motor speed)
                        boatSpeed = boat.motor.motorSpeed;
                        isMotoring = true;
                    }
                }

                // Skip if not moving
                if (boatSpeed < 0.1) {
                    continue;
                }

                // Compute new position
                const distTraveled = boatSpeed * timeStepHours;
                const [newLat, newLon] = destinationPoint(parent.lat, parent.lon, hdg, distTraveled);

                // Check bounds (simple sanity check)
                if (Math.abs(newLat) > 85) {
                    continue;
                }

                const newPoint: IsochronePoint = {
                    lat: newLat,
                    lon: newLon,
                    time: currentTime,
                    parentIndex: pi,
                    heading: hdg,
                    boatSpeed,
                    tws: wind.tws,
                    twd: wind.twd,
                    twa,
                    waveHeight: wind.waveHeight,
                    waveDir: wind.waveDir,
                    wavePeriod: wind.wavePeriod,
                    isMotoring,
                    distanceFromStart: parent.distanceFromStart + distTraveled,
                    motorHoursUsed: parent.motorHoursUsed + (isMotoring ? timeStepHours : 0),
                    waypointIndex: parent.waypointIndex,
                };

                // Check if this point has reached the current target waypoint
                const distToTarget = distanceNm(newLat, newLon, targetWp.lat, targetWp.lon);
                if (distToTarget <= ARRIVAL_RADIUS_NM) {
                    if (parent.waypointIndex >= waypoints.length - 1) {
                        // Reached final destination!
                        arrivedPoint = newPoint;
                        break;
                    } else {
                        // Advance to next waypoint
                        newPoint.waypointIndex = parent.waypointIndex + 1;
                    }
                }

                nextFront.push(newPoint);
            }

            if (arrivedPoint) {
                break;
            }
        }

        if (arrivedPoint) {
            allFronts.push([arrivedPoint]);
            break;
        }

        if (nextFront.length === 0) {
            break; // No progress possible
        }

        // Prune the front: keep only best points per angular sector relative to targets
        const prunedFront = pruneIsochrone(nextFront, waypoints);
        currentFront = prunedFront;
        allIsochrones.push(prunedFront);
        allFronts.push(prunedFront);
    }

    // Backtrack to find optimal path
    const optimalPath = backtrack(allFronts, arrivedPoint);

    // Ensure path starts/ends exactly on requested waypoints.
    if (optimalPath.length > 0) {
        const first = optimalPath[0];
        optimalPath[0] = {
            ...first,
            lat: waypoints[0].lat,
            lon: waypoints[0].lon,
            waypointIndex: Math.max(1, first.waypointIndex),
        };

        const last = optimalPath[optimalPath.length - 1];
        optimalPath[optimalPath.length - 1] = {
            ...last,
            lat: waypoints[waypoints.length - 1].lat,
            lon: waypoints[waypoints.length - 1].lon,
            waypointIndex: waypoints.length - 1,
        };
    }

    if (optimalPath.length < 2) {
        throw new Error('No feasible route found with the current settings and forecast window');
    }

    // Compute metrics
    const metrics = computeMetrics(optimalPath, waypoints, config.boat.motor);

    if (config.mode === 'arrival-deadline' && typeof config.arrivalDeadline === 'number') {
        if (metrics.arrivalTime > config.arrivalDeadline) {
            throw new Error('Arrival deadline cannot be met with current settings and weather window');
        }
    }

    return {
        optimalPath,
        isochrones: allIsochrones,
        metrics,
        departureTime,
        optimizedDeparture: config.optimizeDeparture,
    };
}

/**
 * Optimize departure time: try multiple departure times and return the best route.
 */
export function computeRouteWithDepartureOptimization(
    waypoints: Waypoint[],
    config: RouteConfig,
    windGrid: WindGrid,
    onProgress?: (progress: RoutingProgress) => void,
): RouteResult {
    if (!config.optimizeDeparture) {
        return computeRoute(waypoints, config, windGrid, onProgress);
    }

    const windowMs = config.departureWindowHours * 3600 * 1000;
    const stepMs = config.departureStepHours * 3600 * 1000;
    let bestResult: RouteResult | null = null;
    let bestTime = Infinity;
    let latestDepartureMeetingDeadline = -Infinity;

    const deadlineMode =
        config.mode === 'arrival-deadline' && typeof config.arrivalDeadline === 'number';

    const baseDeparture = config.departureTime;
    const numTries = Math.floor(windowMs / stepMs) + 1;

    for (let i = 0; i < numTries; i++) {
        const depTime = baseDeparture + i * stepMs;
        const trialConfig = { ...config, departureTime: depTime, optimizeDeparture: false };

        onProgress?.({
            step: i + 1,
            totalSteps: numTries,
            frontSize: 0,
            message: `Testing departure ${i + 1}/${numTries}: ${new Date(depTime).toISOString()}`,
        });

        try {
            const result = computeRoute(waypoints, trialConfig, windGrid);

            if (deadlineMode) {
                // In deadline mode, successful routes already satisfy the deadline.
                // Pick the latest departure that still arrives on time.
                if (result.departureTime > latestDepartureMeetingDeadline) {
                    latestDepartureMeetingDeadline = result.departureTime;
                    bestResult = { ...result, optimizedDeparture: true };
                }
            } else if (result.optimalPath.length > 0 && result.metrics.totalTimeHours < bestTime) {
                // In min-time mode, pick fastest route.
                bestTime = result.metrics.totalTimeHours;
                bestResult = { ...result, optimizedDeparture: true };
            }
        } catch {
            // Skip failed departures
        }
    }

    if (deadlineMode && !bestResult) {
        throw new Error('No departure in the optimization window can meet the selected arrival deadline');
    }

    if (!bestResult) {
        // Fall back to original departure
        return computeRoute(
            waypoints,
            { ...config, optimizeDeparture: false },
            windGrid,
            onProgress,
        );
    }

    return bestResult;
}

/** Generate heading candidates fanning around a target bearing */
function generateHeadings(targetBearing: number, angularResolution: number): number[] {
    const headings: number[] = [];
    // Fan ±90° around the target bearing (full 180° arc towards destination)
    const halfFan = 90;
    for (let offset = -halfFan; offset <= halfFan; offset += angularResolution) {
        headings.push(normalizeAngle(targetBearing + offset));
    }
    return headings;
}

/**
 * Prune isochrone front: keep only the furthest points per angular sector
 * relative to the next target waypoint.
 * This is the key optimization that keeps the algorithm tractable.
 */
function pruneIsochrone(
    front: IsochronePoint[],
    waypoints: Waypoint[],
): IsochroneFront {
    // Group points by their target waypoint index, then prune each group
    const groups = new Map<number, IsochronePoint[]>();
    for (const p of front) {
        const group = groups.get(p.waypointIndex) || [];
        group.push(p);
        groups.set(p.waypointIndex, group);
    }

    const pruned: IsochronePoint[] = [];

    for (const [wpIndex, points] of groups) {
        const target = waypoints[wpIndex];
        // Use angular sectors relative to the centroid of the front
        // (approximating with target waypoint as reference)
        const sectorCount = 72; // 5° sectors
        const sectors = new Array<IsochronePoint | null>(sectorCount).fill(null);

        for (const p of points) {
            const brng = bearing(target.lat, target.lon, p.lat, p.lon);
            const sectorIdx = Math.floor((brng / 360) * sectorCount) % sectorCount;
            const distToTarget = distanceNm(p.lat, p.lon, target.lat, target.lon);

            if (!sectors[sectorIdx]) {
                sectors[sectorIdx] = p;
            } else {
                // Keep the point that is CLOSER to the target (further along the route)
                const existingDist = distanceNm(
                    sectors[sectorIdx]!.lat,
                    sectors[sectorIdx]!.lon,
                    target.lat,
                    target.lon,
                );
                if (distToTarget < existingDist) {
                    sectors[sectorIdx] = p;
                }
            }
        }

        for (const s of sectors) {
            if (s) {
                pruned.push(s);
            }
        }
    }

    return pruned;
}

/** Backtrack from the arrival point through all fronts to reconstruct the optimal path */
function backtrack(
    allFronts: IsochroneFront[],
    arrivedPoint: IsochronePoint | null,
): IsochronePoint[] {
    if (!arrivedPoint || allFronts.length < 2) {
        return [];
    }

    const path: IsochronePoint[] = [arrivedPoint];
    let current = arrivedPoint;

    // Walk backwards through fronts
    for (let fi = allFronts.length - 2; fi >= 0; fi--) {
        if (current.parentIndex < 0) {
            break;
        }
        const parent = allFronts[fi][current.parentIndex];
        if (!parent) {
            break;
        }
        path.unshift(parent);
        current = parent;
    }

    return path;
}

/** Compute route metrics from the optimal path */
function computeMetrics(path: IsochronePoint[], waypoints: Waypoint[], motor: MotorConfig): RouteMetrics {
    if (path.length === 0) {
        return {
            totalDistanceNm: 0,
            totalTimeHours: 0,
            arrivalTime: 0,
            avgSpeedKt: 0,
            maxWindKt: 0,
            maxGustKt: 0,
            maxWaveM: 0,
            motoringTimeHours: 0,
            motoringDistanceNm: 0,
            fuelConsumedLiters: 0,
            legs: [],
        };
    }

    const first = path[0];

    let totalDistanceNm = 0;
    let totalTimeHours = 0;
    let maxWind = 0;
    let maxGust = 0;
    let maxWave = 0;
    let motoringHours = 0;
    let motoringDist = 0;

    // Per-leg tracking
    const legData = new Map<number, {
        distanceNm: number;
        timeHours: number;
        windSum: number;
        speedSum: number;
        waveSum: number;
        samples: number;
        maxWindKt: number;
        maxWaveM: number;
        motoringDistanceNm: number;
    }>();

    for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const curr = path[i];
        const segDist = distanceNm(prev.lat, prev.lon, curr.lat, curr.lon);
        const segTime = segDist / Math.max(curr.boatSpeed, 0.1);
        totalDistanceNm += segDist;
        totalTimeHours += segTime;

        if (curr.tws > maxWind) {
            maxWind = curr.tws;
        }
        if (curr.tws > maxGust) {
            maxGust = curr.tws;
        }
        if (curr.waveHeight > maxWave) {
            maxWave = curr.waveHeight;
        }

        if (curr.isMotoring) {
            motoringHours += segTime;
            motoringDist += segDist;
        }

        // Track leg (keyed by which waypoint segment we're on)
        const legKey = Math.min(curr.waypointIndex, waypoints.length - 1);
        if (!legData.has(legKey)) {
            legData.set(legKey, {
                distanceNm: 0,
                timeHours: 0,
                windSum: 0,
                speedSum: 0,
                waveSum: 0,
                samples: 0,
                maxWindKt: 0,
                maxWaveM: 0,
                motoringDistanceNm: 0,
            });
        }
        const leg = legData.get(legKey)!;
        leg.distanceNm += segDist;
        leg.timeHours += segTime;
        leg.windSum += curr.tws;
        leg.speedSum += curr.boatSpeed;
        leg.waveSum += curr.waveHeight;
        leg.samples += 1;
        leg.maxWindKt = Math.max(leg.maxWindKt, curr.tws);
        leg.maxWaveM = Math.max(leg.maxWaveM, curr.waveHeight);
        if (curr.isMotoring) {
            leg.motoringDistanceNm += segDist;
        }
    }

    // Build per-leg metrics
    const legs: LegMetrics[] = [];
    for (const [wpIdx, data] of legData) {
        if (data.samples === 0) {
            continue;
        }

        legs.push({
            fromWaypoint: wpIdx - 1,
            toWaypoint: wpIdx,
            distanceNm: data.distanceNm,
            timeHours: data.timeHours,
            avgSpeedKt: data.timeHours > 0 ? data.distanceNm / data.timeHours : 0,
            avgWindKt: data.windSum / data.samples,
            maxWindKt: data.maxWindKt,
            motoringPercent: data.distanceNm > 0 ? (data.motoringDistanceNm / data.distanceNm) * 100 : 0,
        });
    }

    return {
        totalDistanceNm,
        totalTimeHours,
        arrivalTime: first.time + totalTimeHours * 3600 * 1000,
        avgSpeedKt: totalTimeHours > 0 ? totalDistanceNm / totalTimeHours : 0,
        maxWindKt: maxWind,
        maxGustKt: maxGust,
        maxWaveM: maxWave,
        motoringTimeHours: motoringHours,
        motoringDistanceNm: motoringDist,
        fuelConsumedLiters: motoringHours * Math.max(0, motor.fuelBurnLph),
        legs,
    };
}
