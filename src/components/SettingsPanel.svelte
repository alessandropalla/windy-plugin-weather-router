<div class="settings-panel">
    <h3 class="size-s mb-10">Departure</h3>
    <div class="form-row mb-5">
        <label class="size-xs">Date & Time ({useLocalTime ? 'Local' : 'UTC'}):</label>
        <input class="form-control mt-3" type="datetime-local" bind:value={departureDateStr} on:change={onDepartureChange} />
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">
            <input type="checkbox" checked={useLocalTime} on:change={onTimeModeChange} />
            Use local time (browser timezone)
        </label>
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">
            <input type="checkbox" bind:checked={optimizeDeparture} on:change={emitChange} />
            Optimize departure time
        </label>
    </div>
    {#if optimizeDeparture}
        <div class="form-row mb-5 indent">
            <label class="size-xs">Test window (hours):</label>
            <input class="form-control-sm" type="number" min="6" max="240" step="6" bind:value={departureWindowHours} on:change={emitChange} />
        </div>
        <div class="form-row mb-10 indent">
            <label class="size-xs">Test every (hours):</label>
            <input class="form-control-sm" type="number" min="1" max="24" step="1" bind:value={departureStepHours} on:change={emitChange} />
        </div>
    {/if}

    <div class="form-row mb-10">
        <label class="size-xs">
            <input type="checkbox" bind:checked={useDeadline} on:change={emitChange} />
            Set arrival deadline
        </label>
    </div>
    {#if useDeadline}
        <div class="form-row mb-10 indent">
            <label class="size-xs">Arrive by ({useLocalTime ? 'Local' : 'UTC'}):</label>
            <input class="form-control mt-3" type="datetime-local" bind:value={deadlineDateStr} on:change={onDeadlineChange} />
        </div>
    {/if}

    <hr class="mb-10 mt-10" />
    <h3 class="size-s mb-10">Motor Settings</h3>
    <div class="form-row mb-5">
        <label class="size-xs">
            <input type="checkbox" bind:checked={motorEnabled} on:change={emitChange} />
            Allow motoring
        </label>
    </div>
    {#if motorEnabled}
        <div class="form-row mb-5 indent">
            <label class="size-xs">Motor speed (kt):</label>
            <input class="form-control-sm" type="number" min="1" max="20" step="0.5" bind:value={motorSpeed} on:change={emitChange} />
        </div>
        <div class="form-row mb-5 indent">
            <label class="size-xs">Fuel burn (L/h):</label>
            <input class="form-control-sm" type="number" min="0.1" max="100" step="0.1" bind:value={fuelBurnLph} on:change={emitChange} />
        </div>
        <div class="form-row mb-5 indent">
            <label class="size-xs">Wind threshold (kt):</label>
            <input class="form-control-sm" type="number" min="0" max="30" step="0.5" bind:value={windThreshold} on:change={emitChange} />
            <span class="size-xs fg-grey">Motor when TWS below this</span>
        </div>
        <div class="form-row mb-10 indent">
            <label class="size-xs">Max motor hours (0=unlimited):</label>
            <input class="form-control-sm" type="number" min="0" max="500" step="1" bind:value={maxMotorHours} on:change={emitChange} />
        </div>
    {/if}

    <hr class="mb-10 mt-10" />
    <h3 class="size-s mb-10">Routing Parameters</h3>
    <div class="form-row mb-5">
        <label class="size-xs">Forecast model:</label>
        <select class="form-control-sm" bind:value={product} on:change={emitChange}>
            <option value="ecmwf">ECMWF</option>
            <option value="gfs">GFS</option>
            <option value="icon">ICON</option>
            <option value="iconEu">ICON-EU</option>
        </select>
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">Time step (hours):</label>
        <select class="form-control-sm" bind:value={timeStepHours} on:change={emitChange}>
            <option value={0.5}>0.5h (fine)</option>
            <option value={1}>1h (standard)</option>
            <option value={2}>2h (fast)</option>
            <option value={3}>3h (very fast)</option>
        </select>
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">Heading resolution (°):</label>
        <select class="form-control-sm" bind:value={angularResolution} on:change={emitChange}>
            <option value={5}>5° (precise)</option>
            <option value={10}>10° (standard)</option>
            <option value={15}>15° (fast)</option>
        </select>
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">Optimization objective:</label>
        <select class="form-control-sm" bind:value={optimizationMode} on:change={emitChange} disabled={useDeadline}>
            <option value={'min-time'}>Fastest arrival (default)</option>
            <option value={'min-motoring'}>Least motoring</option>
            <option value={'comfort-balanced'}>Balanced comfort</option>
            <option value={'min-max-wind'}>Lower max wind</option>
            <option value={'min-wave-exposure'}>Lower wave exposure</option>
        </select>
        {#if useDeadline}
            <span class="size-xs fg-grey">Arrival deadline mode uses fastest route that still meets the deadline.</span>
        {/if}
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">Max duration (hours):</label>
        <input class="form-control-sm" type="number" min="12" max="480" step="12" bind:value={maxDurationHours} on:change={emitChange} />
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">Max wind limit (kt):</label>
        <input class="form-control-sm" type="number" min="0" max="80" step="1" bind:value={maxWindLimitKt} on:change={emitChange} />
        <span class="size-xs fg-grey">Default 25 kt, set 0 to disable.</span>
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">
            <input type="checkbox" bind:checked={useWaveLimit} on:change={emitChange} />
            Max wave height limit
        </label>
    </div>
    {#if useWaveLimit}
        <div class="form-row mb-10 indent">
            <label class="size-xs">Max wave height (m):</label>
            <input class="form-control-sm" type="number" min="0.5" max="15" step="0.5" bind:value={maxWaveHeightM} on:change={emitChange} />
        </div>
    {/if}

    <hr class="mb-10 mt-10" />
    <h3 class="size-s mb-10">Route Alternatives</h3>
    <div class="form-row mb-5">
        <label class="size-xs">
            <input type="checkbox" bind:checked={routeAlternatives} on:change={emitChange} />
            Compute alternative routes
        </label>
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import type { RouteConfig, OptimizationMode } from '../types/routing';
    import type { MotorConfig } from '../types/polar';
    import { DEFAULT_MOTOR_CONFIG } from '../types/polar';

    const dispatch = createEventDispatcher<{ change: Partial<RouteConfig> & { motor: MotorConfig } }>();
    export let value: (Partial<RouteConfig> & { motor?: Partial<MotorConfig> }) | null = null;

    // Departure
    let useLocalTime = false;
    let departureDateStr = formatInputDate(Date.now() + 3600 * 1000, useLocalTime); // 1h from now
    let optimizeDeparture = false;
    let departureWindowHours = 72;
    let departureStepHours = 6;

    // Deadline
    let useDeadline = false;
    let deadlineDateStr = formatInputDate(Date.now() + 7 * 24 * 3600 * 1000, useLocalTime);

    // Motor
    let motorEnabled = DEFAULT_MOTOR_CONFIG.enabled;
    let motorSpeed = DEFAULT_MOTOR_CONFIG.motorSpeed;
    let fuelBurnLph = DEFAULT_MOTOR_CONFIG.fuelBurnLph;
    let windThreshold = DEFAULT_MOTOR_CONFIG.windThreshold;
    let maxMotorHours = DEFAULT_MOTOR_CONFIG.maxMotorHours;

    // Routing params
    let product = 'ecmwf';
    let timeStepHours = 1;
    let angularResolution = 10;
    let optimizationMode: OptimizationMode = 'min-time';
    let maxDurationHours = 168; // 7 days
    let maxWindLimitKt = 25;

    // Safety & alternatives
    let useWaveLimit = false;
    let maxWaveHeightM = 4.0;
    let routeAlternatives = false;

    onMount(() => {
        applyValue(value);
    });

    function applyValue(next: (Partial<RouteConfig> & { motor?: Partial<MotorConfig> }) | null) {
        if (!next) return;

        if (typeof next.useLocalTime === 'boolean') {
            useLocalTime = next.useLocalTime;
        }

        if (typeof next.departureTime === 'number') {
            departureDateStr = formatInputDate(next.departureTime, useLocalTime);
        }
        optimizeDeparture = next.optimizeDeparture ?? optimizeDeparture;
        departureWindowHours = next.departureWindowHours ?? departureWindowHours;
        departureStepHours = next.departureStepHours ?? departureStepHours;

        useDeadline = next.mode === 'arrival-deadline';
        if (next.mode && next.mode !== 'arrival-deadline') {
            optimizationMode = next.mode;
        }
        if (typeof next.arrivalDeadline === 'number') {
            deadlineDateStr = formatInputDate(next.arrivalDeadline, useLocalTime);
        }

        product = next.product ?? product;
        timeStepHours = next.timeStepHours ?? timeStepHours;
        angularResolution = next.angularResolution ?? angularResolution;
        maxDurationHours = next.maxDurationHours ?? maxDurationHours;
        maxWindLimitKt = next.maxWindLimitKt ?? maxWindLimitKt;

        useWaveLimit = typeof next.maxWaveHeightM === 'number' && next.maxWaveHeightM > 0;
        maxWaveHeightM = next.maxWaveHeightM || 4.0;
        routeAlternatives = next.routeAlternatives ?? routeAlternatives;

        const nextMotor = next.motor;
        if (nextMotor) {
            motorEnabled = nextMotor.enabled ?? motorEnabled;
            motorSpeed = nextMotor.motorSpeed ?? motorSpeed;
            fuelBurnLph = nextMotor.fuelBurnLph ?? fuelBurnLph;
            windThreshold = nextMotor.windThreshold ?? windThreshold;
            maxMotorHours = nextMotor.maxMotorHours ?? maxMotorHours;
        }
    }

    function pad2(v: number): string {
        return String(v).padStart(2, '0');
    }

    function formatInputDate(ts: number, isLocal: boolean): string {
        const d = new Date(ts);
        if (isLocal) {
            return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
        }
        return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
    }

    function parseInputDate(value: string, isLocal: boolean): number {
        if (!value) return Date.now();
        const date = isLocal ? new Date(value) : new Date(`${value}Z`);
        const ts = date.getTime();
        return Number.isFinite(ts) ? ts : Date.now();
    }

    function onTimeModeChange(e: Event) {
        const nextMode = (e.target as HTMLInputElement).checked;
        if (nextMode === useLocalTime) {
            return;
        }

        const departureTs = parseInputDate(departureDateStr, useLocalTime);
        const deadlineTs = parseInputDate(deadlineDateStr, useLocalTime);

        useLocalTime = nextMode;
        departureDateStr = formatInputDate(departureTs, useLocalTime);
        deadlineDateStr = formatInputDate(deadlineTs, useLocalTime);
        emitChange();
    }

    function onDepartureChange() {
        emitChange();
    }

    function onDeadlineChange() {
        emitChange();
    }

    function emitChange() {
        dispatch('change', {
            departureTime: parseInputDate(departureDateStr, useLocalTime),
            timeStepHours,
            angularResolution,
            maxDurationHours,
            mode: useDeadline ? 'arrival-deadline' : optimizationMode,
            arrivalDeadline: useDeadline ? parseInputDate(deadlineDateStr, useLocalTime) : undefined,
            optimizeDeparture,
            departureWindowHours,
            departureStepHours,
            product,
            useLocalTime,
            maxWindLimitKt,
            maxWaveHeightM: useWaveLimit ? maxWaveHeightM : 0,
            routeAlternatives,
            motor: {
                enabled: motorEnabled,
                motorSpeed,
                fuelBurnLph,
                windThreshold,
                maxMotorHours,
            },
        });
    }

    /** Export current settings as a RouteConfig-compatible object */
    export function getSettings(): Partial<RouteConfig> & { motor: MotorConfig } {
        return {
            departureTime: parseInputDate(departureDateStr, useLocalTime),
            timeStepHours,
            angularResolution,
            maxDurationHours,
            mode: useDeadline ? 'arrival-deadline' : optimizationMode,
            arrivalDeadline: useDeadline ? parseInputDate(deadlineDateStr, useLocalTime) : undefined,
            optimizeDeparture,
            departureWindowHours,
            departureStepHours,
            product,
            useLocalTime,
            maxWindLimitKt,
            maxWaveHeightM: useWaveLimit ? maxWaveHeightM : 0,
            routeAlternatives,
            motor: {
                enabled: motorEnabled,
                motorSpeed,
                fuelBurnLph,
                windThreshold,
                maxMotorHours,
            },
        };
    }
</script>

<style lang="less">
    .settings-panel {
        font-size: 12px;
    }
    .form-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .form-control {
        width: 100%;
        padding: 4px 8px;
        background: #222;
        border: 1px solid #444;
        color: #eee;
        border-radius: 4px;
        font-size: 12px;
    }
    .form-control-sm {
        padding: 3px 6px;
        background: #222;
        border: 1px solid #444;
        color: #eee;
        border-radius: 4px;
        font-size: 11px;
        width: auto;
        min-width: 80px;
    }
    .indent {
        margin-left: 18px;
    }
    hr {
        border: none;
        border-top: 1px solid #444;
    }
    input[type="checkbox"] {
        margin-right: 4px;
    }
</style>
