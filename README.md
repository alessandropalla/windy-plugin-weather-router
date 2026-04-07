# ⛵ Windy Weather Router

A [Windy.com](https://www.windy.com) plugin for sailboat weather routing using the **isochrone method**. Plan offshore passages with real forecast data from ECMWF, GFS, or ICON, taking into account your boat's polar diagram, land masses, custom no-go zones, and optional motor/sail hybrid strategies.

**Repository:** <https://github.com/alessandropalla/windy-plugin-weather-router>

**Windy Plugin API docs:** <https://docs.windy-plugins.com/>

---

## Features

### Route Planning (Route tab)
- Place waypoints by clicking the map; reorder or remove them via the waypoint panel
- Draw custom **no-go zones** as polygons directly on the map (areas the router will avoid)
- Automatic **land avoidance** using an elevation grid

### Boat Polars (Polars tab)
- Built-in polar editor to define your boat's speed at each True Wind Angle / True Wind Speed combination
- Supports sail/motor hybrid configurations

### Routing Settings (Settings tab)
- **Departure time** — enter manually in UTC or local browser time
- **Departure optimization** — test a configurable time window and step to find the fastest start time
- **Arrival deadline** — constrain the route to arrive before a given time
- **Motor settings** — enable motoring below a wind-speed threshold, set motor speed, fuel burn rate, and maximum motoring hours
- **Forecast model** — choose between ECMWF, GFS, ICON, or ICON-EU
- **Time step** — 0.5 h (fine) to 3 h (very fast)
- **Heading resolution** — 5°, 10°, or 15° angular resolution for the isochrone fan
- **Maximum route duration** — cap the search horizon
- **Wave height limit** — discard route segments that exceed a set wave height
- **Alternative routes** — compute a fan of routes with a configurable heading bias; displayed with a colour legend

### Results (Results tab)
- **Route summary card** — total distance (nm), duration, average speed, max wind, max wave height, departure and arrival times
- **Motoring summary** — total motoring time, distance, and estimated fuel consumed (litres)
- **Leg breakdown table** — per-leg distance, time, average/max wind, average speed, and motoring percentage
- **Timeline charts** — wind speed, boat speed, True Wind Angle, and wave height plotted over the voyage
- **Timeline data table** — full numeric export of the same series
- **Route animation** — play/pause/speed controls to animate the boat along the computed route on the map
- **Isochrone toggle** — show or hide the isochrone fronts used during computation
- **GPX / JSON export** — download the route for use in other navigation tools

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A Windy account (free)

### Install & run

```bash
npm i
npm start          # compiles in watch mode and serves on https://localhost:9999
```

> **Windows users:** if `npm start` fails due to `rm -rf`, use `npm run build:win` for one-off builds.

Then open Windy's developer mode and load the plugin:

1. Navigate to https://www.windy.com/developer-mode
2. Enter `https://localhost:9999/plugin.js` and click **Load**
3. The ⛵ Weather Router button appears in the right-hand panel

---

## Project Structure

```
src/
  plugin.svelte          # Root component — tab shell and map integration
  pluginConfig.ts        # Plugin metadata (name, icon, UI mode)
  components/
    WaypointPanel.svelte  # Waypoint list and map-click capture
    PolarEditor.svelte    # Boat polar diagram editor
    SettingsPanel.svelte  # All routing configuration inputs
    ResultsPanel.svelte   # Summary, charts, tables, animation, export
  lib/
    routing.ts            # Isochrone routing engine
    windgrid.ts           # Wind & elevation grid fetching and lookup
    polar.ts              # Polar interpolation
    nogozones.ts          # No-go zone polygon intersection
    waypoints.ts          # Waypoint persistence helpers
    geo.ts                # Geodesic distance, bearing, TWA utilities
    i18n.ts               # Internationalisation — locale store, dictionaries (en/it), t() helper
  types/
    routing.ts            # Route, waypoint, isochrone, metrics types
    polar.ts              # Polar diagram and motor config types
```

## Language / Lingua

The plugin UI is fully translated into **English** (default) and **Italian**.

The active language is automatically detected from your browser's language setting (`navigator.language`). Once you change the language manually in the **Settings** tab → **Language** selector, the selection is persisted in `localStorage` and used on subsequent opens.

To add a new language:
1. Open `src/lib/i18n.ts`.
2. Copy the `en` dictionary object and create a new key for your language code (e.g. `fr`, `de`).
3. Translate each string value.
4. Add the locale code and display name to `SUPPORTED_LOCALES` (e.g. `{ en: 'English', it: 'Italiano', fr: 'Français' }`).

No build-time changes are required; the language selector in Settings will appear automatically.

---

## CHANGELOG

-   0.2.0
    -   **Internationalisation (i18n):** English and Italian UI translations; language selector in Settings tab; locale auto-detected from browser, persisted in `localStorage`; locale-aware date format (DD/MM for Italian, MM/DD for English)

-   0.1.0
    -   Initial release of the Weather Router plugin
    -   Isochrone routing engine with multi-waypoint support
    -   Polar diagram editor
    -   Departure-time optimization
    -   Motor/sail hybrid strategy with fuel tracking
    -   Land avoidance via elevation grid
    -   No-go zone polygon drawing
    -   Wave height routing constraint
    -   Alternative routes with heading fan
    -   Route animation controls
    -   Timeline charts (wind, speed, TWA, waves)
    -   Timeline data table and route export
    -   Saved settings across sessions
