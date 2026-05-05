import { useState, useCallback } from 'react';
import type {
    OdooConnectionConfig,
    AuthCredentials,
    OdooSession,
} from '@odoo-portal/odoo-client';
import { OdooClient, AuthenticationError } from '@odoo-portal/odoo-client';
import { useOdooContext } from '../providers/odoo-provider.js';

interface UseAuthReturn {
    /** Current session (null if not logged in) */
    session: OdooSession | null;
    /** Whether authentication is in progress */
    isLoading: boolean;
    /**
     * True once the first session-restore attempt has completed.
     * Guards should wait for this before redirecting to login.
     */
    isSessionChecked: boolean;
    /** Last authentication error */
    error: Error | null;
    /** Whether the user is currently authenticated */
    isAuthenticated: boolean;
    /** The active OdooClient instance (null if not connected) */
    client: OdooClient | null;

    /** Log in to an Odoo instance */
    login: (
        config: OdooConnectionConfig,
        credentials: AuthCredentials,
    ) => Promise<OdooSession>;

    /** Log out and clear session */
    logout: () => Promise<void>;

    /** Try to restore a previously saved session */
    restoreSession: (config: OdooConnectionConfig) => Promise<OdooSession | null>;
}

/**
 * Hook for authentication — login, logout, session management.
 *
 * Session state is stored in OdooProvider context so all callers share
 * one source of truth — prevents the "fresh null session on mount" problem
 * that caused premature auth-guard redirects.
 *
 * Usage:
 *   const { login, logout, session, isAuthenticated } = useAuth();
 *   await login({ url: 'https://my.odoo.com', database: 'prod' }, { login: 'user', password: 'key' });
 */
export const useAuth = (): UseAuthReturn => {
    const {
        getClient,
        session,
        setSession,
        isSessionRestoring,
        setIsSessionRestoring,
        activeClient,
        setActiveClient,
    } = useOdooContext();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const login = useCallback(
        async (
            config: OdooConnectionConfig,
            credentials: AuthCredentials,
        ): Promise<OdooSession> => {
            setIsLoading(true);
            setError(null);

            try {
                const client = getClient(config);
                const newSession = await client.authenticate(credentials);

                setActiveClient(client);
                setSession(newSession);

                return newSession;
            } catch (err) {
                const authError =
                    err instanceof AuthenticationError
                        ? err
                        : new Error(err instanceof Error ? err.message : 'Login failed');
                setError(authError);
                throw authError;
            } finally {
                setIsLoading(false);
            }
        },
        [getClient, setSession, setActiveClient],
    );

    const logout = useCallback(async () => {
        if (activeClient) {
            await activeClient.logout();
            setActiveClient(null);
        }
        setSession(null);
    }, [activeClient, setSession, setActiveClient]);

    const restoreSession = useCallback(
        async (config: OdooConnectionConfig): Promise<OdooSession | null> => {
            // No saved connection — mark restore done immediately
            if (!config.url) {
                setIsSessionRestoring(false);
                return null;
            }
            setIsLoading(true);
            try {
                const client = getClient(config);
                const restored = await client.restoreSession();
                if (restored) {
                    setActiveClient(client);
                    setSession(restored);
                }
                return restored;
            } catch {
                return null;
            } finally {
                setIsLoading(false);
                setIsSessionRestoring(false);
            }
        },
        [getClient, setSession, setActiveClient, setIsSessionRestoring],
    );

    return {
        session,
        isLoading,
        // isSessionChecked = true once restoring is done (starts false while isSessionRestoring=true)
        isSessionChecked: !isSessionRestoring,
        error,
        isAuthenticated: session !== null && session.isAuthenticated,
        client: activeClient,
        login,
        logout,
        restoreSession,
    };
};
