import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-weather-router',
    version: '0.1.0',
    icon: '⛵',
    title: 'Weather Router',
    description: 'Sailboat weather routing with isochrone optimization for Windy.com.',
    author: 'Alessandro Palla',
    repository: 'https://github.com/alessandropalla/windy-plugin-weather-router',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/weather-router',
    desktopWidth: 600,
    addToContextmenu: true,
    listenToSingleclick: true,
    private: true,
};

export default config;
