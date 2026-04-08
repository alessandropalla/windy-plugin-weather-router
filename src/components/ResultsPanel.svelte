<div class="results-panel">
    {#if !result}
        <p class="size-xs fg-grey">{$t('results.empty')}</p>
    {:else}
        <!-- Summary Card -->
        <div class="summary-card mb-15">
            <div class="summary-title size-s mb-5">{$t('results.summary')}</div>
            <div class="summary-grid">
                <div class="stat">
                    <span class="stat-value">{result.metrics.totalDistanceNm.toFixed(1)}</span>
                    <span class="stat-label">{$t('results.nm')}</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{formatDuration(result.metrics.totalTimeHours)}</span>
                    <span class="stat-label">{$t('results.duration')}</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{result.metrics.avgSpeedKt.toFixed(1)}</span>
                    <span class="stat-label">{$t('results.avgKt')}</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{result.metrics.maxWindKt.toFixed(0)}</span>
                    <span class="stat-label">{$t('results.maxWindKt')}</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{result.metrics.maxWaveM.toFixed(1)}</span>
                    <span class="stat-label">{$t('results.maxWavesM')}</span>
                </div>
            </div>
            <div class="summary-grid mt-5">
                <div class="stat">
                    <span class="stat-value">{formatTime(result.departureTime)}</span>
                    <span class="stat-label">{$t('results.departure')}</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{formatTime(result.metrics.arrivalTime)}</span>
                    <span class="stat-label">{$t('results.arrival')}</span>
                </div>
            </div>
            {#if result.metrics.motoringTimeHours > 0}
                <div class="motor-info mt-5 size-xs">
                    {$t('results.motoring', { dur: formatDuration(result.metrics.motoringTimeHours), nm: result.metrics.motoringDistanceNm.toFixed(1), fuel: result.metrics.fuelConsumedLiters.toFixed(1) })}
                </div>
            {/if}
            {#if result.optimizedDeparture}
                <div class="optimize-info mt-5 size-xs">{$t('results.optimizedDeparture')}</div>
            {/if}
        </div>

        <!-- Leg Table -->
        {#if result.metrics.legs.length > 0}
            <div class="mb-15">
                <div class="size-s mb-5">{$t('results.legDetails')}</div>
                <div class="leg-table-wrap">
                    <table class="leg-table size-xs">
                        <thead>
                            <tr>
                                <th>{$t('results.leg')}</th>
                                <th>{$t('results.dist')}</th>
                                <th>{$t('results.time')}</th>
                                <th>{$t('results.avgSpd')}</th>
                                <th>{$t('results.avgWind')}</th>
                                <th>{$t('results.maxWind')}</th>
                                <th>{$t('results.motorPct')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each result.metrics.legs as leg, i}
                                <tr>
                                    <td>{i + 1}</td>
                                    <td>{leg.distanceNm.toFixed(1)}</td>
                                    <td>{formatDuration(leg.timeHours)}</td>
                                    <td>{leg.avgSpeedKt.toFixed(1)}</td>
                                    <td>{leg.avgWindKt.toFixed(0)}</td>
                                    <td>{leg.maxWindKt.toFixed(0)}</td>
                                    <td>{leg.motoringPercent.toFixed(0)}%</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}

        <!-- Timeline Charts -->
        <div class="mb-15">
            <div class="size-s mb-5">{$t('results.timeline')}</div>
            <div class="size-xs fg-grey mb-5">{$t('results.xAxisLabel', { tz: useLocalTime ? $t('settings.local') : $t('settings.utc') })}</div>
            <div class="chart-label size-xs fg-grey">{$t('results.windSpeed')}</div>
            <svg bind:this={windChartEl} class="timeline-chart"></svg>
            <div class="chart-label size-xs fg-grey mt-10">{$t('results.boatSpeed')}</div>
            <svg bind:this={speedChartEl} class="timeline-chart"></svg>
            <div class="chart-label size-xs fg-grey mt-10">{$t('results.twa')}</div>
            <svg bind:this={twaChartEl} class="timeline-chart"></svg>
            <div class="chart-label size-xs fg-grey mt-10">{$t('results.waveHeight')}</div>
            <svg bind:this={wavesChartEl} class="timeline-chart"></svg>
        </div>

        <div class="mb-15">
            <div class="size-s mb-5">{$t('results.timelineTable')}</div>
            <div class="size-xs fg-grey mb-5">{$t('results.timelineNote')}</div>
            <div class="timeline-table-wrap">
                <table class="timeline-table size-xs">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>{$t('results.timeCol', { tz: useLocalTime ? $t('settings.local') : $t('settings.utc') })}</th>
                            <th>{$t('results.windKt')}</th>
                            <th>{$t('results.boatKt')}</th>
                            <th>{$t('results.twaDeg')}</th>
                            <th>{$t('results.wavesM')}</th>
                            <th>{$t('results.mode')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each timelineRows as row}
                            <tr class:motoring-row={row.isMotoring}>
                                <td>{row.index}</td>
                                <td>{row.timeLabel}</td>
                                <td>{row.windKt}</td>
                                <td>{row.boatspeedKt}</td>
                                <td>{row.twaDeg}</td>
                                <td>{row.waveM}</td>
                                <td>{row.isMotoring ? $t('results.motor') : $t('results.sail')}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="mb-15">
            <div class="size-s mb-5">{$t('results.colorLegend')}</div>
            <div class="legend-row size-xs">
                <span class="swatch" style="background:#4dc9f6"></span>{$t('results.wind8')}
            </div>
            <div class="legend-row size-xs">
                <span class="swatch" style="background:#4caf50"></span>{$t('results.wind8_15')}
            </div>
            <div class="legend-row size-xs">
                <span class="swatch" style="background:#ff9800"></span>{$t('results.wind15_25')}
            </div>
            <div class="legend-row size-xs">
                <span class="swatch" style="background:#f44336"></span>{$t('results.wind25')}
            </div>
            <div class="legend-row size-xs">
                <span class="swatch" style="background:#9c27b0"></span>{$t('results.motoringSegment')}
            </div>
        </div>

        <div class="mb-15">
            <div class="size-s mb-5">{$t('results.export')}</div>
            <div class="export-buttons">
                <button class="button button--variant-ghost size-xs" on:click={() => dispatch('exportRoute', 'gpx')}>{$t('results.exportGpx')}</button>
                <button class="button button--variant-ghost size-xs" on:click={() => dispatch('exportRoute', 'csv')}>{$t('results.exportCsv')}</button>
                <button class="button button--variant-ghost size-xs" on:click={() => dispatch('exportRoute', 'geojson')}>{$t('results.exportGeojson')}</button>
            </div>
        </div>

        <!-- Map Options -->
        <div class="mb-10">
            <label class="size-xs">
                <input type="checkbox" bind:checked={showIsochrones} on:change={() => dispatch('toggleIsochrones', showIsochrones)} />
                {$t('results.showIsochrones')}
            </label>
        </div>

        <!-- Animate Route -->
        <div class="mb-15">
            <div class="size-s mb-5">{$t('results.animate')}</div>
            <div class="anim-controls">
                {#if !animating}
                    <button class="button size-xs" on:click={startAnim}>{$t('results.play')}</button>
                {:else}
                    <button class="button size-xs" on:click={stopAnim}>{$t('results.stop')}</button>
                {/if}
                <label class="size-xs">{$t('results.speed')}</label>
                <select class="form-control-sm" bind:value={animSpeed} on:change={onSpeedChange}>
                    <option value={1}>{$t('results.slow')}</option>
                    <option value={5}>{$t('results.normal')}</option>
                    <option value={20}>{$t('results.fast')}</option>
                    <option value={60}>{$t('results.flash')}</option>
                </select>
            </div>
        </div>

        <div class="mb-15">
            <div class="size-s mb-5">{$t('results.comparison')}</div>
            <div class="size-xs fg-grey mb-5">
                {$t('results.comparisonNote')}
            </div>
            <div class="comparison-table-wrap">
                <table class="comparison-table size-xs">
                    <thead>
                        <tr>
                            <th>{$t('results.routeCol')}</th>
                            <th>{$t('results.objective')}</th>
                            <th>{$t('results.departureCol')}</th>
                            <th>{$t('results.arrivalCol')}</th>
                            <th>{$t('results.durationCol')}</th>
                            <th>{$t('results.distanceCol')}</th>
                            <th>{$t('results.avgKtCol')}</th>
                            <th>{$t('results.motorH')}</th>
                            <th>{$t('results.fuelL')}</th>
                            <th>{$t('results.maxWindCol')}</th>
                            <th>{$t('results.maxWavesCol')}</th>
                            <th>{$t('results.tradeoff')}</th>
                            <th>{$t('results.action')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each comparisonRows as row}
                            <tr class:primary-row={row.primary}>
                                <td>{row.routeLabel}</td>
                                <td>{row.objectiveLabel}</td>
                                <td>{formatTime(row.departureTime)}</td>
                                <td>{formatTime(row.arrivalTime)}</td>
                                <td>{formatDuration(row.totalTimeHours)}</td>
                                <td>{row.totalDistanceNm.toFixed(1)} nm</td>
                                <td>{row.avgSpeedKt.toFixed(1)}</td>
                                <td>{row.motoringTimeHours.toFixed(1)}</td>
                                <td>{row.fuelConsumedLiters.toFixed(1)}</td>
                                <td>{row.maxWindKt.toFixed(0)} kt</td>
                                <td>{row.maxWaveM.toFixed(1)} m</td>
                                <td>{row.tradeoff}</td>
                                <td>
                                    {#if row.primary || row.alternativeIndex === null}
                                        <span class="size-xs fg-grey">{$t('results.selected')}</span>
                                    {:else}
                                        <button
                                            class="button button--variant-ghost size-xs"
                                            on:click={() => dispatch('selectPrimaryRoute', { alternativeIndex: row.alternativeIndex ?? -1 })}
                                        >
                                            {$t('results.makePrimary')}
                                        </button>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            {#if alternativesRequested && alternativeResults.length === 0}
                <div class="size-xs fg-grey mt-5">{$t('results.noAlternatives')}</div>
            {/if}
            {#if !alternativesRequested}
                <div class="size-xs fg-grey mt-5">{$t('results.alternativesHint')}</div>
            {/if}
        </div>

        {#if result.optimizedDeparture && result.departureAnalysis && result.departureAnalysis.length > 0}
            <div class="mb-15">
                <div class="size-s mb-5">{$t('results.departureComparison')}</div>
                <div class="size-xs fg-grey mb-5">
                    {$t('results.departureNote')}
                </div>
                <div class="comparison-table-wrap">
                    <table class="comparison-table size-xs">
                        <thead>
                            <tr>
                                <th>{$t('results.departureCol')}</th>
                                <th>{$t('results.arrivalCol')}</th>
                                <th>{$t('results.durationCol')}</th>
                                <th>{$t('results.distanceCol')}</th>
                                <th>{$t('results.avgKtCol')}</th>
                                <th>{$t('results.motorH')}</th>
                                <th>{$t('results.fuelL')}</th>
                                <th>{$t('results.maxWindCol')}</th>
                                <th>{$t('results.maxWavesCol')}</th>
                                <th>{$t('results.score')}</th>
                                <th>{$t('results.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each result.departureAnalysis as dep}
                                <tr class:primary-row={dep.selected}>
                                    <td>{formatTime(dep.departureTime)}</td>
                                    <td>{formatTime(dep.arrivalTime)}</td>
                                    <td>{formatDuration(dep.totalTimeHours)}</td>
                                    <td>{dep.totalDistanceNm.toFixed(1)} nm</td>
                                    <td>{dep.avgSpeedKt.toFixed(1)}</td>
                                    <td>{dep.motoringTimeHours.toFixed(1)}</td>
                                    <td>{dep.fuelConsumedLiters.toFixed(1)}</td>
                                    <td>{dep.maxWindKt.toFixed(0)} kt</td>
                                    <td>{dep.maxWaveM.toFixed(1)} m</td>
                                    <td>{dep.optimizationScore.toFixed(3)}</td>
                                    <td>{dep.selected ? $t('results.statusSelected') : $t('results.statusCandidate')}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        {/if}
    {/if}
</div>

<script lang="ts">
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import type { RouteResult, IsochronePoint } from '../types/routing';
    import { t, tGet, formatShortDate } from '../lib/i18n';

    const dispatch = createEventDispatcher<{
        toggleIsochrones: boolean;
        exportRoute: 'gpx' | 'csv' | 'geojson';
        animationControl: { playing: boolean; speed: number };
        selectPrimaryRoute: { alternativeIndex: number };
    }>();

    export let result: RouteResult | null = null;
    export let alternativeResults: RouteResult[] = [];
    export let alternativesRequested = false;
    export let useLocalTime = false;
    export let animating = false;

    let windChartEl: SVGSVGElement;
    let speedChartEl: SVGSVGElement;
    let twaChartEl: SVGSVGElement;
    let wavesChartEl: SVGSVGElement;
    let showIsochrones = false;

    // Animation
    let animSpeed = 5; // steps per second

    type TimelineRow = {
        index: number;
        timeLabel: string;
        windKt: string;
        boatspeedKt: string;
        twaDeg: string;
        waveM: string;
        isMotoring: boolean;
    };

    let timelinePath: IsochronePoint[] = [];
    let timelineRows: TimelineRow[] = [];

    type ComparisonRow = {
        routeLabel: string;
        primary: boolean;
        alternativeIndex: number | null;
        objectiveLabel: string;
        departureTime: number;
        arrivalTime: number;
        totalDistanceNm: number;
        totalTimeHours: number;
        avgSpeedKt: number;
        motoringTimeHours: number;
        fuelConsumedLiters: number;
        maxWindKt: number;
        maxWaveM: number;
        tradeoff: string;
    };

    // Laylines
    // (removed)

    function startAnim() {
        dispatch('animationControl', { playing: true, speed: animSpeed });
    }

    function stopAnim() {
        dispatch('animationControl', { playing: false, speed: animSpeed });
    }

    function onSpeedChange() {
        if (animating) dispatch('animationControl', { playing: true, speed: animSpeed });
    }

    // Re-evaluated whenever result changes.
    $: timelinePath = result ? normalizeTimelinePath(result.optimalPath) : [];

    // Re-evaluated whenever route data or locale ($t) changes.
    $: {
        $t;
        timelineRows = timelinePath.map((p, idx) => ({
            index: idx,
            timeLabel: formatTime(p.time),
            windKt: p.tws.toFixed(1),
            boatspeedKt: p.boatSpeed.toFixed(1),
            twaDeg: p.twa.toFixed(0),
            waveM: p.waveHeight.toFixed(2),
            isMotoring: p.isMotoring,
        }));
    }

    $: comparisonRows = buildComparisonRows(result, alternativeResults, $t);

    afterUpdate(() => {
        if (timelinePath.length > 1) {
            drawTimelineChart(windChartEl, timelinePath, p => p.tws, '#4dc9f6', 'kt');
            drawTimelineChart(speedChartEl, timelinePath, p => p.boatSpeed, '#f67019', 'kt');
            drawTimelineChart(twaChartEl, timelinePath, p => p.twa, '#acc236', '°');
            drawTimelineChart(wavesChartEl, timelinePath, p => p.waveHeight, '#00bcd4', 'm');
        }
    });

    function normalizeTimelinePath(path: IsochronePoint[]): IsochronePoint[] {
        if (path.length < 2) {
            return path;
        }

        const first = path[0];
        const hasArtificialSeedValues =
            first.tws === 0 &&
            first.boatSpeed === 0 &&
            first.twa === 0 &&
            first.waveHeight === 0;

        if (!hasArtificialSeedValues) {
            return path;
        }

        const firstMeasuredIndex = path.findIndex(
            p => p.tws > 0 || p.boatSpeed > 0 || p.twa > 0 || p.waveHeight > 0,
        );

        if (firstMeasuredIndex <= 0) {
            return path;
        }

        const measured = path[firstMeasuredIndex];
        const normalizedFirst: IsochronePoint = {
            ...first,
            tws: measured.tws,
            boatSpeed: measured.boatSpeed,
            twa: measured.twa,
            waveHeight: measured.waveHeight,
            isMotoring: measured.isMotoring,
        };

        return [normalizedFirst, ...path.slice(1)];
    }

    function formatDuration(hours: number): string {
        const totalMinutes = Math.max(0, Math.round(hours * 60));
        const d = Math.floor(totalMinutes / (24 * 60));
        const h = Math.floor((totalMinutes % (24 * 60)) / 60);
        const m = totalMinutes % 60;
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function buildComparisonRows(primary: RouteResult | null, alternatives: RouteResult[], tFn: (k: string, p?: Record<string, string | number>) => string = tGet): ComparisonRow[] {
        if (!primary) {
            return [];
        }

        const rows: ComparisonRow[] = [
            toComparisonRow(primary, tFn('results.primary'), true, null, null, tFn),
            ...alternatives.map((alt, idx) => {
                const label = alt.variantLabel || tFn('results.altLabel', { n: idx + 1 });
                return toComparisonRow(alt, label, false, idx, primary, tFn);
            }),
        ];

        return rows;
    }

    function toComparisonRow(
        route: RouteResult,
        routeLabel: string,
        primary: boolean,
        alternativeIndex: number | null,
        baseline: RouteResult | null,
        tFn: (k: string, p?: Record<string, string | number>) => string = tGet,
    ): ComparisonRow {
        return {
            routeLabel,
            primary,
            alternativeIndex,
            objectiveLabel: route.optimizationLabel,
            departureTime: route.departureTime,
            arrivalTime: route.metrics.arrivalTime,
            totalDistanceNm: route.metrics.totalDistanceNm,
            totalTimeHours: route.metrics.totalTimeHours,
            avgSpeedKt: route.metrics.avgSpeedKt,
            motoringTimeHours: route.metrics.motoringTimeHours,
            fuelConsumedLiters: route.metrics.fuelConsumedLiters,
            maxWindKt: route.metrics.maxWindKt,
            maxWaveM: route.metrics.maxWaveM,
            tradeoff: describeTradeoff(route, baseline, tFn),
        };
    }

    function describeTradeoff(route: RouteResult, baseline: RouteResult | null, tFn: (k: string, p?: Record<string, string | number>) => string = tGet): string {
        if (!baseline) {
            return tFn('tradeoff.baseline');
        }

        const timeDelta = route.metrics.totalTimeHours - baseline.metrics.totalTimeHours;
        const fuelDelta = route.metrics.fuelConsumedLiters - baseline.metrics.fuelConsumedLiters;
        const windDelta = route.metrics.maxWindKt - baseline.metrics.maxWindKt;
        const waveDelta = route.metrics.maxWaveM - baseline.metrics.maxWaveM;

        const notes: string[] = [];

        if (timeDelta <= -0.25) notes.push(`${formatSignedHours(timeDelta)} ${tFn('tradeoff.faster')}`);
        if (timeDelta >= 0.25) notes.push(`${formatSignedHours(timeDelta)} ${tFn('tradeoff.slower')}`);
        if (fuelDelta <= -0.2) notes.push(`${formatSigned(fuelDelta, 1)} ${tFn('tradeoff.fuel')}`);
        if (fuelDelta >= 0.2) notes.push(`${formatSigned(fuelDelta, 1)} ${tFn('tradeoff.fuel')}`);
        if (windDelta <= -0.5) notes.push(`${formatSigned(windDelta, 1)} ${tFn('tradeoff.maxWind')}`);
        if (windDelta >= 0.5) notes.push(`${formatSigned(windDelta, 1)} ${tFn('tradeoff.maxWind')}`);
        if (waveDelta <= -0.1) notes.push(`${formatSigned(waveDelta, 1)} ${tFn('tradeoff.maxWaves')}`);
        if (waveDelta >= 0.1) notes.push(`${formatSigned(waveDelta, 1)} ${tFn('tradeoff.maxWaves')}`);

        if (notes.length === 0) {
            return tFn('tradeoff.similar');
        }

        return notes.join(', ');
    }

    function formatSigned(value: number, digits = 1): string {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(digits)}`;
    }

    function formatSignedHours(hours: number): string {
        const abs = Math.abs(hours);
        const sign = hours > 0 ? '+' : '';
        if (abs >= 24) {
            return `${sign}${(hours / 24).toFixed(1)}d`;
        }
        return `${sign}${hours.toFixed(1)}h`;
    }

    function formatTime(ts: number): string {
        return formatShortDate(ts, useLocalTime);
    }

    function drawTimelineChart(
        svg: SVGSVGElement,
        path: IsochronePoint[],
        valueFn: (p: IsochronePoint) => number,
        color: string,
        _unit: string,
    ) {
        if (!svg || path.length < 2) return;
        svg.innerHTML = '';

        const width = svg.clientWidth || 280;
        const height = 110;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const margin = { left: 38, right: 8, top: 8, bottom: 30 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const times = path.map(p => p.time);
        const values = path.map(valueFn);

        const minT = times[0];
        const maxT = times[times.length - 1];
        const maxV = Math.max(...values, 1);

        const xScale = (t: number) => margin.left + ((t - minT) / (maxT - minT)) * w;
        const yScale = (v: number) => margin.top + h - (v / maxV) * h;

        // Motoring bands
        for (let i = 1; i < path.length; i++) {
            if (path[i].isMotoring) {
                const rect = createSvgEl('rect');
                rect.setAttribute('x', String(xScale(path[i - 1].time)));
                rect.setAttribute('y', String(margin.top));
                rect.setAttribute('width', String(xScale(path[i].time) - xScale(path[i - 1].time)));
                rect.setAttribute('height', String(h));
                rect.setAttribute('fill', 'rgba(255,165,0,0.15)');
                svg.appendChild(rect);
            }
        }

        // Grid lines
        for (let v = 0; v <= maxV; v += Math.ceil(maxV / 4)) {
            const line = createSvgEl('line');
            line.setAttribute('x1', String(margin.left));
            line.setAttribute('y1', String(yScale(v)));
            line.setAttribute('x2', String(width - margin.right));
            line.setAttribute('y2', String(yScale(v)));
            line.setAttribute('stroke', '#333');
            line.setAttribute('stroke-width', '0.5');
            svg.appendChild(line);

            const label = createSvgEl('text');
            label.setAttribute('x', String(margin.left - 3));
            label.setAttribute('y', String(yScale(v) + 3));
            label.setAttribute('font-size', '9');
            label.setAttribute('fill', '#888');
            label.setAttribute('text-anchor', 'end');
            label.textContent = String(Math.round(v));
            svg.appendChild(label);
        }

        // Line
        const points = times.map((t, i) => `${xScale(t)},${yScale(values[i])}`).join(' ');
        const polyline = createSvgEl('polyline');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', '1.5');
        svg.appendChild(polyline);

        // Hourly vertical ticks and labels
        const hourMs = 3600 * 1000;
        const firstHourTick = Math.ceil(minT / hourMs) * hourMs;
        for (let t = firstHourTick; t <= maxT; t += hourMs) {
            const grid = createSvgEl('line');
            grid.setAttribute('x1', String(xScale(t)));
            grid.setAttribute('y1', String(margin.top));
            grid.setAttribute('x2', String(xScale(t)));
            grid.setAttribute('y2', String(height - margin.bottom));
            grid.setAttribute('stroke', '#2f2f43');
            grid.setAttribute('stroke-width', '0.6');
            svg.appendChild(grid);

            const d = new Date(t);
            const label = createSvgEl('text');
            label.setAttribute('x', String(xScale(t)));
            label.setAttribute('y', String(height - 12));
            label.setAttribute('font-size', '7');
            label.setAttribute('fill', '#888');
            label.setAttribute('text-anchor', 'middle');
            if (useLocalTime) {
                const isMidnight = d.getHours() === 0;
                const dateStr = formatShortDate(t, true).split(' ')[0]; // locale-aware DD/MM or MM/DD
                label.textContent = isMidnight
                    ? `${dateStr} 00`
                    : `${String(d.getHours()).padStart(2, '0')}`;
            } else {
                const isMidnightUtc = d.getUTCHours() === 0;
                const dateStr = formatShortDate(t, false).split(' ')[0];
                label.textContent = isMidnightUtc
                    ? `${dateStr} 00Z`
                    : `${String(d.getUTCHours()).padStart(2, '0')}Z`;
            }
            svg.appendChild(label);
        }

        const xAxisLabel = createSvgEl('text');
        xAxisLabel.setAttribute('x', String(margin.left + w / 2));
        xAxisLabel.setAttribute('y', String(height - 2));
        xAxisLabel.setAttribute('font-size', '8');
        xAxisLabel.setAttribute('fill', '#999');
        xAxisLabel.setAttribute('text-anchor', 'middle');
        xAxisLabel.textContent = tGet('results.xAxisLabel', { tz: useLocalTime ? tGet('settings.local') : tGet('settings.utc') });
        svg.appendChild(xAxisLabel);
    }

    function createSvgEl(tag: string): SVGElement {
        return document.createElementNS('http://www.w3.org/2000/svg', tag);
    }
</script>

<style lang="less">
    .results-panel {
        font-size: 12px;
    }
    .summary-card {
        padding: 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 6px;
        border-left: 3px solid darkorange;
    }
    .summary-title {
        font-weight: bold;
    }
    .summary-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }
    .stat {
        display: flex;
        flex-direction: column;
    }
    .stat-value {
        font-size: 16px;
        font-weight: bold;
        color: #fff;
    }
    .stat-label {
        font-size: 10px;
        color: #888;
    }
    .motor-info {
        color: darkorange;
    }
    .optimize-info {
        color: #4caf50;
    }
    .leg-table-wrap {
        overflow-x: auto;
    }
    .leg-table {
        border-collapse: collapse;
        width: 100%;
        th, td {
            border: 1px solid #444;
            padding: 3px 6px;
            text-align: center;
        }
        th {
            background: #333;
        }
    }
    .timeline-chart {
        width: 100%;
        height: 110px;
        background: #1a1a2e;
        border-radius: 4px;
    }
    .chart-label {
        margin-bottom: 2px;
    }
    .legend-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
    }
    .swatch {
        width: 14px;
        height: 10px;
        border-radius: 2px;
        border: 1px solid rgba(255,255,255,0.2);
        display: inline-block;
        flex-shrink: 0;
    }
    .export-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }
    .timeline-table-wrap {
        max-height: 220px;
        overflow: auto;
        border: 1px solid #333;
        border-radius: 4px;
    }
    .timeline-table {
        border-collapse: collapse;
        width: 100%;
        th, td {
            border-bottom: 1px solid #333;
            padding: 4px 6px;
            text-align: center;
            white-space: nowrap;
        }
        th {
            position: sticky;
            top: 0;
            background: #222;
            z-index: 1;
        }
        td:nth-child(2), th:nth-child(2) {
            text-align: left;
        }
    }
    .motoring-row {
        background: rgba(156, 39, 176, 0.12);
    }
    input[type="checkbox"] {
        margin-right: 4px;
    }
    .anim-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }
    .comparison-table-wrap {
        overflow-x: auto;
    }
    .comparison-table {
        border-collapse: collapse;
        width: 100%;
        th, td {
            border-bottom: 1px solid #333;
            padding: 4px 6px;
            text-align: left;
            white-space: nowrap;
        }
        th {
            position: sticky;
            top: 0;
            background: #222;
            z-index: 1;
        }
    }
    .primary-row {
        background: rgba(255, 152, 0, 0.12);
    }
</style>
