<div class="waypoint-panel">
    <div class="mb-10">
        <button
            class="button size-xs"
            class:button--variant-orange={addingMode}
            class:button--variant-ghost={!addingMode}
            on:click={toggleAddMode}
        >
            {addingMode ? $t('wp.addMode') : $t('wp.add')}
        </button>
        {#if waypoints.length > 1}
            <button class="button button--variant-ghost size-xs ml-5" on:click={reverseRoute}>{$t('wp.reverse')}</button>
        {/if}
        {#if waypoints.length > 0}
            <button class="button button--variant-ghost size-xs ml-5" on:click={clearAll}>{$t('wp.clear')}</button>
        {/if}
    </div>

    {#if waypoints.length === 0}
        <p class="size-xs fg-grey">{$t('wp.empty')}</p>
    {:else}
        <div class="waypoint-list">
            {#each waypoints as wp, i}
                <div class="waypoint-item size-xs mb-5">
                    <span class="wp-index">{i + 1}</span>
                    <div class="wp-info">
                        <input
                            class="wp-name"
                            type="text"
                            value={wp.name || `WPT ${i + 1}`}
                            on:change={e => renameWaypoint(i, e)}
                        />
                        <span class="wp-coords fg-grey">
                            {formatCoord(wp.lat, wp.lon)}
                        </span>
                    </div>
                    {#if i > 0}
                        <span class="wp-dist fg-grey">{distances[i - 1].toFixed(1)} nm</span>
                    {/if}
                    <button class="wp-delete clickable" on:click={() => removeWaypoint(i)}>✕</button>
                </div>
            {/each}
        </div>
        {#if waypoints.length > 1}
            <div class="route-summary mt-10 size-xs">
                <strong>{$t('wp.total', { dist: totalDistance.toFixed(1) })}</strong>
                {$t('wp.summary', { wpts: waypoints.length, legs: waypoints.length - 1 })}
            </div>
        {/if}
    {/if}
</div>

<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { Waypoint } from '../types/routing';
    import { totalRouteDistance, legDistances, formatLatLon } from '../lib/waypoints';
    import { t } from '../lib/i18n';

    const dispatch = createEventDispatcher<{
        change: Waypoint[];
        addModeChange: boolean;
    }>();

    export let waypoints: Waypoint[] = [];
    export let addingMode = false;

    $: distances = legDistances(waypoints);
    $: totalDistance = totalRouteDistance(waypoints);

    function toggleAddMode() {
        addingMode = !addingMode;
        dispatch('addModeChange', addingMode);
    }

    export function addWaypoint(lat: number, lon: number) {
        waypoints = [...waypoints, { lat, lon, name: `WPT ${waypoints.length + 1}` }];
        dispatch('change', waypoints);
    }

    function removeWaypoint(index: number) {
        waypoints = waypoints.filter((_, i) => i !== index);
        dispatch('change', waypoints);
    }

    function renameWaypoint(index: number, e: Event) {
        const name = (e.target as HTMLInputElement).value;
        waypoints[index] = { ...waypoints[index], name };
        waypoints = waypoints;
        dispatch('change', waypoints);
    }

    function reverseRoute() {
        waypoints = [...waypoints].reverse();
        dispatch('change', waypoints);
    }

    function clearAll() {
        waypoints = [];
        addingMode = false;
        dispatch('addModeChange', false);
        dispatch('change', waypoints);
    }

    function formatCoord(lat: number, lon: number): string {
        return formatLatLon(lat, lon);
    }
</script>

<style lang="less">
    .waypoint-panel {
        font-size: 12px;
    }
    .waypoint-list {
        max-height: 300px;
        overflow-y: auto;
    }
    .waypoint-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border-radius: 4px;
        background: rgba(255,255,255,0.04);
        &:hover {
            background: rgba(255,255,255,0.08);
        }
    }
    .wp-index {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: darkorange;
        color: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 10px;
        flex-shrink: 0;
    }
    .wp-info {
        flex: 1;
        min-width: 0;
    }
    .wp-name {
        background: transparent;
        border: none;
        color: #eee;
        font-size: 12px;
        font-weight: bold;
        width: 100%;
        padding: 0;
        &:focus {
            outline: 1px solid darkorange;
            border-radius: 2px;
        }
    }
    .wp-coords {
        display: block;
        font-size: 10px;
    }
    .wp-dist {
        font-size: 10px;
        white-space: nowrap;
    }
    .wp-delete {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 14px;
        padding: 0 2px;
        &:hover {
            color: #f44;
        }
    }
    .route-summary {
        padding: 6px 8px;
        background: rgba(255,165,0,0.1);
        border-radius: 4px;
        border-left: 3px solid darkorange;
    }
    .ml-5 {
        margin-left: 5px;
    }
</style>
