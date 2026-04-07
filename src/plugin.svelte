
<div class="plugin__mobile-header">
    {title}
</div>
<section class="plugin__content">
    <div
        class="plugin__title plugin__title--chevron-back"
        on:click={() => bcast.emit('rqstOpen', 'menu')}
    >
        {title}
    </div>

    <!-- Tab navigation -->
    <div class="main-tabs mb-10">
        <span class="main-tab clickable" class:main-tab--active={activeTab === 'route'} on:click={() => activeTab = 'route'}>⛵ Route</span>
        <span class="main-tab clickable" class:main-tab--active={activeTab === 'polars'} on:click={() => activeTab = 'polars'}>📊 Polars</span>
        <span class="main-tab clickable" class:main-tab--active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>⚙ Settings</span>
        <span class="main-tab clickable" class:main-tab--active={activeTab === 'results'} on:click={() => activeTab = 'results'}>📈 Results</span>
    </div>

    <!-- Tab content -->
    {#if activeTab === 'route'}
        <WaypointPanel
            bind:this={waypointPanel}
            bind:waypoints={waypoints}
            bind:addingMode={waypointAddMode}
            on:change={onWaypointsChange}
            on:addModeChange={e => waypointAddMode = e.detail}
        />

        <hr class="mt-15 mb-15" />

        <!-- Compute button -->
        <button
            class="button button--variant-orange"
            class:button--loading={computing}
            disabled={!canCompute}
            on:click={runRouting}
        >
            {computing ? 'Computing...' : 'Compute Weather Route'}
        </button>

        {#if !canCompute && !computing}
            <p class="size-xs fg-grey mt-5">
                {#if waypoints.length < 2}
                    Add at least 2 waypoints to compute a route.
                {:else if !currentPolar}
                    Select a polar diagram in the Polars tab.
                {/if}
            </p>
        {/if}

        {#if progressMsg}
            <p class="size-xs fg-grey mt-5">{progressMsg}</p>
        {/if}
        {#if errorMsg}
            <p class="size-xs mt-5 error-text">{errorMsg}</p>
        {/if}

    {:else if activeTab === 'polars'}
        <PolarEditor
            bind:polar={currentPolar}
            on:change={e => currentPolar = e.detail}
        />

    {:else if activeTab === 'settings'}
        <SettingsPanel
            bind:this={settingsPanel}
            on:change={onSettingsChange}
        />

    {:else if activeTab === 'results'}
        <ResultsPanel
            result={routeResult}
            on:toggleIsochrones={e => toggleIsochroneDisplay(e.detail)}
        />
    {/if}
</section>

<script lang="ts">
    import bcast from '@windy/broadcast';
    import { map, markers } from '@windy/map';
    import { singleclick } from '@windy/singleclick';
    import store from '@windy/store';

    import { onDestroy, onMount } from 'svelte';

    import config from './pluginConfig';

    import WaypointPanel from './components/WaypointPanel.svelte';
    import PolarEditor from './components/PolarEditor.svelte';
    import SettingsPanel from './components/SettingsPanel.svelte';
    import ResultsPanel from './components/ResultsPanel.svelte';

    import type { PolarDiagram } from './types/polar';
    import { DEFAULT_MOTOR_CONFIG } from './types/polar';
    import type { Waypoint, RouteConfig, RouteResult } from './types/routing';
    import type { WindGrid } from './lib/windgrid';
    import { fetchWindGrid } from './lib/windgrid';
    import { computeRoute, computeRouteWithDepartureOptimization } from './lib/routing';
    import { saveWaypoints, loadWaypoints } from './lib/waypoints';

    import type { LatLon } from '@windy/interfaces';

    const { title, name } = config;

    // --- State ---
    let activeTab: 'route' | 'polars' | 'settings' | 'results' = 'route';

    // Waypoints
    let waypoints: Waypoint[] = [];
    let waypointAddMode = false;
    let waypointPanel: WaypointPanel;

    // Polars
    let currentPolar: PolarDiagram | null = null;

    // Settings
    let settingsPanel: SettingsPanel;
    let settingsCache: Partial<RouteConfig> & { motor: typeof DEFAULT_MOTOR_CONFIG } = {
        departureTime: Date.now() + 3600 * 1000,
        timeStepHours: 1,
        angularResolution: 10,
        maxDurationHours: 168,
        mode: 'min-time',
        optimizeDeparture: false,
        departureWindowHours: 72,
        departureStepHours: 6,
        product: 'ecmwf',
        motor: { ...DEFAULT_MOTOR_CONFIG },
    };

    // Routing
    let computing = false;
    let progressMsg = '';
    let errorMsg = '';
    let routeResult: RouteResult | null = null;

    // Map layers
    let waypointMarkers: L.Marker[] = [];
    let routePolyline: L.Polyline | null = null;
    let optimalRoutePolyline: L.Polyline | null = null;
    let isochroneLines: L.Polyline[] = [];
    let showIsochrones = false;

    $: canCompute = waypoints.length >= 2 && currentPolar !== null && !computing;

    // --- Reactive: redraw map layers when waypoints change ---
    $: drawWaypointMarkers(waypoints);
    $: drawReferenceLine(waypoints);

    function onWaypointsChange(e: CustomEvent<Waypoint[]>) {
        waypoints = e.detail;
        saveWaypoints(waypoints);
    }

    function onSettingsChange(e: CustomEvent) {
        settingsCache = e.detail;
    }

    // --- Map click handler ---
    function onMapClick(latLon: LatLon) {
        if (waypointAddMode && waypointPanel) {
            waypointPanel.addWaypoint(latLon.lat, latLon.lon);
        }
    }

    // --- Waypoint markers on map ---
    function drawWaypointMarkers(wps: Waypoint[]) {
        // Remove old markers
        for (const m of waypointMarkers) m.remove();
        waypointMarkers = [];

        for (let i = 0; i < wps.length; i++) {
            const wp = wps[i];
            const icon = i === 0
                ? markers.pulsatingIcon
                : markers.myLocationIcon;
            const marker = new L.Marker(
                { lat: wp.lat, lng: wp.lon },
                { icon, draggable: true },
            ).addTo(map);

            marker.bindTooltip(wp.name || `WPT ${i + 1}`, { permanent: false });

            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                waypoints[i] = { ...waypoints[i], lat: pos.lat, lon: pos.lng };
                waypoints = waypoints; // trigger reactivity
                saveWaypoints(waypoints);
            });

            waypointMarkers.push(marker);
        }
    }

    function drawReferenceLine(wps: Waypoint[]) {
        if (routePolyline) {
            routePolyline.remove();
            routePolyline = null;
        }
        if (wps.length < 2) return;

        routePolyline = new L.Polyline(
            wps.map(w => [w.lat, w.lon] as [number, number]),
            { color: '#ffffff', weight: 2, opacity: 0.4, dashArray: '8,6' },
        ).addTo(map);
    }

    // --- Routing ---
    async function runRouting() {
        if (!currentPolar || waypoints.length < 2) return;

        computing = true;
        progressMsg = 'Fetching wind data...';
        errorMsg = '';
        routeResult = null;
        clearRouteDisplay();

        try {
            // Set wind overlay for visual feedback
            store.set('overlay', 'wind');

            // Get latest settings
            const settings = settingsPanel?.getSettings?.() ?? settingsCache;

            // Fetch wind grid
            const windGrid: WindGrid = await fetchWindGrid(
                waypoints,
                settings.product || 'ecmwf',
                name,
                60,
                0.5,
                (fetched, total) => {
                    progressMsg = `Fetching wind: ${fetched}/${total} grid points...`;
                },
            );

            progressMsg = 'Running isochrone algorithm...';

            // Build full config
            const routeConfig: RouteConfig = {
                departureTime: settings.departureTime || Date.now() + 3600 * 1000,
                timeStepHours: settings.timeStepHours || 1,
                angularResolution: settings.angularResolution || 10,
                maxDurationHours: settings.maxDurationHours || 168,
                mode: settings.mode || 'min-time',
                arrivalDeadline: settings.arrivalDeadline,
                optimizeDeparture: settings.optimizeDeparture || false,
                departureWindowHours: settings.departureWindowHours || 72,
                departureStepHours: settings.departureStepHours || 6,
                product: settings.product || 'ecmwf',
                boat: {
                    polar: currentPolar,
                    motor: settings.motor || DEFAULT_MOTOR_CONFIG,
                },
            };

            // Run routing (use setTimeout to allow UI to update)
            const result = await new Promise<RouteResult>((resolve, reject) => {
                setTimeout(() => {
                    try {
                        const r = routeConfig.optimizeDeparture
                            ? computeRouteWithDepartureOptimization(waypoints, routeConfig, windGrid, p => {
                                  progressMsg = p.message;
                              })
                            : computeRoute(waypoints, routeConfig, windGrid, p => {
                                  progressMsg = p.message;
                              });
                        resolve(r);
                    } catch (e) {
                        reject(e);
                    }
                }, 50);
            });

            routeResult = result;
            drawOptimalRoute(result);
            progressMsg = '';
            activeTab = 'results';
        } catch (e) {
            errorMsg = `Routing failed: ${(e as Error).message}`;
            progressMsg = '';
        } finally {
            computing = false;
        }
    }

    // --- Map display ---
    function drawOptimalRoute(result: RouteResult) {
        clearRouteDisplay();

        if (result.optimalPath.length < 2) return;

        // Color-code the route by wind speed
        const path = result.optimalPath;
        for (let i = 1; i < path.length; i++) {
            const prev = path[i - 1];
            const curr = path[i];
            const color = curr.isMotoring
                ? '#ff9800' // orange for motoring
                : windSpeedColor(curr.tws);

            const segment = new L.Polyline(
                [[prev.lat, prev.lon], [curr.lat, curr.lon]],
                { color, weight: 3, opacity: 0.9 },
            ).addTo(map);

            segment.bindPopup(
                `<b>${new Date(curr.time).toUTCString()}</b><br/>` +
                `Speed: ${curr.boatSpeed.toFixed(1)} kt<br/>` +
                `Wind: ${curr.tws.toFixed(0)} kt @ ${curr.twd.toFixed(0)}°<br/>` +
                `TWA: ${curr.twa.toFixed(0)}°<br/>` +
                `${curr.isMotoring ? '⚙ Motoring' : '⛵ Sailing'}`,
            );

            isochroneLines.push(segment); // reuse array for cleanup
        }

        // Draw isochrone fronts if toggled on
        if (showIsochrones) {
            drawIsochrones(result);
        }
    }

    function drawIsochrones(result: RouteResult) {
        for (const front of result.isochrones) {
            if (front.length < 2) continue;
            // Sort points by bearing to target for a clean line
            const sorted = [...front].sort((a, b) => {
                const lastWp = waypoints[waypoints.length - 1];
                const brgA = Math.atan2(a.lon - lastWp.lon, a.lat - lastWp.lat);
                const brgB = Math.atan2(b.lon - lastWp.lon, b.lat - lastWp.lat);
                return brgA - brgB;
            });
            const line = new L.Polyline(
                sorted.map(p => [p.lat, p.lon] as [number, number]),
                { color: '#888', weight: 1, opacity: 0.3 },
            ).addTo(map);
            isochroneLines.push(line);
        }
    }

    function toggleIsochroneDisplay(show: boolean) {
        showIsochrones = show;
        // Remove existing isochrone-only lines and redraw
        if (routeResult) {
            clearRouteDisplay();
            drawOptimalRoute(routeResult);
        }
    }

    function clearRouteDisplay() {
        if (optimalRoutePolyline) {
            optimalRoutePolyline.remove();
            optimalRoutePolyline = null;
        }
        for (const l of isochroneLines) l.remove();
        isochroneLines = [];
    }

    function windSpeedColor(tws: number): string {
        // Blue (light wind) → Green (moderate) → Red (strong)
        if (tws < 8) return '#4dc9f6';
        if (tws < 15) return '#4caf50';
        if (tws < 25) return '#ff9800';
        return '#f44336';
    }

    // --- Cleanup ---
    function removeAllMapLayers() {
        for (const m of waypointMarkers) m.remove();
        waypointMarkers = [];
        if (routePolyline) {
            routePolyline.remove();
            routePolyline = null;
        }
        clearRouteDisplay();
    }

    // --- Lifecycle ---
    export const onopen = (params?: LatLon) => {
        // Load saved waypoints
        const saved = loadWaypoints();
        if (saved.length > 0) {
            waypoints = saved;
        }

        // If opened from context menu with lat/lon, add as waypoint
        if (params && 'lat' in params && 'lon' in params) {
            waypoints = [...waypoints, { lat: params.lat, lon: params.lon, name: `WPT ${waypoints.length + 1}` }];
            saveWaypoints(waypoints);
        }
    };

    onMount(() => {
        singleclick.on(name, onMapClick);
    });

    onDestroy(() => {
        singleclick.off(name, onMapClick);
        removeAllMapLayers();
    });
</script>

<style lang="less">
    .main-tabs {
        display: flex;
        gap: 2px;
        border-bottom: 2px solid #444;
        padding-bottom: 0;
    }
    .main-tab {
        padding: 6px 10px;
        border-radius: 4px 4px 0 0;
        color: #aaa;
        font-size: 12px;
        white-space: nowrap;
        &:hover {
            color: #fff;
            background: rgba(255,255,255,0.05);
        }
    }
    .main-tab--active {
        color: #fff;
        background: #333;
        font-weight: bold;
        border-bottom: 2px solid darkorange;
        margin-bottom: -2px;
    }
    .error-text {
        color: #f44336;
    }
    hr {
        border: none;
        border-top: 1px solid #444;
    }
</style>

