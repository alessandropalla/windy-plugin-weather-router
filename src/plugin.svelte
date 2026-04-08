
<script context="module" lang="ts">
    // Route overlays should survive plugin panel close/reopen.
    let persistedRouteLayers: L.Layer[] = [];

    function safeRemoveLayer(layer: L.Layer | null | undefined) {
        if (!layer) return;
        if ((layer as any)._map) {
            layer.remove();
        }
    }

    function rememberRouteLayer(layer: L.Layer) {
        persistedRouteLayers.push(layer);
    }

    function clearPersistedRouteLayers() {
        for (const layer of persistedRouteLayers) safeRemoveLayer(layer);
        persistedRouteLayers = [];
    }
</script>

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
        <span class="main-tab clickable" class:main-tab--active={activeTab === 'route'} on:click={() => activeTab = 'route'}>{$t('tab.route')}</span>
        <span class="main-tab clickable" class:main-tab--active={activeTab === 'polars'} on:click={() => activeTab = 'polars'}>{$t('tab.polars')}</span>
        <span class="main-tab clickable" class:main-tab--active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>{$t('tab.settings')}</span>
        <span class="main-tab clickable" class:main-tab--active={activeTab === 'results'} on:click={() => activeTab = 'results'}>{$t('tab.results')}</span>
    </div>

    <!-- Tab content -->
    {#if activeTab === 'route'}
        <p class="size-xs fg-grey mb-10">
            {$t('route.hint')}
        </p>
        <WaypointPanel
            bind:this={waypointPanel}
            bind:waypoints={waypoints}
            bind:addingMode={waypointAddMode}
            on:change={onWaypointsChange}
            on:addModeChange={e => waypointAddMode = e.detail}
        />

        <hr class="mt-15 mb-15" />

        <!-- No-Go Zones -->
        <h4 class="size-s mb-5">{$t('nogo.title')}</h4>
        {#if drawingNoGoZone}
            <p class="size-xs fg-grey mb-5">
                {$t('nogo.drawing', { count: currentNoGoVertices.length })}
            </p>
            <div class="nogo-btn-row mb-10">
                <button class="button button--variant-green size-xs" disabled={currentNoGoVertices.length < 3} on:click={finishNoGoZone}>
                    {$t('nogo.finish')}
                </button>
                <button class="button size-xs" on:click={cancelNoGoZone}>
                    {$t('nogo.cancel')}
                </button>
            </div>
        {:else}
            <button class="button size-xs mb-5" on:click={startDrawingNoGoZone}>
                {$t('nogo.draw')}
            </button>
        {/if}

        {#if noGoZones.length > 0}
            <div class="nogo-list mb-10">
                {#each noGoZones as zone}
                    <div class="nogo-item">
                        <span class="size-xs nogo-name">🚫 {zone.name} ({$t('nogo.pts', { count: zone.vertices.length })})</span>
                        <button class="nogo-remove" on:click={() => removeNoGoZone(zone.id)} title="Remove zone">✕</button>
                    </div>
                {/each}
                <button class="button size-xs mt-5" on:click={clearAllNoGoZones}>
                    {$t('nogo.clearAll')}
                </button>
            </div>
        {/if}

        <hr class="mt-15 mb-15" />

        <!-- Compute button -->
        <button
            class="button button--variant-orange"
            class:button--loading={computing}
            disabled={computing}
            on:click={runRouting}
        >
            {computing ? $t('btn.computing') : $t('btn.compute')}
        </button>

        {#if !canCompute && !computing}
            <p class="size-xs fg-grey mt-5">
                {#if waypoints.length < 2}
                    {$t('compute.noWaypoints')}
                {:else if !currentPolar}
                    {$t('compute.noPolar')}
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
            value={settingsCache}
            on:change={onSettingsChange}
        />

    {:else if activeTab === 'results'}
        <ResultsPanel
            result={routeResult}
            alternativeResults={alternativeResults}
            alternativesRequested={Boolean(settingsCache.routeAlternatives)}
            useLocalTime={Boolean(settingsCache.useLocalTime)}
            animating={animPlaying}
            on:toggleIsochrones={onToggleIsochrones}
            on:exportRoute={onExportRoute}
            on:animationControl={onAnimationControl}
            on:selectPrimaryRoute={onSelectPrimaryRoute}
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
    import type { Waypoint, RouteConfig, RouteResult, IsochronePoint, NoGoZone, RoutingProgress, OptimizationMode } from './types/routing';
    import type { WindGrid } from './lib/windgrid';
    import { fetchWindGrid, fetchElevationGrid } from './lib/windgrid';
    import type { ElevationGrid } from './lib/windgrid';
    import { computeRoute, computeRouteWithDepartureOptimization } from './lib/routing';
    import { saveWaypoints, loadWaypoints } from './lib/waypoints';

    import type { LatLon } from '@windy/interfaces';
    import { t, tGet, initLocale } from './lib/i18n';

    const { title, name } = config;
    const SETTINGS_STORAGE_KEY = 'windy-router-settings';
    const ALT_OBJECTIVE_MODES: OptimizationMode[] = [
        'min-time',
        'min-motoring',
        'comfort-balanced',
        'min-max-wind',
        'min-wave-exposure',
    ];

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
        maxWindLimitKt: 25,
        maxWaveHeightM: 0,
        routeAlternatives: false,
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

    // Route alternatives
    let alternativeResults: RouteResult[] = [];
    let alternativePolylines: L.Polyline[][] = [];
    const ALT_COLORS = ['#6ab0de', '#9b8dc7'];

    // Animation
    let animTimer: ReturnType<typeof setInterval> | null = null;
    let animMarker: L.Marker | null = null;
    let animPlaying = false;

    // No-Go Zones
    let noGoZones: NoGoZone[] = [];
    let drawingNoGoZone = false;
    let currentNoGoVertices: { lat: number; lon: number }[] = [];
    let noGoMapPolygons: L.Polygon[] = [];
    let noGoDrawPolyline: L.Polyline | null = null;
    const NOGO_STORAGE_KEY = 'windy-router-nogo-zones';

    $: canCompute = waypoints.length >= 2 && currentPolar !== null;

    // --- Reactive: redraw map layers when waypoints change ---
    $: drawWaypointMarkers(waypoints);
    $: drawReferenceLine(waypoints);

    // --- Reactive: crosshair cursor while placing waypoints or drawing no-go zones ---
    $: map?.getContainer?.()?.classList.toggle('router-crosshair', waypointAddMode || drawingNoGoZone);

    function onWaypointsChange(e: CustomEvent<Waypoint[]>) {
        waypoints = e.detail;
        saveWaypoints(waypoints);
        // Computed route is now stale — clear it from the map
        clearRouteDisplay();
        routeResult = null;
        alternativeResults = [];
    }

    function onSettingsChange(e: CustomEvent) {
        settingsCache = e.detail;
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsCache));
    }

    function loadSavedSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<RouteConfig> & {
                motor?: Partial<typeof DEFAULT_MOTOR_CONFIG>;
            };
            settingsCache = {
                ...settingsCache,
                ...parsed,
                motor: {
                    ...DEFAULT_MOTOR_CONFIG,
                    ...(parsed.motor || {}),
                },
            };
        } catch {
            // Ignore invalid stored data.
        }
    }

    // --- Map click handler ---
    function onMapClick(latLon: LatLon) {
        if (drawingNoGoZone) {
            currentNoGoVertices = [...currentNoGoVertices, { lat: latLon.lat, lon: latLon.lon }];
            drawNoGoPreview();
            return;
        }
        if (!waypointAddMode || !waypointPanel) return;
        waypointPanel.addWaypoint(latLon.lat, latLon.lon);
    }

    // --- Waypoint markers on map ---
    function drawWaypointMarkers(wps: Waypoint[]) {
        // Remove old markers
        for (const m of waypointMarkers) m.remove();
        waypointMarkers = [];

        for (let i = 0; i < wps.length; i++) {
            const wp = wps[i];
            const primaryIcon = markers?.pulsatingIcon;
            const secondaryIcon = markers?.myLocationIcon || primaryIcon;
            const icon = i === 0 ? primaryIcon : secondaryIcon;
            const marker = new L.Marker(
                { lat: wp.lat, lng: wp.lon },
                icon ? { icon, draggable: true } : { draggable: true },
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

    // --- No-Go Zone functions ---
    function startDrawingNoGoZone() {
        drawingNoGoZone = true;
        waypointAddMode = false;
        currentNoGoVertices = [];
    }

    function finishNoGoZone() {
        if (currentNoGoVertices.length < 3) {
            drawingNoGoZone = false;
            currentNoGoVertices = [];
            removeNoGoPreview();
            return;
        }
        const zone: NoGoZone = {
            id: `nogo-${Date.now()}`,
            name: `Zone ${noGoZones.length + 1}`,
            vertices: [...currentNoGoVertices],
        };
        noGoZones = [...noGoZones, zone];
        drawingNoGoZone = false;
        currentNoGoVertices = [];
        removeNoGoPreview();
        drawNoGoZonesOnMap();
        saveNoGoZones();
    }

    function cancelNoGoZone() {
        drawingNoGoZone = false;
        currentNoGoVertices = [];
        removeNoGoPreview();
    }

    function removeNoGoZone(id: string) {
        noGoZones = noGoZones.filter(z => z.id !== id);
        drawNoGoZonesOnMap();
        saveNoGoZones();
    }

    function clearAllNoGoZones() {
        noGoZones = [];
        drawNoGoZonesOnMap();
        saveNoGoZones();
    }

    function drawNoGoPreview() {
        removeNoGoPreview();
        if (currentNoGoVertices.length < 2) return;
        noGoDrawPolyline = new L.Polyline(
            currentNoGoVertices.map(v => [v.lat, v.lon] as [number, number]),
            { color: '#f44336', weight: 2, opacity: 0.7, dashArray: '6,4' },
        ).addTo(map);
    }

    function removeNoGoPreview() {
        if (noGoDrawPolyline) {
            noGoDrawPolyline.remove();
            noGoDrawPolyline = null;
        }
    }

    function drawNoGoZonesOnMap() {
        for (const p of noGoMapPolygons) p.remove();
        noGoMapPolygons = [];
        for (const zone of noGoZones) {
            if (zone.vertices.length < 3) continue;
            const polygon = new L.Polygon(
                [zone.vertices.map(v => [v.lat, v.lon] as [number, number])],
                { color: '#f44336', fillColor: '#f44336', fillOpacity: 0.2, weight: 2 },
            ).addTo(map);
            polygon.bindTooltip(zone.name, { permanent: false });
            noGoMapPolygons.push(polygon);
        }
    }

    function saveNoGoZones() {
        localStorage.setItem(NOGO_STORAGE_KEY, JSON.stringify(noGoZones));
    }

    function loadNoGoZones() {
        try {
            const raw = localStorage.getItem(NOGO_STORAGE_KEY);
            if (!raw) return;
            noGoZones = JSON.parse(raw) as NoGoZone[];
            drawNoGoZonesOnMap();
        } catch {
            // Ignore
        }
    }

    // --- Routing helpers ---
    function runRoutingTask(
        routeConfig: RouteConfig,
        windGrid: WindGrid,
        elevationGrid: ElevationGrid,
        onProgress?: (p: RoutingProgress) => void,
    ): Promise<RouteResult> {
        return new Promise<RouteResult>((resolve, reject) => {
            setTimeout(() => {
                try {
                    const r = routeConfig.optimizeDeparture
                        ? computeRouteWithDepartureOptimization(waypoints, routeConfig, windGrid, onProgress, elevationGrid, noGoZones)
                        : computeRoute(waypoints, routeConfig, windGrid, onProgress, elevationGrid, noGoZones);
                    resolve(r);
                } catch (e) {
                    reject(e);
                }
            }, 50);
        });
    }

    // --- Routing ---
    async function runRouting() {
        if (waypoints.length < 2) {
            errorMsg = tGet('error.noWaypoints');
            return;
        }

        if (!currentPolar) {
            errorMsg = tGet('error.noPolar');
            activeTab = 'polars';
            return;
        }

        computing = true;
        progressMsg = tGet('progress.fetchingWind');
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
                    progressMsg = tGet('progress.fetchingWindN', { fetched, total });
                },
            );

            // Fetch elevation grid for land avoidance
            progressMsg = tGet('progress.fetchingElev');
            const elevationGrid: ElevationGrid = await fetchElevationGrid(
                waypoints,
                60,
                0.1,
                (fetched, total) => {
                    progressMsg = tGet('progress.fetchingElevN', { fetched, total });
                },
            );

            progressMsg = tGet('progress.isochrone');

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
                maxWindLimitKt: settings.maxWindLimitKt ?? 25,
                maxWaveHeightM: settings.maxWaveHeightM ?? 0,
                routeAlternatives: settings.routeAlternatives || false,
                boat: {
                    polar: currentPolar,
                    motor: settings.motor || DEFAULT_MOTOR_CONFIG,
                },
            };

            // Primary route
            progressMsg = tGet('progress.isochrone');
            const result = await runRoutingTask(routeConfig, windGrid, elevationGrid, p => {
                progressMsg = p.message;
            });

            routeResult = {
                ...result,
                variantLabel: 'Primary',
            };
            drawOptimalRoute(result);

            // Alternative routes (compare optimization objectives)
            alternativeResults = [];
            clearAlternativeRoutes();
            if (routeConfig.routeAlternatives) {
                const altModes = ALT_OBJECTIVE_MODES.filter(m => m !== result.optimizationMode);
                for (const altMode of altModes) {
                    progressMsg = tGet('progress.alternative', { mode: altMode });
                    try {
                        // Alternatives isolate objective differences.
                        // When departure optimization is enabled, each objective gets its own best departure.
                        // Otherwise all routes use the same departure timestamp.
                        const altConfig: RouteConfig = {
                            ...routeConfig,
                            mode: altMode,
                            arrivalDeadline: undefined,
                            routeAlternatives: false,
                        };
                        if (!routeConfig.optimizeDeparture) {
                            altConfig.departureTime = result.departureTime;
                            altConfig.optimizeDeparture = false;
                        }
                        const altResult = await runRoutingTask(altConfig, windGrid, elevationGrid);
                        alternativeResults = [
                            ...alternativeResults,
                            {
                                ...altResult,
                                variantLabel: `Objective: ${altResult.optimizationLabel}`,
                            },
                        ];
                    } catch {
                        // skip failed alternative objective
                    }
                }
                drawAlternativeRoutes(alternativeResults);
            }
            progressMsg = '';
            activeTab = 'results';
        } catch (e) {
            errorMsg = tGet('error.routingFailed', { msg: (e as Error).message });
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
                ? '#9c27b0' // purple for motoring
                : windSpeedColor(curr.tws);

            const segment = new L.Polyline(
                [[prev.lat, prev.lon], [curr.lat, curr.lon]],
                { color, weight: 3, opacity: 0.9 },
            ).addTo(map);

            segment.bindPopup(
                `<b>${new Date(curr.time).toUTCString()}</b><br/>` +
                `${tGet('popup.speed')}: ${curr.boatSpeed.toFixed(1)} kt<br/>` +
                `${tGet('popup.wind')}: ${curr.tws.toFixed(0)} kt @ ${curr.twd.toFixed(0)}°<br/>` +
                `${tGet('popup.waves')}: ${curr.waveHeight.toFixed(1)} m @ ${curr.waveDir.toFixed(0)}° (${curr.wavePeriod.toFixed(1)} s)<br/>` +
                `${tGet('popup.twa')}: ${curr.twa.toFixed(0)}°<br/>` +
                `${curr.isMotoring ? tGet('popup.motoring') : tGet('popup.sailing')}`,
            );

            isochroneLines.push(segment); // reuse array for cleanup
            rememberRouteLayer(segment);
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
            rememberRouteLayer(line);
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

    function onToggleIsochrones(e: CustomEvent<boolean>) {
        toggleIsochroneDisplay(e.detail);
    }

    function onExportRoute(e: CustomEvent<'gpx' | 'csv' | 'geojson'>) {
        exportRoute(e.detail);
    }

    function onAnimationControl(e: CustomEvent<{ playing: boolean; speed: number }>) {
        handleAnimationControl(e.detail.playing, e.detail.speed);
    }

    function onSelectPrimaryRoute(e: CustomEvent<{ alternativeIndex: number }>) {
        selectPrimaryRouteVariant(e.detail.alternativeIndex);
    }

    // --- Alternative routes ---
    function clearAlternativeRoutes() {
        for (const group of alternativePolylines) for (const l of group) safeRemoveLayer(l);
        alternativePolylines = [];
    }

    function drawAlternativeRoutes(alts: RouteResult[]) {
        clearAlternativeRoutes();
        for (let ai = 0; ai < alts.length; ai++) {
            const color = ALT_COLORS[ai % ALT_COLORS.length];
            const lines: L.Polyline[] = [];
            const path = alts[ai].optimalPath;
            for (let i = 1; i < path.length; i++) {
                const line = new L.Polyline(
                    [[path[i - 1].lat, path[i - 1].lon], [path[i].lat, path[i].lon]],
                    { color, weight: 2, opacity: 0.55, dashArray: '8,5' },
                ).addTo(map);
                lines.push(line);
                rememberRouteLayer(line);
            }
            alternativePolylines.push(lines);
        }
    }

    function selectPrimaryRouteVariant(alternativeIndex: number) {
        if (!routeResult || alternativeIndex < 0 || alternativeIndex >= alternativeResults.length) {
            return;
        }

        const selectedAlternative = alternativeResults[alternativeIndex];
        const previousPrimary = routeResult;
        const remainingAlternatives = alternativeResults.filter((_, i) => i !== alternativeIndex);

        routeResult = {
            ...selectedAlternative,
            variantLabel: 'Primary',
        };

        const previousPrimaryVariantLabel =
            previousPrimary.variantLabel && previousPrimary.variantLabel !== 'Primary'
                ? previousPrimary.variantLabel
                : `Objective: ${previousPrimary.optimizationLabel}`;

        alternativeResults = [
            {
                ...previousPrimary,
                variantLabel: previousPrimaryVariantLabel,
            },
            ...remainingAlternatives,
        ];

        drawOptimalRoute(routeResult);
        drawAlternativeRoutes(alternativeResults);
    }

    // --- Animation ---
    function handleAnimationControl(playing: boolean, speed: number) {
        stopAnimation();
        if (!playing || !routeResult || routeResult.optimalPath.length < 2) return;

        const path = routeResult.optimalPath;
        let idx = 0;
        animPlaying = true;

        animMarker = new L.Marker(
            [path[0].lat, path[0].lon],
            {
                icon: L.divIcon({
                    className: '',
                    html: '<div style="width:16px;height:16px;border-radius:50%;background:#ff9800;border:2px solid #fff;"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                }),
                zIndexOffset: 1000,
            },
        ).addTo(map);
        animMarker.bindTooltip(formatAnimTime(path[0].time), { permanent: true, direction: 'top' });
        store.set('timestamp', path[0].time);

        const intervalMs = Math.max(10, Math.round(10000 / speed));
        animTimer = setInterval(() => {
            idx++;
            if (idx >= path.length) {
                stopAnimation();
                return;
            }
            animMarker?.setLatLng([path[idx].lat, path[idx].lon]);
            animMarker?.getTooltip()?.setContent(formatAnimTime(path[idx].time));
            store.set('timestamp', path[idx].time);
        }, intervalMs);
    }

    function stopAnimation() {
        if (animTimer !== null) {
            clearInterval(animTimer);
            animTimer = null;
        }
        if (animMarker) {
            safeRemoveLayer(animMarker);
            animMarker = null;
        }
        animPlaying = false;
    }

    function formatAnimTime(ts: number): string {
        const d = new Date(ts);
        return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
    }

    function clearRouteDisplay() {
        clearPersistedRouteLayers();
        if (optimalRoutePolyline) {
            safeRemoveLayer(optimalRoutePolyline);
            optimalRoutePolyline = null;
        }
        for (const l of isochroneLines) safeRemoveLayer(l);
        isochroneLines = [];
        clearAlternativeRoutes();
        stopAnimation();
    }

    function windSpeedColor(tws: number): string {
        // Blue (light wind) → Green (moderate) → Red (strong)
        if (tws < 8) return '#4dc9f6';
        if (tws < 15) return '#4caf50';
        if (tws < 25) return '#ff9800';
        return '#f44336';
    }

    function exportRoute(format: 'gpx' | 'csv' | 'geojson') {
        if (!routeResult || routeResult.optimalPath.length < 2) {
            errorMsg = tGet('error.noRoute');
            return;
        }

        const route = routeResult.optimalPath;
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');

        if (format === 'gpx') {
            const content = routeToGPX(route);
            downloadTextFile(`weather-route-${stamp}.gpx`, content, 'application/gpx+xml');
            return;
        }

        if (format === 'csv') {
            const content = routeToCSV(route);
            downloadTextFile(`weather-route-${stamp}.csv`, content, 'text/csv');
            return;
        }

        const content = routeToGeoJSON(route);
        downloadTextFile(`weather-route-${stamp}.geojson`, content, 'application/geo+json');
    }

    function routeToCSV(route: IsochronePoint[]): string {
        const header = [
            'index',
            'timestamp_iso',
            'lat',
            'lon',
            'boat_speed_kt',
            'wind_speed_kt',
            'wind_dir_deg',
            'wave_height_m',
            'wave_dir_deg',
            'wave_period_s',
            'twa_deg',
            'is_motoring',
        ].join(',');

        const lines = route.map((p, i) => [
            i,
            new Date(p.time).toISOString(),
            p.lat.toFixed(6),
            p.lon.toFixed(6),
            p.boatSpeed.toFixed(2),
            p.tws.toFixed(2),
            p.twd.toFixed(1),
            p.waveHeight.toFixed(2),
            p.waveDir.toFixed(1),
            p.wavePeriod.toFixed(2),
            p.twa.toFixed(1),
            p.isMotoring ? '1' : '0',
        ].join(','));

        return [header, ...lines].join('\n');
    }

    function routeToGPX(route: IsochronePoint[]): string {
        const rtePoints = route.map((p, i) => `
    <rtept lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">
      <name>WP ${i + 1}</name>
      <time>${new Date(p.time).toISOString()}</time>
            <desc>Boat ${p.boatSpeed.toFixed(1)}kt, Wind ${p.tws.toFixed(1)}kt @ ${p.twd.toFixed(0)}deg, Waves ${p.waveHeight.toFixed(1)}m @ ${p.waveDir.toFixed(0)}deg (${p.wavePeriod.toFixed(1)}s), ${p.isMotoring ? 'Motoring' : 'Sailing'}</desc>
    </rtept>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Windy Weather Router" xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <name>Weather Route</name>${rtePoints}
  </rte>
</gpx>`;
    }

    function routeToGeoJSON(route: IsochronePoint[]): string {
        const featureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        name: 'Weather Route',
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: route.map(p => [Number(p.lon.toFixed(6)), Number(p.lat.toFixed(6))]),
                    },
                },
            ],
        };

        return JSON.stringify(featureCollection, null, 2);
    }

    function downloadTextFile(fileName: string, content: string, mimeType: string) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    // --- Cleanup ---
    function removeAllMapLayers({ keepRouteDisplay = false }: { keepRouteDisplay?: boolean } = {}) {
        for (const m of waypointMarkers) m.remove();
        waypointMarkers = [];
        if (routePolyline) {
            routePolyline.remove();
            routePolyline = null;
        }
        if (!keepRouteDisplay) {
            clearRouteDisplay(); // also clears alternatives, laylines, animation
        } else {
            stopAnimation();
        }
        for (const p of noGoMapPolygons) p.remove();
        noGoMapPolygons = [];
        removeNoGoPreview();
    }

    // --- Lifecycle ---
    export const onopen = (params?: LatLon) => {
        loadSavedSettings();
        loadNoGoZones();

        // Load saved waypoints
        const saved = loadWaypoints();
        if (saved.length > 0) {
            waypoints = saved;
        }

        activeTab = 'route';

        // If opened from context menu with lat/lon, add as waypoint
        if (params && 'lat' in params && 'lon' in params) {
            waypoints = [...waypoints, { lat: params.lat, lon: params.lon, name: `WPT ${waypoints.length + 1}` }];
            saveWaypoints(waypoints);
            waypointAddMode = true;
        }
    };

    onMount(() => {
        initLocale();
        singleclick.on(name, onMapClick);
        drawNoGoZonesOnMap(); // render zones already loaded by onopen
    });

    onDestroy(() => {
        singleclick.off(name, onMapClick);
        removeAllMapLayers({ keepRouteDisplay: true });
    });
</script>

<style lang="less">
    :global(.router-crosshair),
    :global(.router-crosshair *) {
        cursor: crosshair !important;
    }
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
    .nogo-btn-row {
        display: flex;
        gap: 6px;
    }
    .nogo-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .nogo-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 3px 6px;
        background: rgba(244, 67, 54, 0.1);
        border-radius: 4px;
    }
    .nogo-name {
        color: #f44336;
    }
    .nogo-remove {
        background: none;
        border: none;
        color: #f44336;
        cursor: pointer;
        font-size: 14px;
        padding: 0 4px;
        &:hover {
            color: #ff7961;
        }
    }
</style>

