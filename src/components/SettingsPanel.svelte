<div class="settings-panel">
    <h3 class="size-s mb-10">Departure</h3>
    <div class="form-row mb-5">
        <label class="size-xs">Date & Time (UTC):</label>
        <input class="form-control mt-3" type="datetime-local" bind:value={departureDateStr} on:change={onDepartureChange} />
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
            <label class="size-xs">Arrive by (UTC):</label>
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
    <div class="form-row mb-10">
        <label class="size-xs">Max duration (hours):</label>
        <input class="form-control-sm" type="number" min="12" max="480" step="12" bind:value={maxDurationHours} on:change={emitChange} />
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { RouteConfig } from '../types/routing';
    import type { MotorConfig } from '../types/polar';
    import { DEFAULT_MOTOR_CONFIG } from '../types/polar';

    const dispatch = createEventDispatcher<{ change: Partial<RouteConfig> & { motor: MotorConfig } }>();

    // Departure
    let departureDateStr = toDatetimeLocal(Date.now() + 3600 * 1000); // 1h from now
    let optimizeDeparture = false;
    let departureWindowHours = 72;
    let departureStepHours = 6;

    // Deadline
    let useDeadline = false;
    let deadlineDateStr = toDatetimeLocal(Date.now() + 7 * 24 * 3600 * 1000);

    // Motor
    let motorEnabled = DEFAULT_MOTOR_CONFIG.enabled;
    let motorSpeed = DEFAULT_MOTOR_CONFIG.motorSpeed;
    let windThreshold = DEFAULT_MOTOR_CONFIG.windThreshold;
    let maxMotorHours = DEFAULT_MOTOR_CONFIG.maxMotorHours;

    // Routing params
    let product = 'ecmwf';
    let timeStepHours = 1;
    let angularResolution = 10;
    let maxDurationHours = 168; // 7 days

    function toDatetimeLocal(ts: number): string {
        const d = new Date(ts);
        return d.toISOString().slice(0, 16);
    }

    function onDepartureChange() {
        emitChange();
    }

    function onDeadlineChange() {
        emitChange();
    }

    function emitChange() {
        dispatch('change', {
            departureTime: new Date(departureDateStr + 'Z').getTime(),
            timeStepHours,
            angularResolution,
            maxDurationHours,
            mode: useDeadline ? 'arrival-deadline' : 'min-time',
            arrivalDeadline: useDeadline ? new Date(deadlineDateStr + 'Z').getTime() : undefined,
            optimizeDeparture,
            departureWindowHours,
            departureStepHours,
            product,
            motor: {
                enabled: motorEnabled,
                motorSpeed,
                windThreshold,
                maxMotorHours,
            },
        });
    }

    /** Export current settings as a RouteConfig-compatible object */
    export function getSettings(): Partial<RouteConfig> & { motor: MotorConfig } {
        return {
            departureTime: new Date(departureDateStr + 'Z').getTime(),
            timeStepHours,
            angularResolution,
            maxDurationHours,
            mode: useDeadline ? 'arrival-deadline' : 'min-time',
            arrivalDeadline: useDeadline ? new Date(deadlineDateStr + 'Z').getTime() : undefined,
            optimizeDeparture,
            departureWindowHours,
            departureStepHours,
            product,
            motor: {
                enabled: motorEnabled,
                motorSpeed,
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
