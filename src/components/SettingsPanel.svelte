<div class="settings-panel">
    <h3 class="size-s mb-10">{$t('settings.departure')}</h3>
    <div class="form-row mb-5">
        <label class="size-xs">{$t('settings.dateTime', { tz: useLocalTime ? $t('settings.local') : $t('settings.utc') })}</label>
        <input class="form-control mt-3" type="datetime-local" bind:value={departureDateStr} on:change={onDepartureChange} />
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">
            <input type="checkbox" checked={useLocalTime} on:change={onTimeModeChange} />
            {$t('settings.useLocalTime')}
        </label>
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">
            <input type="checkbox" bind:checked={optimizeDeparture} on:change={emitChange} />
            {$t('settings.optimizeDeparture')}
        </label>
    </div>
    {#if optimizeDeparture}
        <div class="form-row mb-5 indent">
            <label class="size-xs">{$t('settings.testWindow')}</label>
            <input class="form-control-sm" type="number" min="6" max="240" step="6" bind:value={departureWindowHours} on:change={emitChange} />
        </div>
        <div class="form-row mb-10 indent">
            <label class="size-xs">{$t('settings.testEvery')}</label>
            <input class="form-control-sm" type="number" min="1" max="24" step="1" bind:value={departureStepHours} on:change={emitChange} />
        </div>
    {/if}

    <div class="form-row mb-10">
        <label class="size-xs">
            <input type="checkbox" bind:checked={useDeadline} on:change={emitChange} />
            {$t('settings.arrivalDeadline')}
        </label>
    </div>
    {#if useDeadline}
        <div class="form-row mb-10 indent">
            <label class="size-xs">{$t('settings.arriveBy', { tz: useLocalTime ? $t('settings.local') : $t('settings.utc') })}</label>
            <input class="form-control mt-3" type="datetime-local" bind:value={deadlineDateStr} on:change={onDeadlineChange} />
        </div>
    {/if}

    <hr class="mb-10 mt-10" />
    <h3 class="size-s mb-10">{$t('settings.motor')}</h3>
    <div class="form-row mb-5">
        <label class="size-xs">
            <input type="checkbox" bind:checked={motorEnabled} on:change={emitChange} />
            {$t('settings.allowMotoring')}
        </label>
    </div>
    {#if motorEnabled}
        <div class="form-row mb-5 indent">
            <label class="size-xs">{$t('settings.motorSpeed')}</label>
            <input class="form-control-sm" type="number" min="1" max="20" step="0.5" bind:value={motorSpeed} on:change={emitChange} />
        </div>
        <div class="form-row mb-5 indent">
            <label class="size-xs">{$t('settings.fuelBurn')}</label>
            <input class="form-control-sm" type="number" min="0.1" max="100" step="0.1" bind:value={fuelBurnLph} on:change={emitChange} />
        </div>
        <div class="form-row mb-5 indent">
            <label class="size-xs">{$t('settings.windThreshold')}</label>
            <input class="form-control-sm" type="number" min="0" max="30" step="0.5" bind:value={windThreshold} on:change={emitChange} />
            <span class="size-xs fg-grey">{$t('settings.motorWhenBelow')}</span>
        </div>
        <div class="form-row mb-10 indent">
            <label class="size-xs">{$t('settings.maxMotorHours')}</label>
            <input class="form-control-sm" type="number" min="0" max="500" step="1" bind:value={maxMotorHours} on:change={emitChange} />
        </div>
    {/if}

    <hr class="mb-10 mt-10" />
    <h3 class="size-s mb-10">{$t('settings.routing')}</h3>
    <div class="form-row mb-5">
        <label class="size-xs">{$t('settings.forecastModel')}</label>
        <select class="form-control-sm" bind:value={product} on:change={emitChange}>
            <optgroup label={$t('settings.globalModels')}>
                <option value="ecmwf">ECMWF</option>
                <option value="gfs">GFS</option>
                <option value="icon">ICON</option>
                <option value="mblue">Meteoblue</option>
            </optgroup>
            <optgroup label={$t('settings.regionalModels')}>
                <option value="iconEu">ICON-EU</option>
                <option value="iconD2">ICON-D2</option>
                <option value="arome">AROME</option>
                <option value="aromeFrance">AROME France</option>
                <option value="aromeAntilles">AROME Antilles</option>
                <option value="aromeReunion">AROME Réunion</option>
                <option value="hrrrConus">HRRR CONUS</option>
                <option value="hrrrAlaska">HRRR Alaska</option>
                <option value="namConus">NAM CONUS</option>
                <option value="namHawaii">NAM Hawaii</option>
                <option value="namAlaska">NAM Alaska</option>
                <option value="ukv">UKV</option>
                <option value="canHrdps">HRDPS (Canada)</option>
                <option value="czeAladin">ALADIN (Czech)</option>
                <option value="jmaMsm">JMA MSM (Japan)</option>
                <option value="bomAccess">ACCESS (Australia)</option>
            </optgroup>
        </select>
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">{$t('settings.timeStep')}</label>
        <select class="form-control-sm" bind:value={timeStepHours} on:change={emitChange}>
            <option value={0.5}>0.5h ({$t('settings.fine')})</option>
            <option value={1}>1h ({$t('settings.standard')})</option>
            <option value={2}>2h ({$t('settings.fast')})</option>
            <option value={3}>3h ({$t('settings.veryFast')})</option>
        </select>
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">{$t('settings.headingRes')}</label>
        <select class="form-control-sm" bind:value={angularResolution} on:change={emitChange}>
            <option value={5}>5° ({$t('settings.precise')})</option>
            <option value={10}>10° ({$t('settings.standard')})</option>
            <option value={15}>15° ({$t('settings.fast')})</option>
        </select>
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">{$t('settings.optimization')}</label>
        <select class="form-control-sm" bind:value={optimizationMode} on:change={emitChange} disabled={useDeadline}>
            <option value={'min-time'}>{$t('settings.fastest')}</option>
            <option value={'min-motoring'}>{$t('settings.leastMotoring')}</option>
            <option value={'comfort-balanced'}>{$t('settings.balancedComfort')}</option>
            <option value={'min-max-wind'}>{$t('settings.lowerMaxWind')}</option>
            <option value={'min-wave-exposure'}>{$t('settings.lowerWaveExposure')}</option>
        </select>
        {#if useDeadline}
            <span class="size-xs fg-grey">{$t('settings.deadlineNote')}</span>
        {/if}
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">{$t('settings.maxDuration')}</label>
        <input class="form-control-sm" type="number" min="12" max="480" step="12" bind:value={maxDurationHours} on:change={emitChange} />
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">{$t('settings.elevationResolution')}</label>
        <select class="form-control-sm" bind:value={elevationResolutionDeg} on:change={emitChange}>
            <option value={0.12}>{$t('settings.elevationCoarse')}</option>
            <option value={0.08}>{$t('settings.elevationStandard')}</option>
            <option value={0.04}>{$t('settings.elevationFine')}</option>
            <option value={0.02}>{$t('settings.elevationUltra')}</option>
        </select>
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">{$t('settings.elevationBatchSize')}</label>
        <input class="form-control-sm" type="number" min="8" max="128" step="4" bind:value={elevationBatchSize} on:change={emitChange} />
    </div>
    <div class="form-row mb-10">
        <label class="size-xs">{$t('settings.maxWind')}</label>
        <input class="form-control-sm" type="number" min="0" max="80" step="1" bind:value={maxWindLimitKt} on:change={emitChange} />
        <span class="size-xs fg-grey">{$t('settings.maxWindNote')}</span>
    </div>
    <div class="form-row mb-5">
        <label class="size-xs">
            <input type="checkbox" bind:checked={useWaveLimit} on:change={emitChange} />
            {$t('settings.maxWaveLimit')}
        </label>
    </div>
    {#if useWaveLimit}
        <div class="form-row mb-10 indent">
            <label class="size-xs">{$t('settings.maxWaveHeight')}</label>
            <input class="form-control-sm" type="number" min="0.5" max="15" step="0.5" bind:value={maxWaveHeightM} on:change={emitChange} />
        </div>
    {/if}

    <hr class="mb-10 mt-10" />
    <h3 class="size-s mb-10">{$t('settings.alternatives')}</h3>
    <div class="form-row mb-5">
        <label class="size-xs">
            <input type="checkbox" bind:checked={routeAlternatives} on:change={emitChange} />
            {$t('settings.computeAlternatives')}
        </label>
    </div>

    <hr class="mb-10 mt-10" />
    <h3 class="size-s mb-10">{$t('settings.language')}</h3>
    <div class="form-row mb-5">
        <select class="form-control-sm" value={$locale} on:change={onLocaleChange}>
            {#each Object.entries(SUPPORTED_LOCALES) as [code, label]}
                <option value={code}>{label}</option>
            {/each}
        </select>
    </div>
</div>

<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import type { RouteConfig, OptimizationMode } from '../types/routing';
    import type { MotorConfig } from '../types/polar';
    import { DEFAULT_MOTOR_CONFIG } from '../types/polar';
    import { t, locale, setLocale, SUPPORTED_LOCALES } from '../lib/i18n';

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
    let elevationResolutionDeg = 0.04;
    let elevationBatchSize = 36;

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
        elevationResolutionDeg = next.elevationResolutionDeg ?? elevationResolutionDeg;
        elevationBatchSize = next.elevationBatchSize ?? elevationBatchSize;

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
            elevationResolutionDeg,
            elevationBatchSize,
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

    function onLocaleChange(e: Event) {
        setLocale((e.target as HTMLSelectElement).value);
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
            elevationResolutionDeg,
            elevationBatchSize,
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
