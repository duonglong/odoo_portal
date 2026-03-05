import { Platform } from 'react-native';
import { OdooClient } from '@odoo-portal/odoo-client';
import { ProxyTransport } from '@odoo-portal/odoo-client';
import type { OdooConnectionConfig } from '@odoo-portal/types';
import { platformSessionStorage } from './storage.js';

/**
 * BFF proxy URL.
 *
 * On web: routes JSON-RPC through the BFF proxy to avoid CORS.
 * Override with EXPO_PUBLIC_API_URL env var if deploying to a custom domain.
 *
 * Default: http://localhost:3001 (development proxy server)
 */
const PROXY_URL =
    process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001';

/**
 * Create an OdooClient configured for the current platform.
 *
 * - **Web**: uses ProxyTransport → all calls go through apps/api (no CORS)
 * - **Native**: uses the default DirectTransport → calls Odoo directly
 *
 * The caller provides the connection config; the transport is chosen here.
 */
export function createOdooClient(config: OdooConnectionConfig): OdooClient {
    if (Platform.OS === 'web') {
        const proxyTransport = new ProxyTransport(PROXY_URL);
        return new OdooClient(config, {
            sessionStorage: platformSessionStorage,
            transport: proxyTransport,
        });
    }

    // Native: direct JSON-RPC (no CORS restriction in native apps)
    return new OdooClient(config, {
        sessionStorage: platformSessionStorage,
    });
}
