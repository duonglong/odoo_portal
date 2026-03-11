/**
 * Odoo connection configuration.
 * The portal connects to any Odoo instance dynamically — URL is user-provided.
 */
export interface OdooConnectionConfig {
    /** Full Odoo URL, e.g. 'https://mycompany.odoo.com' */
    url: string;
    /** Database name, e.g. 'mycompany_prod' */
    database: string;
}

/**
 * Credentials for authenticating with Odoo.
 * Odoo 19 supports API Keys as a more secure alternative to passwords.
 */
export interface AuthCredentials {
    login: string;
    /** User password or Odoo API key */
    password: string;
}

/**
 * Active Odoo session returned after successful authentication.
 */
export interface OdooSession {
    sessionId: string;
    /** JWT used when communicating via BFF proxy */
    proxyJwt?: string;
    uid: number;
    username: string;
    name: string;
    partnerId: number;
    companyId: number;
    /** User context (lang, tz, etc.) */
    userContext: Record<string, unknown>;
    /** Odoo server version string, e.g. '19.0' */
    serverVersion: string;
    /** Whether the session is still valid */
    isAuthenticated: boolean;
}

/**
 * Saved connection info for multi-instance switching.
 */
export interface SavedConnection {
    id: string;
    url: string;
    database: string;
    username: string;
    /** Display label, e.g. 'My Company (Production)' */
    label: string;
    lastUsedAt: string;
}
