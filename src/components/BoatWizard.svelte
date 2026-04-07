<script lang="ts">
    import { generateBoatClassPolar, scalePolarByLength, type BoatClass } from '../lib/polar';
    import type { BoatConfig } from '../types/polar';
    import { DEFAULT_MOTOR_CONFIG } from '../types/polar';

    export let onComplete: (config: BoatConfig) => void;
    export let onCancel: () => void;

    let step = 1;
    let boatClass: BoatClass = 'cruiser';
    let boatName = '';
    let boatLength = 35; // Default 35 feet (≈10.7 meters)
    let hasSpinnaker = false;
    let motorEnabled = false;

    const boatClasses: { value: BoatClass; label: string; description: string }[] = [
        {
            value: 'dinghy',
            label: 'Small Dinghy',
            description: 'Fast, light, responsive sailing'
        },
        {
            value: 'dayboat',
            label: 'Day Boat',
            description: 'Good all-around performance'
        },
        {
            value: 'cruiser',
            label: 'Cruiser',
            description: 'Comfortable, steady performance'
        },
        {
            value: 'race-cruiser',
            label: 'Race Cruiser',
            description: 'Fast racing with cruising comfort'
        },
        {
            value: 'ior-maxi',
            label: 'IOR Maxi',
            description: 'Large offshore racer'
        },
        {
            value: 'tp52',
            label: 'TP52',
            description: 'Modern high-tech racer'
        },
        {
            value: 'foiler',
            label: 'Foiler',
            description: 'Foiling yacht - extreme speeds'
        },
        {
            value: 'multihull',
            label: 'Multihull',
            description: 'Catamaran or trimaran'
        }
    ];

    function handleComplete() {
        let polar = generateBoatClassPolar(boatClass);
        
        // Scale polar based on boat length
        // Convert feet to meters (1 foot = 0.3048 meters)
        const lengthMeters = boatLength * 0.3048;
        if (Math.abs(lengthMeters - 10) > 0.1) {
            polar = scalePolarByLength(polar, lengthMeters);
        }
        
        // Set boat name
        if (boatName.trim()) {
            polar.name = boatName;
        }

        // Apply spinnaker boost to downwind speeds (angles > 135°)
        if (hasSpinnaker) {
            polar = {
                ...polar,
                speeds: polar.speeds.map((row, twaIdx) => {
                    const twa = polar.twaValues[twaIdx];
                    if (twa > 135) {
                        // Boost downwind speeds by 15% with spinnaker
                        return row.map(speed => speed * 1.15);
                    }
                    return row;
                })
            };
        }

        const config: BoatConfig = {
            polar,
            motor: motorEnabled
                ? {
                      ...DEFAULT_MOTOR_CONFIG,
                      enabled: true
                  }
                : {
                      ...DEFAULT_MOTOR_CONFIG,
                      enabled: false
                  }
        };

        onComplete(config);
    }

    function handleNext() {
        if (step < 3) step++;
    }

    function handlePrev() {
        if (step > 1) step--;
    }
</script>

<div class="wizard">
    <div class="wizard-header">
        <h2>Boat Configuration Wizard</h2>
        <p>Step {step} of 3</p>
    </div>

    <div class="wizard-body">
        {#if step === 1}
            <div class="step">
                <h3>Select Boat Class</h3>
                <p>Choose the type of boat that best matches yours:</p>

                <div class="boat-classes">
                    {#each boatClasses as bc}
                        <label class="boat-option {boatClass === bc.value ? 'selected' : ''}">
                            <input
                                type="radio"
                                name="boatClass"
                                value={bc.value}
                                bind:group={boatClass}
                            />
                            <div class="option-content">
                                <div class="option-label">{bc.label}</div>
                                <div class="option-description">{bc.description}</div>
                            </div>
                        </label>
                    {/each}
                </div>
            </div>
        {/if}

        {#if step === 2}
            <div class="step">
                <h3>Customize Boat Details</h3>

                <div class="form-group">
                    <label for="boatName">Boat Name (optional):</label>
                    <input
                        type="text"
                        id="boatName"
                        bind:value={boatName}
                        placeholder="e.g., My Sailing Boat"
                    />
                </div>

                <div class="form-group">
                    <label for="boatLength">Boat Length (feet):</label>
                    <input
                        type="number"
                        id="boatLength"
                        bind:value={boatLength}
                        min="10"
                        max="330"
                        step="1"
                    />
                    <div class="length-info">
                        Length affects performance scaling. Default is 35 feet.
                    </div>
                </div>

                <div class="form-group checkbox">
                    <label>
                        <input type="checkbox" bind:checked={hasSpinnaker} />
                        Has Spinnaker (improve downwind performance)
                    </label>
                </div>

                <div class="form-group checkbox">
                    <label>
                        <input type="checkbox" bind:checked={motorEnabled} />
                        Has Motor (for low wind conditions)
                    </label>
                </div>

                {#if motorEnabled}
                    <div class="motor-info">
                        <p>
                            Motor will be enabled for wind speeds below 4 knots with a cruising speed
                            of 5 knots.
                        </p>
                    </div>
                {/if}
            </div>
        {/if}

        {#if step === 3}
            <div class="step">
                <h3>Summary</h3>

                <div class="summary">
                    <div class="summary-item">
                        <span class="label">Boat Class:</span>
                        <span class="value">{boatClasses.find(b => b.value === boatClass)?.label}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Boat Name:</span>
                        <span class="value">{boatName || '(Using class default name)'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Boat Length:</span>
                        <span class="value">{boatLength} ft</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Spinnaker:</span>
                        <span class="value">{hasSpinnaker ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Motor:</span>
                        <span class="value">{motorEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                </div>

                <p style="margin-top: 1rem; color: #666; font-size: 0.9em;">
                    Click "Create Boat" to save this configuration and start routing!
                </p>
            </div>
        {/if}
    </div>

    <div class="wizard-footer">
        <button on:click={onCancel} class="btn btn-secondary">Cancel</button>
        <div class="button-group">
            {#if step > 1}
                <button on:click={handlePrev} class="btn btn-secondary">← Back</button>
            {/if}
            {#if step < 3}
                <button on:click={handleNext} class="btn btn-primary">Next →</button>
            {:else}
                <button on:click={handleComplete} class="btn btn-primary">Create Boat</button>
            {/if}
        </div>
    </div>
</div>

<style>
    .wizard {
        display: flex;
        flex-direction: column;
        height: 100%;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        background: white;
    }

    .wizard-header {
        padding: 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-bottom: 1px solid #ddd;
    }

    .wizard-header h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
    }

    .wizard-header p {
        margin: 0;
        opacity: 0.9;
        font-size: 0.9rem;
    }

    .wizard-body {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
    }

    .step {
        animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .step h3 {
        margin: 0 0 1rem 0;
        font-size: 1.3rem;
        color: #333;
    }

    .step p {
        margin: 0 0 1rem 0;
        color: #666;
    }

    .boat-classes {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .boat-option {
        display: flex;
        align-items: flex-start;
        padding: 1rem;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .boat-option:hover {
        border-color: #667eea;
        background-color: #f5f7ff;
    }

    .boat-option.selected {
        border-color: #667eea;
        background-color: #f0f4ff;
    }

    .boat-option input[type='radio'] {
        margin-right: 1rem;
        margin-top: 0.25rem;
        cursor: pointer;
    }

    .option-content {
        flex: 1;
    }

    .option-label {
        font-weight: 600;
        color: #333;
        margin-bottom: 0.25rem;
    }

    .option-description {
        font-size: 0.9rem;
        color: #666;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #333;
    }

    .form-group input[type='text'] {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
    }

    .form-group input[type='text']:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group input[type='number'] {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
    }

    .form-group input[type='number']:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .length-info {
        margin-top: 0.5rem;
        font-size: 0.8rem;
        color: #999;
    }

    .form-group.checkbox {
        display: flex;
        align-items: center;
    }

    .form-group.checkbox label {
        display: flex;
        align-items: center;
        margin: 0;
        cursor: pointer;
    }

    .form-group.checkbox input[type='checkbox'] {
        margin-right: 0.75rem;
        cursor: pointer;
        width: 18px;
        height: 18px;
    }

    .motor-info {
        padding: 1rem;
        background-color: #f0f4ff;
        border-left: 4px solid #667eea;
        border-radius: 4px;
        margin-top: 1rem;
    }

    .motor-info p {
        margin: 0;
        font-size: 0.9rem;
        color: #555;
    }

    .summary {
        background: #f9f9f9;
        padding: 1.5rem;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
    }

    .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0;
        border-bottom: 1px solid #e0e0e0;
    }

    .summary-item:last-child {
        border-bottom: none;
    }

    .summary-item .label {
        font-weight: 600;
        color: #666;
    }

    .summary-item .value {
        color: #333;
    }

    .wizard-footer {
        padding: 1.5rem;
        background: #f5f5f5;
        border-top: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }

    .button-group {
        display: flex;
        gap: 0.75rem;
    }

    .btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-primary {
        background-color: #667eea;
        color: white;
    }

    .btn-primary:hover {
        background-color: #5568d3;
    }

    .btn-secondary {
        background-color: white;
        color: #667eea;
        border: 1px solid #667eea;
    }

    .btn-secondary:hover {
        background-color: #f5f7ff;
    }
</style>
