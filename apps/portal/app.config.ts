import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Odoo Portal',
    slug: 'odoo-portal',
    version: '0.1.0',
    scheme: 'odoo-portal',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#1a1a2e',
    },
    updates: {
        fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.odoo.portal',
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#1a1a2e',
        },
        package: 'com.odoo.portal',
    },
    web: {
        bundler: 'metro',
        favicon: './assets/favicon.png',
    },
    plugins: [
        'expo-router',
        'expo-secure-store',
    ],
    experiments: {
        typedRoutes: true,
    },
});
