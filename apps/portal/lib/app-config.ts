import Constants from 'expo-constants';

interface AppExtra {
    odooUrl:      string;
    odooDatabase: string;
    apiUrl:       string;
    appEnv:       string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;

export const appConfig = {
    odooUrl:      extra.odooUrl      ?? process.env['EXPO_PUBLIC_ODOO_URL']      ?? '',
    odooDatabase: extra.odooDatabase ?? process.env['EXPO_PUBLIC_ODOO_DATABASE'] ?? '',
    apiUrl:       extra.apiUrl       ?? process.env['EXPO_PUBLIC_API_URL']       ?? 'http://localhost:3001',
    appEnv:       extra.appEnv       ?? process.env['APP_ENV']                   ?? 'development',
} as const;
