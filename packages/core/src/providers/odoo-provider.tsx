import React, { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react';
import { OdooClient, type OdooClientOptions } from '@odoo-portal/odoo-client';
import type { OdooConnectionConfig, OdooSession } from '@odoo-portal/odoo-client';

interface OdooContextValue {
    /** Get or create an OdooClient for the given connection */
    getClient: (config: OdooConnectionConfig) => OdooClient;
    /** Global client options (session storage, etc.) */
    clientOptions: OdooClientOptions;
    /** Shared session state — set by useAuth after login/restore */
    session: OdooSession | null;
    setSession: (session: OdooSession | null) => void;
    /** Whether a session restore is still in progress */
    isSessionRestoring: boolean;
    setIsSessionRestoring: (v: boolean) => void;
    /** Active OdooClient shared globally */
    activeClient: OdooClient | null;
    setActiveClient: (client: OdooClient | null) => void;
}

const OdooContext = createContext<OdooContextValue | null>(null);

interface OdooProviderProps {
    children: ReactNode;
    /**
     * Client options applied to all OdooClient instances.
     * Use this to inject platform-specific SessionStorage.
     */
    clientOptions?: OdooClientOptions;
    /**
     * Optional factory for creating OdooClient instances.
     * Use this to inject a custom factory if needed.
     * Defaults to `new OdooClient(config, clientOptions)`.
     */
    clientFactory?: (config: OdooConnectionConfig, options: OdooClientOptions) => OdooClient;
}

/**
 * OdooProvider — provides OdooClient factory and shared session state to the component tree.
 *
 * Session state is stored here (not in useAuth local state) so every component
 * that calls useAuth() reads from the same source of truth.
 */
export const OdooProvider = ({ children, clientOptions = {}, clientFactory }: OdooProviderProps) => {
    const clientCache = useRef(new Map<string, OdooClient>());

    // Global session state — shared across all useAuth() callers
    const [session, setSession] = useState<OdooSession | null>(null);
    // Starts true so guards wait for the first restore attempt to complete
    const [isSessionRestoring, setIsSessionRestoring] = useState(true);
    const [activeClient, setActiveClient] = useState<OdooClient | null>(null);

    const getClient = useCallback((config: OdooConnectionConfig): OdooClient => {
        const key = `${config.url}|${config.database}`;
        const cached = clientCache.current.get(key);
        if (cached) return cached;

        const client = clientFactory
            ? clientFactory(config, clientOptions)
            : new OdooClient(config, clientOptions);
        clientCache.current.set(key, client);
        return client;
    }, [clientFactory, clientOptions]);

    return (
        <OdooContext.Provider value={{
            getClient,
            clientOptions,
            session,
            setSession,
            isSessionRestoring,
            setIsSessionRestoring,
            activeClient,
            setActiveClient,
        }}>
            {children}
        </OdooContext.Provider>
    );
};

/**
 * Access the OdooProvider context.
 * Throws if used outside of <OdooProvider>.
 */
export const useOdooContext = (): OdooContextValue => {
    const context = useContext(OdooContext);
    if (!context) {
        throw new Error('useOdooContext must be used within <OdooProvider>');
    }
    return context;
};
