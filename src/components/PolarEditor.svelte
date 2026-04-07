<div class="polar-editor">
    <div class="polar-tabs mb-10">
        <span class="tab clickable" class:tab--active={activeTab === 'wizard'} on:click={() => activeTab = 'wizard'}>✨ Wizard</span>
        <span class="tab clickable" class:tab--active={activeTab === 'manage'} on:click={() => activeTab = 'manage'}>Manage</span>
        <span class="tab clickable" class:tab--active={activeTab === 'import'} on:click={() => activeTab = 'import'}>Import</span>
        <span class="tab clickable" class:tab--active={activeTab === 'edit'} on:click={() => activeTab = 'edit'}>Edit</span>
        <span class="tab clickable" class:tab--active={activeTab === 'plot'} on:click={() => activeTab = 'plot'}>Plot</span>
    </div>

    {#if activeTab === 'wizard'}
        <BoatWizard
            onComplete={handleWizardComplete}
            onCancel={() => activeTab = 'manage'}
        />

    {:else if activeTab === 'manage'}
        <div class="mb-10">
            <label class="size-s">Select Polar:</label>
            <select class="form-control mt-5" bind:value={selectedPolarName} on:change={onSelectPolar}>
                <option value="">-- none --</option>
                {#each polarNames as name}
                    <option value={name}>{name}</option>
                {/each}
            </select>
        </div>
        <div class="button-row mb-10">
            <button class="button button--variant-ghost size-xs" on:click={createNew}>New</button>
            <button class="button button--variant-ghost size-xs" on:click={loadExample}>Load Example</button>
            {#if selectedPolarName}
                <button class="button button--variant-ghost size-xs" on:click={renameSelected}>Rename</button>
                <button class="button button--variant-ghost size-xs" on:click={deleteSelected}>Delete</button>
                <button class="button button--variant-ghost size-xs" on:click={exportCSV}>Export CSV</button>
            {/if}
        </div>
        {#if polar}
            <div class="size-xs fg-grey mt-5">
                {polar.twaValues.length} TWA × {polar.twsValues.length} TWS breakpoints
            </div>
        {/if}

    {:else if activeTab === 'import'}
        <div class="mb-10">
            <label class="size-s">Boat Name:</label>
            <input class="form-control mt-5" type="text" bind:value={importName} placeholder="e.g. J/105" />
        </div>
        <div class="mb-10">
            <label class="size-s">Import .pol / .csv file:</label>
            <input class="mt-5" type="file" accept=".pol,.csv,.txt,.tsv" on:change={onFileImport} />
        </div>
        <div class="mb-10">
            <label class="size-s">Or paste polar data:</label>
            <textarea class="form-control mt-5" rows="8" bind:value={pasteText} placeholder="TWA/TWS  6  8  10  12  ...&#10;30       3.2  4.1  5.0  ..."></textarea>
        </div>
        <button class="button button--variant-orange size-xs" on:click={importFromPaste}>Import Pasted Data</button>
        {#if importError}
            <div class="error-msg mt-5 size-xs">{importError}</div>
        {/if}

    {:else if activeTab === 'edit'}
        {#if polar}
            <div class="polar-table-wrap">
                <table class="polar-table size-xs">
                    <thead>
                        <tr>
                            <th>TWA\TWS</th>
                            {#each polar.twsValues as tws}
                                <th>{tws}</th>
                            {/each}
                        </tr>
                    </thead>
                    <tbody>
                        {#each polar.twaValues as twa, ti}
                            <tr>
                                <td class="row-header">{twa}°</td>
                                {#each polar.twsValues as _, si}
                                    <td
                                        class="speed-cell"
                                        style="background-color: {speedColor(polar.speeds[ti][si])}"
                                    >
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            class="cell-input"
                                            value={polar.speeds[ti][si]}
                                            on:change={e => onCellChange(ti, si, e)}
                                        />
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {:else}
            <p class="size-s fg-grey">No polar loaded. Select or create one in Manage tab.</p>
        {/if}

    {:else if activeTab === 'plot'}
        {#if polar}
            <svg bind:this={svgEl} class="polar-svg" viewBox="-120 -120 240 240"></svg>
        {:else}
            <p class="size-s fg-grey">No polar loaded.</p>
        {/if}
    {/if}
</div>

<script lang="ts">
    import { onMount } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    import type { PolarDiagram, BoatConfig } from '../types/polar';
    import {
        parsePolarCSV,
        createEmptyPolar,
        getExamplePolar,
        savePolar,
        loadAllPolars,
        deletePolar,
        polarToCSV,
    } from '../lib/polar';
    import BoatWizard from './BoatWizard.svelte';

    const dispatch = createEventDispatcher<{ change: PolarDiagram | null }>();

    export let polar: PolarDiagram | null = null;

    let activeTab: 'wizard' | 'manage' | 'import' | 'edit' | 'plot' = 'manage';
    let selectedPolarName = '';
    let polarNames: string[] = [];
    let importName = '';
    let pasteText = '';
    let importError = '';
    let svgEl: SVGSVGElement;

    const SELECTED_POLAR_KEY = 'windy-router-selected-polar';

    onMount(() => {
        refreshPolarList();
        // Restore previously selected polar
        const savedPolarName = localStorage.getItem(SELECTED_POLAR_KEY);
        if (savedPolarName) {
            selectedPolarName = savedPolarName;
            onSelectPolar();
        }
    });

    function refreshPolarList() {
        const all = loadAllPolars();
        polarNames = Object.keys(all);
    }

    function onSelectPolar() {
        if (!selectedPolarName) {
            polar = null;
        } else {
            const all = loadAllPolars();
            polar = all[selectedPolarName] ?? null;
        }
        // Save selection to localStorage
        if (selectedPolarName) {
            localStorage.setItem(SELECTED_POLAR_KEY, selectedPolarName);
        } else {
            localStorage.removeItem(SELECTED_POLAR_KEY);
        }
        dispatch('change', polar);
    }

    function handleWizardComplete(boatConfig: BoatConfig) {
        // Save the polar from the wizard
        savePolar(boatConfig.polar);
        selectedPolarName = boatConfig.polar.name;
        refreshPolarList();
        onSelectPolar();
        activeTab = 'manage';
    }

    function createNew() {
        const name = prompt('Polar name:') || 'Untitled';
        polar = createEmptyPolar(name);
        savePolar(polar);
        selectedPolarName = name;
        refreshPolarList();
        onSelectPolar();
    }

    function loadExample() {
        polar = getExamplePolar();
        savePolar(polar);
        selectedPolarName = polar.name;
        refreshPolarList();
        onSelectPolar();
    }

    function deleteSelected() {
        if (selectedPolarName && confirm(`Delete polar "${selectedPolarName}"?`)) {
            deletePolar(selectedPolarName);
            polar = null;
            selectedPolarName = '';
            localStorage.removeItem(SELECTED_POLAR_KEY);
            refreshPolarList();
            dispatch('change', null);
        }
    }

    function renameSelected() {
        if (!polar || !selectedPolarName) return;
        const nextName = (prompt('New polar name:', selectedPolarName) || '').trim();
        if (!nextName || nextName === selectedPolarName) return;

        deletePolar(selectedPolarName);
        polar = { ...polar, name: nextName };
        savePolar(polar);
        selectedPolarName = nextName;
        refreshPolarList();
        onSelectPolar();
    }

    function exportCSV() {
        if (!polar) return;
        const csv = polarToCSV(polar);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${polar.name}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function onFileImport(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        importError = '';
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const name = importName || file.name.replace(/\.[^.]+$/, '');
                polar = parsePolarCSV(reader.result as string, name);
                savePolar(polar);
                selectedPolarName = polar.name;
                refreshPolarList();
                activeTab = 'edit';
                dispatch('change', polar);
            } catch (err) {
                importError = `Parse error: ${(err as Error).message}`;
            }
        };
        reader.readAsText(file);
    }

    function importFromPaste() {
        importError = '';
        if (!pasteText.trim()) {
            importError = 'Paste some polar data first';
            return;
        }
        try {
            const name = importName || 'Pasted Polar';
            polar = parsePolarCSV(pasteText, name);
            savePolar(polar);
            selectedPolarName = polar.name;
            refreshPolarList();
            activeTab = 'edit';
            dispatch('change', polar);
        } catch (err) {
            importError = `Parse error: ${(err as Error).message}`;
        }
    }

    function onCellChange(twaIdx: number, twsIdx: number, e: Event) {
        if (!polar) return;
        const val = parseFloat((e.target as HTMLInputElement).value) || 0;
        polar.speeds[twaIdx][twsIdx] = Math.max(0, val);
        polar = polar; // trigger reactivity
        savePolar(polar);
        dispatch('change', polar);
    }

    function speedColor(speed: number): string {
        if (speed <= 0) return 'transparent';
        // Hue from red (slow, 0) to green (fast, ~8kt)
        const fraction = Math.min(speed / 8, 1);
        const hue = fraction * 120; // 0=red, 120=green
        return `hsla(${hue}, 70%, 50%, 0.25)`;
    }

    // Draw SVG polar plot reactively
    $: if (svgEl && polar) drawPolarPlot(polar);

    function drawPolarPlot(p: PolarDiagram) {
        if (!svgEl) return;
        svgEl.innerHTML = '';

        const maxSpeed = Math.max(...p.speeds.flat(), 1);
        const scale = 100 / maxSpeed;

        // Draw concentric circles (speed rings)
        for (let s = 2; s <= maxSpeed; s += 2) {
            const r = s * scale;
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '0');
            circle.setAttribute('cy', '0');
            circle.setAttribute('r', String(r));
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', '#555');
            circle.setAttribute('stroke-width', '0.3');
            circle.setAttribute('stroke-dasharray', '2,2');
            svgEl.appendChild(circle);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', '2');
            label.setAttribute('y', String(-r - 1));
            label.setAttribute('font-size', '6');
            label.setAttribute('fill', '#888');
            label.textContent = `${s}kt`;
            svgEl.appendChild(label);
        }

        // Draw radial lines for key TWAs (starboard and port)
        for (const twa of [0, 30, 60, 90, 120, 150, 180]) {
            const theta = twa * Math.PI / 180;
            const xS = Math.sin(theta) * 110;
            const yS = -Math.cos(theta) * 110;
            const xP = -xS;
            const yP = yS;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', '0');
            line.setAttribute('x2', String(xS));
            line.setAttribute('y2', String(yS));
            line.setAttribute('stroke', '#444');
            line.setAttribute('stroke-width', '0.2');
            svgEl.appendChild(line);

            const lineMirror = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineMirror.setAttribute('x1', '0');
            lineMirror.setAttribute('y1', '0');
            lineMirror.setAttribute('x2', String(xP));
            lineMirror.setAttribute('y2', String(yP));
            lineMirror.setAttribute('stroke', '#444');
            lineMirror.setAttribute('stroke-width', '0.2');
            svgEl.appendChild(lineMirror);

            const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            lbl.setAttribute('x', String(xS * 1.05));
            lbl.setAttribute('y', String(yS * 1.05));
            lbl.setAttribute('font-size', '5');
            lbl.setAttribute('fill', '#aaa');
            lbl.setAttribute('text-anchor', 'middle');
            lbl.textContent = `${twa}°`;
            svgEl.appendChild(lbl);

            if (twa !== 0 && twa !== 180) {
                const lblMirror = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                lblMirror.setAttribute('x', String(xP * 1.05));
                lblMirror.setAttribute('y', String(yP * 1.05));
                lblMirror.setAttribute('font-size', '5');
                lblMirror.setAttribute('fill', '#aaa');
                lblMirror.setAttribute('text-anchor', 'middle');
                lblMirror.textContent = `${twa}°`;
                svgEl.appendChild(lblMirror);
            }
        }

        // Draw polar curves for each TWS
        const colors = ['#4dc9f6', '#f67019', '#f53794', '#537bc4', '#acc236',
                         '#166a8f', '#00a950', '#58595b', '#8549ba', '#ff6384'];

        for (let si = 0; si < p.twsValues.length; si++) {
            const points: string[] = [];
            for (let ti = 0; ti < p.twaValues.length; ti++) {
                const speed = p.speeds[ti][si];
                const r = speed * scale;
                const theta = p.twaValues[ti] * Math.PI / 180;
                const x = Math.sin(theta) * r;
                const y = -Math.cos(theta) * r;
                points.push(`${x},${y}`);
            }
            // Mirror for port side, walking back for a closed smooth shape
            for (let ti = p.twaValues.length - 1; ti >= 0; ti--) {
                const speed = p.speeds[ti][si];
                const r = speed * scale;
                const theta = p.twaValues[ti] * Math.PI / 180;
                const x = -Math.sin(theta) * r;
                const y = -Math.cos(theta) * r;
                points.push(`${x},${y}`);
            }

            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('points', points.join(' '));
            polyline.setAttribute('fill', 'rgba(255,255,255,0.03)');
            polyline.setAttribute('stroke', colors[si % colors.length]);
            polyline.setAttribute('stroke-width', '1');
            polyline.setAttribute('opacity', '0.8');
            svgEl.appendChild(polyline);
        }

        // Legend
        for (let si = 0; si < p.twsValues.length; si++) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', String(-115));
            rect.setAttribute('y', String(-115 + si * 10));
            rect.setAttribute('width', '8');
            rect.setAttribute('height', '4');
            rect.setAttribute('fill', colors[si % colors.length]);
            svgEl.appendChild(rect);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(-105));
            text.setAttribute('y', String(-112 + si * 10));
            text.setAttribute('font-size', '5');
            text.setAttribute('fill', '#ccc');
            text.textContent = `${p.twsValues[si]}kt`;
            svgEl.appendChild(text);
        }

        // Wind arrow at top (TWA=0 = upwind)
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        arrow.setAttribute('x', '0');
        arrow.setAttribute('y', '-108');
        arrow.setAttribute('font-size', '8');
        arrow.setAttribute('fill', '#aaa');
        arrow.setAttribute('text-anchor', 'middle');
        arrow.textContent = '↓ WIND';
        svgEl.appendChild(arrow);
    }
</script>

<style lang="less">
    .polar-editor {
        font-size: 12px;
    }
    .polar-tabs {
        display: flex;
        gap: 4px;
        border-bottom: 1px solid #444;
        padding-bottom: 4px;
    }
    .tab {
        padding: 4px 10px;
        border-radius: 4px 4px 0 0;
        color: #aaa;
        &:hover {
            color: #fff;
        }
    }
    .tab--active {
        color: #fff;
        background: #333;
        font-weight: bold;
    }
    .button-row {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }
    .polar-table-wrap {
        overflow-x: auto;
        max-height: 400px;
        overflow-y: auto;
    }
    .polar-table {
        border-collapse: collapse;
        th, td {
            border: 1px solid #444;
            padding: 2px 4px;
            text-align: center;
            white-space: nowrap;
        }
        th {
            background: #333;
            position: sticky;
            top: 0;
            z-index: 1;
        }
        .row-header {
            background: #333;
            font-weight: bold;
            position: sticky;
            left: 0;
            z-index: 1;
        }
    }
    .cell-input {
        width: 42px;
        background: transparent;
        border: none;
        color: inherit;
        text-align: center;
        font-size: 11px;
        &:focus {
            outline: 1px solid darkorange;
        }
    }
    .polar-svg {
        width: 100%;
        max-height: 300px;
    }
    .error-msg {
        color: #f44;
    }
    .form-control {
        width: 100%;
        padding: 4px 8px;
        background: #222;
        border: 1px solid #444;
        color: #eee;
        border-radius: 4px;
    }
    textarea.form-control {
        resize: vertical;
        font-family: monospace;
        font-size: 11px;
    }
</style>
