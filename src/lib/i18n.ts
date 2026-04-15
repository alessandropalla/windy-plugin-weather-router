import { writable, derived, get } from 'svelte/store';

const STORAGE_KEY = 'windy-router-locale';

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

const en: Record<string, string> = {
    // Tabs
    'tab.route': '⛵ Route',
    'tab.polars': '📊 Polars',
    'tab.settings': '⚙ Settings',
    'tab.results': '📈 Results',
    'tab.info': 'ℹ Info',

    // Info tab
    'info.title': 'Important Notice',
    'info.educational': 'This plugin is provided for educational and informational purposes only.',
    'info.liability': 'By using this plugin, you acknowledge that you are solely responsible for all decisions and actions taken based on its output. The authors and contributors disclaim all liability for any loss, damage, injury, or consequences arising from its use.',
    'info.verify': 'Always independently verify routes, weather, hazards, regulations, and navigation details using official and up-to-date nautical charts and instruments.',

    // Route tab — hints & no-go zones
    'route.hint': 'Click "+ Add Waypoint", then left-click on the map to place points.',
    'route.basic': 'Basic Route Setup',
    'route.selectPolar': 'Polar diagram:',
    'route.polarHint': 'Manage or create polars in the Polars tab.',
    'route.safetyWarning': 'Safety warning: Always verify the computed route. Routes may cross land or unsafe areas. Double-check with nautical charts before navigation.',
    'nogo.title': '🚫 No-Go Zones',
    'nogo.drawing': 'Click on the map to add vertices ({count} placed). Need at least 3 points.',
    'nogo.finish': '✓ Finish Zone',
    'nogo.cancel': '✕ Cancel',
    'nogo.draw': '+ Draw No-Go Zone',
    'nogo.pts': '{count} pts',
    'nogo.clearAll': 'Clear All Zones',

    // Compute button
    'btn.compute': 'Compute Weather Route',
    'btn.computing': 'Computing…',
    'compute.noWaypoints': 'Add at least 2 waypoints to compute a route.',
    'compute.noPolar': 'Select a polar diagram in the Route tab (or manage one in Polars).',

    // Progress / error messages
    'progress.fetchingWind': 'Fetching wind data…',
    'progress.fetchingWindN': 'Fetching wind: {fetched}/{total} grid points…',
    'progress.fetchingElev': 'Fetching elevation data for land avoidance…',
    'progress.fetchingElevN': 'Fetching elevation: {fetched}/{total} grid points…',
    'progress.isochrone': 'Running isochrone algorithm…',
    'progress.alternative': 'Computing alternative ({mode})…',
    'error.noWaypoints': 'Please add at least 2 waypoints before computing.',
    'error.noPolar': 'Please select or import a polar in the Polars tab before computing.',
    'error.routingFailed': 'Routing failed: {msg}',
    'error.noRoute': 'No route available to export yet.',
    'error.exportUnsupported':
        'Export is not available on this device. Try opening the plugin on desktop Windy.',
    'export.copiedClipboard':
        'Direct download is unavailable here. Export content was copied to clipboard. Paste it into a file named "{name}".',

    // Map popup
    'popup.speed': 'Speed',
    'popup.wind': 'Wind',
    'popup.gust': 'Gust',
    'popup.waves': 'Waves',
    'popup.twa': 'TWA',
    'popup.motoring': '⚙ Motoring',
    'popup.sailing': '⛵ Sailing',

    // WaypointPanel
    'wp.addMode': '✓ Click map to add waypoint',
    'wp.add': '+ Add Waypoint',
    'wp.reverse': '⇄ Reverse',
    'wp.clear': '✕ Clear',
    'wp.empty': 'No waypoints. Click the button above, then click on the map.',
    'wp.total': 'Total: {dist} nm',
    'wp.summary': '({wpts} waypoints, {legs} legs)',

    // SettingsPanel
    'settings.departure': 'Departure',
    'settings.dateTime': 'Date & Time ({tz}):',
    'settings.local': 'Local',
    'settings.utc': 'UTC',
    'settings.useLocalTime': 'Use local time (browser timezone)',
    'settings.optimizeDeparture': 'Optimize departure time',
    'settings.testWindow': 'Test window (hours):',
    'settings.testEvery': 'Test every (hours):',
    'settings.arrivalDeadline': 'Set arrival deadline',
    'settings.arriveBy': 'Arrive by ({tz}):',
    'settings.motor': 'Motor Settings',
    'settings.allowMotoring': 'Allow motoring',
    'settings.motorSpeed': 'Motor speed (kt):',
    'settings.fuelBurn': 'Fuel burn (L/h):',
    'settings.windThreshold': 'Wind threshold (kt):',
    'settings.motorWhenBelow': 'Motor when TWS below this',
    'settings.maxMotorHours': 'Max motor hours (0=unlimited):',
    'settings.routing': 'Routing Parameters',
    'settings.forecastModel': 'Forecast model:',
    'settings.globalModels': 'Global',
    'settings.regionalModels': 'Regional',
    'settings.timeStep': 'Time step (hours):',
    'settings.fine': 'fine',
    'settings.standard': 'standard',
    'settings.fast': 'fast',
    'settings.veryFast': 'very fast',
    'settings.headingRes': 'Heading resolution (°):',
    'settings.precise': 'precise',
    'settings.optimization': 'Optimization objective:',
    'settings.fastest': 'Fastest arrival (default)',
    'settings.leastMotoring': 'Least motoring',
    'settings.balancedComfort': 'Balanced comfort',
    'settings.lowerMaxWind': 'Lower max wind',
    'settings.lowerWaveExposure': 'Lower wave exposure',
    'settings.deadlineNote': 'Arrival deadline mode uses fastest route that still meets the deadline.',
    'settings.maxDuration': 'Max duration (hours):',
    'settings.elevationResolution': 'Elevation fetch detail:',
    'settings.elevationBatchSize': 'Elevation batch size:',
    'settings.elevationCoarse': 'Coarse (fast)',
    'settings.elevationStandard': 'Standard',
    'settings.elevationFine': 'Fine',
    'settings.elevationUltra': 'Ultra (slow)',
    'settings.maxWind': 'Max wind limit (kt):',
    'settings.maxWindNote': 'Default 25 kt, set 0 to disable.',
    'settings.maxWaveLimit': 'Max wave height limit',
    'settings.maxWaveHeight': 'Max wave height (m):',
    'settings.alternatives': 'Route Alternatives',
    'settings.computeAlternatives': 'Compute alternative routes',
    'settings.language': 'Language',

    // ResultsPanel
    'results.empty': 'No routing result yet. Configure route and polars, then compute.',
    'results.summary': 'Route Summary',
    'results.nm': 'nm',
    'results.duration': 'duration',
    'results.avgKt': 'avg kt',
    'results.maxWindKt': 'max wind kt',
    'results.maxWavesM': 'max waves m',
    'results.departure': 'departure',
    'results.arrival': 'arrival',
    'results.motoring': '⚙ Motoring: {dur} ({nm} nm), Fuel: {fuel} L',
    'results.optimizedDeparture': '✓ Departure time optimized',
    'results.legDetails': 'Leg Details',
    'results.leg': 'Leg',
    'results.dist': 'Dist',
    'results.time': 'Time',
    'results.avgSpd': 'Avg Spd',
    'results.avgWind': 'Avg Wind',
    'results.maxWind': 'Max Wind',
    'results.motorPct': 'Motor %',
    'results.timeline': 'Route Timeline',
    'results.xAxisLabel': 'X-axis: {tz} time (tick = 1 hour)',
    'results.windSpeed': 'Wind Speed (kt)',
    'results.windGust': 'Wind Gust (kt)',
    'results.boatSpeed': 'Boat Speed (kt)',
    'results.twa': 'True Wind Angle (°)',
    'results.waveHeight': 'Wave Height (m)',
    'results.timelineTable': 'Timeline Data Table',
    'results.timelineNote': 'Same values as charts, sampled at each route point.',
    'results.timeCol': 'Time ({tz})',
    'results.windKt': 'Wind (kt)',
    'results.gustKt': 'Gust (kt)',
    'results.boatKt': 'Boat (kt)',
    'results.twaDeg': 'TWA (°)',
    'results.wavesM': 'Waves (m)',
    'results.mode': 'Mode',
    'results.motor': 'Motor',
    'results.sail': 'Sail',
    'results.colorLegend': 'Route Color Legend',
    'results.wind8': 'Wind < 8 kt',
    'results.wind8_15': 'Wind 8–15 kt',
    'results.wind15_25': 'Wind 15–25 kt',
    'results.wind25': 'Wind > 25 kt',
    'results.motoringSegment': 'Motoring segment',
    'results.export': 'Export Route',
    'results.exportGpx': 'Export GPX',
    'results.exportCsv': 'Export CSV',
    'results.exportGeojson': 'Export GeoJSON',
    'results.showIsochrones': 'Show isochrone lines on map',
    'results.showElevationGrid': 'Show elevation grid on map',
    'results.animate': 'Animate Route',
    'results.play': '▶ Play',
    'results.stop': '■ Stop',
    'results.speed': 'Speed:',
    'results.slow': 'Slow',
    'results.normal': 'Normal',
    'results.fast': 'Fast',
    'results.flash': 'Flash',
    'results.comparison': 'Route Comparison',
    'results.comparisonNote':
        "Primary route is highlighted first. Alternatives compare objective tradeoffs and, when enabled, each objective's best departure time.",
    'results.routeCol': 'Route',
    'results.objective': 'Objective',
    'results.arrivalCol': 'Arrival',
    'results.departureCol': 'Departure',
    'results.durationCol': 'Duration',
    'results.distanceCol': 'Distance',
    'results.avgKtCol': 'Avg kt',
    'results.motorH': 'Motor h',
    'results.fuelL': 'Fuel L',
    'results.maxWindCol': 'Max wind',
    'results.maxWavesCol': 'Max waves',
    'results.tradeoff': 'Tradeoff',
    'results.action': 'Action',
    'results.selected': 'Selected',
    'results.makePrimary': 'Make Primary',
    'results.primary': 'Primary',
    'results.altLabel': 'Alt {n}',
    'results.noAlternatives':
        'No feasible objective-based alternatives found with current constraints. Try looser limits.',
    'results.alternativesHint':
        'Enable Route Alternatives in Settings to compare additional route variants.',
    'results.departureComparison': 'Departure Time Comparison',
    'results.departureNote':
        'Each row is one tested departure in the optimization window for the selected objective.',
    'results.score': 'Score',
    'results.status': 'Status',
    'results.statusSelected': 'Selected',
    'results.statusCandidate': 'Candidate',
    'results.switchingDeparture': 'Switching to selected departure candidate…',
    'results.departureSwitchDataMissing': 'Cannot switch departure candidate: route context is no longer available. Recompute first.',
    'results.altitudeWarning': 'Selected route enters non-zero altitude areas (max {max} m, {samples} sampled points). Review for possible land crossing.',

    // Tradeoff descriptions
    'tradeoff.baseline': 'Baseline route used for map and exports',
    'tradeoff.similar': 'Similar profile to primary route',
    'tradeoff.faster': 'faster',
    'tradeoff.slower': 'slower',
    'tradeoff.fuel': 'L fuel',
    'tradeoff.maxWind': 'kt max wind',
    'tradeoff.maxWaves': 'm max waves',

    // PolarEditor
    'polar.wizard': 'Create',
    'polar.manage': 'Manage',
    'polar.import': 'Import',
    'polar.edit': 'Edit',
    'polar.plot': 'Plot',
    'polar.select': 'Select Polar:',
    'polar.none': '-- none --',
    'polar.new': 'New',
    'polar.loadExample': 'Load Example',
    'polar.rename': 'Rename',
    'polar.delete': 'Delete',
    'polar.exportCSV': 'Export CSV',
    'polar.breakpoints': '{twa} TWA × {tws} TWS breakpoints',
    'polar.boatName': 'Boat Name:',
    'polar.importFile': 'Import .pol / .csv file:',
    'polar.pasteData': 'Or paste polar data:',
    'polar.importPasted': 'Import Pasted Data',
    'polar.noLoaded': 'No polar loaded. Select or create one in Manage tab.',
    'polar.noLoadedShort': 'No polar loaded.',
    'polar.promptName': 'Polar name:',
    'polar.promptNewName': 'New polar name:',
    'polar.confirmDelete': 'Delete polar "{name}"?',
    'polar.pastePlaceholder': 'TWA/TWS  6  8  10  12  …\n30       3.2  4.1  5.0  …',
    'polar.errorPasteEmpty': 'Paste some polar data first',
    'polar.errorParse': 'Parse error: {msg}',

    // BoatWizard
    'wizard.title': 'Boat Configuration Wizard',
    'wizard.step': 'Step {n} of 3',
    'wizard.selectClass': 'Select Boat Class',
    'wizard.selectClassHint': 'Choose the type of boat that best matches yours:',
    'wizard.details': 'Customize Boat Details',
    'wizard.summary': 'Summary',
    'wizard.boatName': 'Boat Name (optional):',
    'wizard.namePlaceholder': 'e.g., My Sailing Boat',
    'wizard.boatLength': 'Boat Length (feet):',
    'wizard.lengthInfo': 'Length affects performance scaling. Default is 35 feet.',
    'wizard.hasSpinnaker': 'Has Spinnaker (improve downwind performance)',
    'wizard.hasMotor': 'Has Motor (for low wind conditions)',
    'wizard.motorInfo':
        'Motor will be enabled for wind speeds below 4 knots with a cruising speed of 5 knots.',
    'wizard.summaryClass': 'Boat Class:',
    'wizard.summaryName': 'Boat Name:',
    'wizard.summaryLength': 'Boat Length:',
    'wizard.summarySpinnaker': 'Spinnaker:',
    'wizard.summaryMotor': 'Motor:',
    'wizard.defaultName': '(Using class default name)',
    'wizard.ft': 'ft',
    'wizard.yes': 'Yes',
    'wizard.no': 'No',
    'wizard.enabled': 'Enabled',
    'wizard.disabled': 'Disabled',
    'wizard.createNote': 'Click "Create Boat" to save this configuration and start routing!',
    'wizard.cancel': 'Cancel',
    'wizard.back': '← Back',
    'wizard.next': 'Next →',
    'wizard.create': 'Create Boat',

    // Boat classes
    'boatClass.dinghy.label': 'Small Dinghy',
    'boatClass.dinghy.desc': 'Fast, light, responsive sailing',
    'boatClass.dayboat.label': 'Day Boat',
    'boatClass.dayboat.desc': 'Good all-around performance',
    'boatClass.cruiser.label': 'Cruiser',
    'boatClass.cruiser.desc': 'Comfortable, steady performance',
    'boatClass.race-cruiser.label': 'Race Cruiser',
    'boatClass.race-cruiser.desc': 'Fast racing with cruising comfort',
    'boatClass.ior-maxi.label': 'IOR Maxi',
    'boatClass.ior-maxi.desc': 'Large offshore racer',
    'boatClass.tp52.label': 'TP52',
    'boatClass.tp52.desc': 'Modern high-tech racer',
    'boatClass.foiler.label': 'Foiler',
    'boatClass.foiler.desc': 'Foiling yacht – extreme speeds',
    'boatClass.multihull.label': 'Multihull',
    'boatClass.multihull.desc': 'Catamaran or trimaran',
};

const it: Record<string, string> = {
    // Tabs
    'tab.route': '⛵ Rotta',
    'tab.polars': '📊 Polare',
    'tab.settings': '⚙ Impostazioni',
    'tab.results': '📈 Risultati',
    'tab.info': 'ℹ Info',

    // Info tab
    'info.title': 'Avviso importante',
    'info.educational': 'Questo plugin è fornito esclusivamente per scopi educativi e informativi.',
    'info.liability': 'Utilizzando questo plugin, riconosci di essere l\'unico responsabile di tutte le decisioni e azioni basate sui risultati forniti. Gli autori e i contributori declinano ogni responsabilità per perdite, danni, lesioni o conseguenze derivanti dal suo utilizzo.',
    'info.verify': 'Verifica sempre in modo indipendente rotte, meteo, pericoli, normative e dettagli di navigazione usando carte nautiche ufficiali e aggiornate e strumenti adeguati.',

    // Route tab — hints & no-go zones
    'route.hint': 'Clicca "+ Aggiungi punto", poi clicca sulla mappa per posizionare i punti.',
    'route.basic': 'Impostazioni base rotta',
    'route.selectPolar': 'Diagramma polare:',
    'route.polarHint': 'Gestisci o crea polari nella scheda Polare.',
    'route.safetyWarning': 'Avviso di sicurezza: verifica sempre la rotta calcolata. Le rotte possono attraversare terra o aree non sicure. Controlla sempre con carte nautiche prima di navigare.',
    'nogo.title': '🚫 Zone vietate',
    'nogo.drawing':
        'Clicca sulla mappa per aggiungere vertici ({count} inseriti). Servono almeno 3 punti.',
    'nogo.finish': '✓ Completa zona',
    'nogo.cancel': '✕ Annulla',
    'nogo.draw': '+ Disegna zona vietata',
    'nogo.pts': '{count} pt',
    'nogo.clearAll': 'Cancella tutte le zone',

    // Compute button
    'btn.compute': 'Calcola rotta meteo',
    'btn.computing': 'Calcolo in corso…',
    'compute.noWaypoints': 'Aggiungi almeno 2 punti per calcolare la rotta.',
    'compute.noPolar': 'Seleziona un polare nella scheda Rotta (o gestiscilo in Polare).',

    // Progress / error messages
    'progress.fetchingWind': 'Recupero dati vento…',
    'progress.fetchingWindN': 'Recupero vento: {fetched}/{total} punti griglia…',
    'progress.fetchingElev': 'Recupero dati altitudine per evitare la terra…',
    'progress.fetchingElevN': 'Recupero altitudine: {fetched}/{total} punti griglia…',
    'progress.isochrone': 'Calcolo algoritmo isocrono…',
    'progress.alternative': 'Calcolo alternativa ({mode})…',
    'error.noWaypoints': 'Aggiungi almeno 2 punti prima di calcolare.',
    'error.noPolar': "Seleziona o importa un polare nella scheda Polare prima di calcolare.",
    'error.routingFailed': 'Calcolo rotta fallito: {msg}',
    'error.noRoute': 'Nessuna rotta disponibile da esportare.',
    'error.exportUnsupported':
        'L\'esportazione non e disponibile su questo dispositivo. Prova ad aprire il plugin su Windy desktop.',
    'export.copiedClipboard':
        'Il download diretto non e disponibile qui. Il contenuto e stato copiato negli appunti. Incollalo in un file chiamato "{name}".',

    // Map popup
    'popup.speed': 'Velocità',
    'popup.wind': 'Vento',
    'popup.gust': 'Raffiche',
    'popup.waves': 'Onde',
    'popup.twa': 'TWA',
    'popup.motoring': '⚙ Motore',
    'popup.sailing': '⛵ Vela',

    // WaypointPanel
    'wp.addMode': '✓ Clicca la mappa per aggiungere',
    'wp.add': '+ Aggiungi punto',
    'wp.reverse': '⇄ Inverti',
    'wp.clear': '✕ Cancella',
    'wp.empty': 'Nessun punto. Clicca il pulsante sopra, poi sulla mappa.',
    'wp.total': 'Totale: {dist} nm',
    'wp.summary': '({wpts} punti, {legs} tratte)',

    // SettingsPanel
    'settings.departure': 'Partenza',
    'settings.dateTime': 'Data e ora ({tz}):',
    'settings.local': 'Locale',
    'settings.utc': 'UTC',
    'settings.useLocalTime': 'Usa ora locale (fuso orario del browser)',
    'settings.optimizeDeparture': 'Ottimizza orario di partenza',
    'settings.testWindow': 'Finestra di partenza (ore):',
    'settings.testEvery': 'Testa ogni (ore):',
    'settings.arrivalDeadline': 'Imposta scadenza di arrivo',
    'settings.arriveBy': 'Arriva entro ({tz}):',
    'settings.motor': 'Impostazioni motore',
    'settings.allowMotoring': 'Consenti uso motore',
    'settings.motorSpeed': 'Velocità motore (kt):',
    'settings.fuelBurn': 'Consumo carburante (L/h):',
    'settings.windThreshold': 'Soglia vento (kt):',
    'settings.motorWhenBelow': 'Usa motore se TWS è inferiore',
    'settings.maxMotorHours': 'Ore motore max (0=illimitato):',
    'settings.routing': 'Parametri di rotta',
    'settings.forecastModel': 'Modello previsione:',
    'settings.globalModels': 'Globali',
    'settings.regionalModels': 'Regionali',
    'settings.timeStep': 'Passo temporale (ore):',
    'settings.fine': 'preciso',
    'settings.standard': 'standard',
    'settings.fast': 'veloce',
    'settings.veryFast': 'molto veloce',
    'settings.headingRes': 'Risoluzione rotta (°):',
    'settings.precise': 'preciso',
    'settings.optimization': 'Obiettivo di ottimizzazione:',
    'settings.fastest': 'Arrivo più rapido (predefinito)',
    'settings.leastMotoring': 'Minimo uso motore',
    'settings.balancedComfort': 'Comfort bilanciato',
    'settings.lowerMaxWind': 'Vento massimo ridotto',
    'settings.lowerWaveExposure': 'Esposizione onde ridotta',
    'settings.deadlineNote':
        'In modalità scadenza si usa la rotta più rapida che rispetta il vincolo.',
    'settings.maxDuration': 'Durata massima (ore):',
    'settings.elevationResolution': 'Dettaglio fetch altitudine:',
    'settings.elevationBatchSize': 'Dimensione batch altitudine:',
    'settings.elevationCoarse': 'Grossolano (veloce)',
    'settings.elevationStandard': 'Standard',
    'settings.elevationFine': 'Fine',
    'settings.elevationUltra': 'Ultra (lento)',
    'settings.maxWind': 'Limite vento massimo (kt):',
    'settings.maxWindNote': 'Default 25 kt, imposta 0 per disabilitare.',
    'settings.maxWaveLimit': 'Limite altezza onde',
    'settings.maxWaveHeight': 'Altezza onde massima (m):',
    'settings.alternatives': 'Rotte alternative',
    'settings.computeAlternatives': 'Calcola rotte alternative',
    'settings.language': 'Lingua',

    // ResultsPanel
    'results.empty': 'Nessun risultato. Configura rotta e polare, poi calcola.',
    'results.summary': 'Riepilogo rotta',
    'results.nm': 'nm',
    'results.duration': 'durata',
    'results.avgKt': 'media kt',
    'results.maxWindKt': 'vento max kt',
    'results.maxWavesM': 'onde max m',
    'results.departure': 'partenza',
    'results.arrival': 'arrivo',
    'results.motoring': '⚙ Motore: {dur} ({nm} nm), Carburante: {fuel} L',
    'results.optimizedDeparture': '✓ Orario di partenza ottimizzato',
    'results.legDetails': 'Dettagli tratta',
    'results.leg': 'Tratta',
    'results.dist': 'Dist',
    'results.time': 'Ora',
    'results.avgSpd': 'Vel media',
    'results.avgWind': 'Vento medio',
    'results.maxWind': 'Vento max',
    'results.motorPct': 'Motore %',
    'results.timeline': 'Cronologia rotta',
    'results.xAxisLabel': 'Asse X: ora {tz} (tacca = 1 ora)',
    'results.windSpeed': 'Velocità vento (kt)',
    'results.windGust': 'Raffiche vento (kt)',
    'results.boatSpeed': 'Velocità barca (kt)',
    'results.twa': 'Angolo vento reale (°)',
    'results.waveHeight': 'Altezza onde (m)',
    'results.timelineTable': 'Tabella dati cronologici',
    'results.timelineNote':
        'Stessi valori dei grafici, campionati ad ogni punto rotta.',
    'results.timeCol': 'Ora ({tz})',
    'results.windKt': 'Vento (kt)',
    'results.gustKt': 'Raffiche (kt)',
    'results.boatKt': 'Barca (kt)',
    'results.twaDeg': 'TWA (°)',
    'results.wavesM': 'Onde (m)',
    'results.mode': 'Modo',
    'results.motor': 'Motore',
    'results.sail': 'Vela',
    'results.colorLegend': 'Legenda colori rotta',
    'results.wind8': 'Vento < 8 kt',
    'results.wind8_15': 'Vento 8–15 kt',
    'results.wind15_25': 'Vento 15–25 kt',
    'results.wind25': 'Vento > 25 kt',
    'results.motoringSegment': 'Tratto a motore',
    'results.export': 'Esporta rotta',
    'results.exportGpx': 'Esporta GPX',
    'results.exportCsv': 'Esporta CSV',
    'results.exportGeojson': 'Esporta GeoJSON',
    'results.showIsochrones': 'Mostra isocroni sulla mappa',
    'results.showElevationGrid': 'Mostra griglia altitudine sulla mappa',
    'results.animate': 'Anima rotta',
    'results.play': '▶ Avvia',
    'results.stop': '■ Ferma',
    'results.speed': 'Velocità:',
    'results.slow': 'Lento',
    'results.normal': 'Normale',
    'results.fast': 'Veloce',
    'results.flash': 'Rapido',
    'results.comparison': 'Confronto rotte',
    'results.comparisonNote':
        "La rotta principale è mostrata per prima. Le alternative confrontano i compromessi degli obiettivi e, se abilitato, il miglior orario di partenza per ogni obiettivo.",
    'results.routeCol': 'Rotta',
    'results.objective': 'Obiettivo',
    'results.arrivalCol': 'Arrivo',
    'results.departureCol': 'Partenza',
    'results.durationCol': 'Durata',
    'results.distanceCol': 'Distanza',
    'results.avgKtCol': 'Media kt',
    'results.motorH': 'Motore h',
    'results.fuelL': 'Carb L',
    'results.maxWindCol': 'Vento max',
    'results.maxWavesCol': 'Onde max',
    'results.tradeoff': 'Compromesso',
    'results.action': 'Azione',
    'results.selected': 'Selezionata',
    'results.makePrimary': 'Rendi principale',
    'results.primary': 'Principale',
    'results.altLabel': 'Alt {n}',
    'results.noAlternatives':
        'Nessuna alternativa fattibile con i vincoli attuali. Prova limiti meno restrittivi.',
    'results.alternativesHint':
        'Abilita le rotte alternative nelle impostazioni per confrontare varianti aggiuntive.',
    'results.departureComparison': 'Confronto orari di partenza',
    'results.departureNote':
        "Ogni riga è una partenza testata nella finestra di ottimizzazione per l'obiettivo selezionato.",
    'results.score': 'Punteggio',
    'results.status': 'Stato',
    'results.statusSelected': 'Selezionata',
    'results.statusCandidate': 'Candidata',
    'results.switchingDeparture': 'Passaggio alla partenza selezionata…',
    'results.departureSwitchDataMissing': 'Impossibile cambiare partenza: il contesto rotta non e piu disponibile. Ricalcola prima.',
    'results.altitudeWarning': 'La rotta selezionata entra in aree con altitudine non zero (max {max} m, {samples} punti campionati). Verifica possibile attraversamento terra.',

    // Tradeoff descriptions
    'tradeoff.baseline': 'Rotta principale usata per mappa ed esportazioni',
    'tradeoff.similar': 'Profilo simile alla rotta principale',
    'tradeoff.faster': 'più veloce',
    'tradeoff.slower': 'più lento',
    'tradeoff.fuel': 'L carburante',
    'tradeoff.maxWind': 'kt vento max',
    'tradeoff.maxWaves': 'm onde max',

    // PolarEditor
    'polar.wizard': 'Creazione guidata',
    'polar.manage': 'Gestisci',
    'polar.import': 'Importa',
    'polar.edit': 'Modifica',
    'polar.plot': 'Grafico',
    'polar.select': 'Seleziona polare:',
    'polar.none': '-- nessuno --',
    'polar.new': 'Nuovo',
    'polar.loadExample': 'Carica esempio',
    'polar.rename': 'Rinomina',
    'polar.delete': 'Elimina',
    'polar.exportCSV': 'Esporta CSV',
    'polar.breakpoints': '{twa} TWA × {tws} punti TWS',
    'polar.boatName': 'Nome barca:',
    'polar.importFile': 'Importa file .pol / .csv:',
    'polar.pasteData': 'O incolla dati polari:',
    'polar.importPasted': 'Importa dati incollati',
    'polar.noLoaded': 'Nessun polare caricato. Seleziona o crea nella scheda Gestisci.',
    'polar.noLoadedShort': 'Nessun polare caricato.',
    'polar.promptName': 'Nome polare:',
    'polar.promptNewName': 'Nuovo nome polare:',
    'polar.confirmDelete': 'Eliminare il polare "{name}"?',
    'polar.pastePlaceholder': 'TWA/TWS  6  8  10  12  …\n30       3.2  4.1  5.0  …',
    'polar.errorPasteEmpty': 'Incolla i dati del polare prima di importare',
    'polar.errorParse': 'Errore di analisi: {msg}',

    // BoatWizard
    'wizard.title': 'Procedura guidata configurazione barca',
    'wizard.step': 'Passo {n} di 3',
    'wizard.selectClass': 'Seleziona il tipo barca',
    'wizard.selectClassHint': 'Scegli il tipo di barca più simile alla tua:',
    'wizard.details': 'Personalizza dettagli barca',
    'wizard.summary': 'Riepilogo',
    'wizard.boatName': 'Nome barca (opzionale):',
    'wizard.namePlaceholder': 'es. La mia barca',
    'wizard.boatLength': 'Lunghezza barca (piedi):',
    'wizard.lengthInfo': 'La lunghezza influisce sulla scala delle prestazioni. Default 35 piedi.',
    'wizard.hasSpinnaker': 'Con spinnaker (migliora le prestazioni portanti)',
    'wizard.hasMotor': 'Con motore (per condizioni di vento scarso)',
    'wizard.motorInfo':
        'Il motore sarà abilitato per velocità del vento inferiori a 4 nodi con velocità di crociera di 5 nodi.',
    'wizard.summaryClass': 'Tipo barca:',
    'wizard.summaryName': 'Nome barca:',
    'wizard.summaryLength': 'Lunghezza barca:',
    'wizard.summarySpinnaker': 'Spinnaker:',
    'wizard.summaryMotor': 'Motore:',
    'wizard.defaultName': '(Usa nome predefinito della classe)',
    'wizard.ft': 'piedi',
    'wizard.yes': 'Sì',
    'wizard.no': 'No',
    'wizard.enabled': 'Abilitato',
    'wizard.disabled': 'Disabilitato',
    'wizard.createNote': 'Clicca "Crea barca" per salvare questa configurazione e iniziare!',
    'wizard.cancel': 'Annulla',
    'wizard.back': '← Indietro',
    'wizard.next': 'Avanti →',
    'wizard.create': 'Crea barca',

    // Boat classes
    'boatClass.dinghy.label': 'Deriva leggera',
    'boatClass.dinghy.desc': 'Navigazione veloce, leggera e reattiva',
    'boatClass.dayboat.label': 'Barca da diporto',
    'boatClass.dayboat.desc': 'Ottime prestazioni generali',
    'boatClass.cruiser.label': 'Cruiser',
    'boatClass.cruiser.desc': 'Prestazioni confortevoli e costanti',
    'boatClass.race-cruiser.label': 'Race Cruiser',
    'boatClass.race-cruiser.desc': 'Velocità da regata con comfort da crociera',
    'boatClass.ior-maxi.label': 'IOR Maxi',
    'boatClass.ior-maxi.desc': 'Grande offshore da regata',
    'boatClass.tp52.label': 'TP52',
    'boatClass.tp52.desc': 'Racer moderno ad alta tecnologia',
    'boatClass.foiler.label': 'Foiler',
    'boatClass.foiler.desc': 'Yacht a foil – velocità estreme',
    'boatClass.multihull.label': 'Multiscafo',
    'boatClass.multihull.desc': 'Catamarano o trimarano',
};

// ---------------------------------------------------------------------------
// Store & helpers
// ---------------------------------------------------------------------------

export const SUPPORTED_LOCALES: Record<string, string> = { en: 'English', it: 'Italiano' };

export const translations: Record<string, Record<string, string>> = { en, it };

/** Writable store holding the active locale code (e.g. 'en', 'it'). */
export const locale = writable<string>('en');

/** Call once from plugin onMount/onopen to set locale from localStorage / browser. */
export function initLocale(): void {
    const saved =
        typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved && saved in translations) {
        locale.set(saved);
        return;
    }
    const lang =
        typeof navigator !== 'undefined' ? (navigator.language || 'en').split('-')[0] : 'en';
    locale.set(lang in translations ? lang : 'en');
}

/** Persist locale selection. */
export function setLocale(l: string): void {
    if (l in translations) {
        locale.set(l);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, l);
        }
    }
}

export type TFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * Derived store whose value is a translation function `t(key, params?)`.
 * In Svelte templates: `$t('key')` or `$t('key', { n: 5 })`.
 */
export const t = derived(locale, ($locale): TFn => {
    const dict = translations[$locale] ?? translations.en;
    const fallback = translations.en;
    return (key: string, params?: Record<string, string | number>): string => {
        let str = dict[key] ?? fallback[key] ?? key;
        if (params) {
            for (const [k, v] of Object.entries(params)) {
                str = str.replace(`{${k}}`, String(v));
            }
        }
        return str;
    };
});

/** Non-reactive helper for use inside event handlers / JS logic. */
export function tGet(key: string, params?: Record<string, string | number>): string {
    return get(t)(key, params);
}

/** Locale-aware short date/time formatter (MM/DD HH:MM for en; DD/MM HH:MM for it). */
export function formatShortDate(ts: number, local: boolean): string {
    if (!ts) {
        return '--';
    }
    const d = new Date(ts);
    const loc = get(locale);
    const pad = (n: number) => String(n).padStart(2, '0');
    if (local) {
        const mm = d.getMonth() + 1;
        const dd = d.getDate();
        const h = pad(d.getHours());
        const m = pad(d.getMinutes());
        return loc === 'it' ? `${dd}/${mm} ${h}:${m}` : `${mm}/${dd} ${h}:${m}`;
    } else {
        const mm = d.getUTCMonth() + 1;
        const dd = d.getUTCDate();
        const h = pad(d.getUTCHours());
        const m = pad(d.getUTCMinutes());
        return loc === 'it' ? `${dd}/${mm} ${h}:${m}Z` : `${mm}/${dd} ${h}:${m}Z`;
    }
}
