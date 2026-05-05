import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
    const odooUrl      = process.env['EXPO_PUBLIC_ODOO_URL'] ?? '';
    const odooDatabase = process.env['EXPO_PUBLIC_ODOO_DATABASE'] ?? '';
    const apiUrl       = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';
    const appEnv       = process.env['APP_ENV'] ?? 'development';

    if (appEnv === 'production' && (!odooUrl || !odooDatabase)) {
        throw new Error('EXPO_PUBLIC_ODOO_URL and EXPO_PUBLIC_ODOO_DATABASE are required for production builds.');
    }

    return {
    ...config,
    name: appEnv === 'production' ? 'Odoo Portal' : `Odoo Portal (${appEnv})`,
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
        '@react-native-community/datetimepicker'
    ],
    experiments: {
        typedRoutes: true,
    },
    extra: {
        odooUrl,
        odooDatabase,
        apiUrl,
        appEnv,
    },
    };
};
