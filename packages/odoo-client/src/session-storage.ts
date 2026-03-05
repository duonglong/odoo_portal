import type { OdooSession } from '@odoo-portal/types';

/**
 * Abstract session storage interface.
 *
 * The odoo-client package is platform-agnostic. Concrete implementations
 * are provided by the app layer:
 * - Mobile: expo-secure-store adapter
 * - Web: localStorage adapter
 * - Tests: in-memory adapter (default)
 */
export interface SessionStorage {
    save(key: string, session: OdooSession): Promise<void>;
    load(key: string): Promise<OdooSession | null>;
    clear(key: string): Promise<void>;
}

/**
 * Default in-memory session storage.
 * Used for testing and as fallback when no platform storage is configured.
 */
export class InMemorySessionStorage implements SessionStorage {
    private store = new Map<string, OdooSession>();

    async save(key: string, session: OdooSession): Promise<void> {
        this.store.set(key, session);
    }

    async load(key: string): Promise<OdooSession | null> {
        return this.store.get(key) ?? null;
    }

    async clear(key: string): Promise<void> {
        this.store.delete(key);
    }
}
