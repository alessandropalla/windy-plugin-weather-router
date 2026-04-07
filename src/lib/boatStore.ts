import { writable } from 'svelte/store';
import type { BoatConfig } from '../types/polar';
import { DEFAULT_MOTOR_CONFIG } from '../types/polar';
import { getExamplePolar } from './polar';

export interface BoatProfile {
    id: string;
    config: BoatConfig;
    createdAt: number;
    isDefault?: boolean;
}

const STORAGE_KEY = 'windy-router-boats';

function createBoatStore() {
    const { subscribe, set, update } = writable<BoatProfile[]>([]);

    return {
        subscribe,
        
        /**
         * Load all saved boat profiles from storage
         */
        load() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                if (data) {
                    set(JSON.parse(data));
                } else {
                    // Initialize with example boat
                    const exampleBoat: BoatProfile = {
                        id: 'example-' + Date.now(),
                        config: {
                            polar: getExamplePolar(),
                            motor: DEFAULT_MOTOR_CONFIG
                        },
                        createdAt: Date.now(),
                        isDefault: true
                    };
                    set([exampleBoat]);
                    this.save([exampleBoat]);
                }
            } catch (e) {
                console.error('Failed to load boat profiles:', e);
                set([]);
            }
        },

        /**
         * Save all boat profiles to storage
         */
        save(boats: BoatProfile[]) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(boats));
            } catch (e) {
                console.error('Failed to save boat profiles:', e);
            }
        },

        /**
         * Add a new boat profile
         */
        add(config: BoatConfig) {
            const boat: BoatProfile = {
                id: config.polar.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                config,
                createdAt: Date.now()
            };
            
            update(boats => {
                const updated = [...boats, boat];
                this.save(updated);
                return updated;
            });

            return boat.id;
        },

        /**
         * Update an existing boat profile
         */
        updateBoat(id: string, config: BoatConfig) {
            update(boats => {
                const updated = boats.map(b => 
                    b.id === id ? { ...b, config } : b
                );
                this.save(updated);
                return updated;
            });
        },

        /**
         * Delete a boat profile
         */
        delete(id: string) {
            update(boats => {
                const updated = boats.filter(b => b.id !== id);
                this.save(updated);
                return updated;
            });
        },

        /**
         * Get a specific boat profile by ID
         */
        getBoat(id: string): BoatProfile | undefined {
            let boat: BoatProfile | undefined;
            subscribe(boats => {
                boat = boats.find(b => b.id === id);
            })();
            return boat;
        }
    };
}

export const boatStore = createBoatStore();
