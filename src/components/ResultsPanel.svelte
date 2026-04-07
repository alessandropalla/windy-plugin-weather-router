<div class="results-panel">
    {#if !result}
        <p class="size-xs fg-grey">No routing result yet. Configure route and polars, then compute.</p>
    {:else}
        <!-- Summary Card -->
        <div class="summary-card mb-15">
            <div class="summary-title size-s mb-5">Route Summary</div>
            <div class="summary-grid">
                <div class="stat">
                    <span class="stat-value">{result.metrics.totalDistanceNm.toFixed(1)}</span>
                    <span class="stat-label">nm</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{formatDuration(result.metrics.totalTimeHours)}</span>
                    <span class="stat-label">duration</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{result.metrics.avgSpeedKt.toFixed(1)}</span>
                    <span class="stat-label">avg kt</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{result.metrics.maxWindKt.toFixed(0)}</span>
                    <span class="stat-label">max wind kt</span>
                </div>
            </div>
            <div class="summary-grid mt-5">
                <div class="stat">
                    <span class="stat-value">{formatTime(result.departureTime)}</span>
                    <span class="stat-label">departure</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{formatTime(result.metrics.arrivalTime)}</span>
                    <span class="stat-label">arrival</span>
                </div>
            </div>
            {#if result.metrics.motoringTimeHours > 0}
                <div class="motor-info mt-5 size-xs">
                    ⚙ Motoring: {formatDuration(result.metrics.motoringTimeHours)} ({result.metrics.motoringDistanceNm.toFixed(1)} nm)
                </div>
            {/if}
            {#if result.optimizedDeparture}
                <div class="optimize-info mt-5 size-xs">✓ Departure time optimized</div>
            {/if}
        </div>

        <!-- Leg Table -->
        {#if result.metrics.legs.length > 0}
            <div class="mb-15">
                <div class="size-s mb-5">Leg Details</div>
                <div class="leg-table-wrap">
                    <table class="leg-table size-xs">
                        <thead>
                            <tr>
                                <th>Leg</th>
                                <th>Dist</th>
                                <th>Time</th>
                                <th>Avg Spd</th>
                                <th>Avg Wind</th>
                                <th>Max Wind</th>
                                <th>Motor %</th>
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
            <div class="size-s mb-5">Route Timeline</div>
            <div class="chart-label size-xs fg-grey">Wind Speed (kt)</div>
            <svg bind:this={windChartEl} class="timeline-chart"></svg>
            <div class="chart-label size-xs fg-grey mt-10">Boat Speed (kt)</div>
            <svg bind:this={speedChartEl} class="timeline-chart"></svg>
            <div class="chart-label size-xs fg-grey mt-10">True Wind Angle (°)</div>
            <svg bind:this={twaChartEl} class="timeline-chart"></svg>
        </div>

        <!-- Map Options -->
        <div class="mb-10">
            <label class="size-xs">
                <input type="checkbox" bind:checked={showIsochrones} on:change={() => dispatch('toggleIsochrones', showIsochrones)} />
                Show isochrone lines on map
            </label>
        </div>
    {/if}
</div>

<script lang="ts">
    import { createEventDispatcher, afterUpdate } from 'svelte';
    import type { RouteResult, IsochronePoint } from '../types/routing';

    const dispatch = createEventDispatcher<{ toggleIsochrones: boolean }>();

    export let result: RouteResult | null = null;

    let windChartEl: SVGSVGElement;
    let speedChartEl: SVGSVGElement;
    let twaChartEl: SVGSVGElement;
    let showIsochrones = false;

    afterUpdate(() => {
        if (result && result.optimalPath.length > 1) {
            drawTimelineChart(windChartEl, result.optimalPath, p => p.tws, '#4dc9f6', 'kt');
            drawTimelineChart(speedChartEl, result.optimalPath, p => p.boatSpeed, '#f67019', 'kt');
            drawTimelineChart(twaChartEl, result.optimalPath, p => p.twa, '#acc236', '°');
        }
    });

    function formatDuration(hours: number): string {
        const d = Math.floor(hours / 24);
        const h = Math.floor(hours % 24);
        const m = Math.round((hours % 1) * 60);
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function formatTime(ts: number): string {
        if (!ts) return '--';
        const d = new Date(ts);
        return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
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
        const height = 60;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const margin = { left: 30, right: 5, top: 5, bottom: 15 };
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
            label.setAttribute('font-size', '7');
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

        // Time axis labels
        const totalH = (maxT - minT) / 3600000;
        const tickStep = totalH <= 24 ? 6 : totalH <= 72 ? 12 : 24;
        for (let h = 0; h <= totalH; h += tickStep) {
            const t = minT + h * 3600000;
            const d = new Date(t);
            const label = createSvgEl('text');
            label.setAttribute('x', String(xScale(t)));
            label.setAttribute('y', String(height - 2));
            label.setAttribute('font-size', '6');
            label.setAttribute('fill', '#888');
            label.setAttribute('text-anchor', 'middle');
            label.textContent = `${d.getUTCDate()}/${d.getUTCHours()}h`;
            svg.appendChild(label);
        }
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
        height: 60px;
        background: #1a1a2e;
        border-radius: 4px;
    }
    .chart-label {
        margin-bottom: 2px;
    }
    input[type="checkbox"] {
        margin-right: 4px;
    }
</style>
