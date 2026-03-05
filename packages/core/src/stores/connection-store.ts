import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SavedConnection } from '@odoo-portal/types';

/**
 * Client-side state for managing Odoo connections.
 * Persisted to AsyncStorage / localStorage automatically.
 */
export interface ConnectionState {
    /** All saved connections */
    connections: SavedConnection[];
    /** ID of the active connection (null = not connected) */
    activeConnectionId: string | null;

    // Actions
    addConnection: (connection: SavedConnection) => void;
    removeConnection: (id: string) => void;
    setActive: (id: string | null) => void;
    updateConnection: (id: string, updates: Partial<SavedConnection>) => void;
    getActiveConnection: () => SavedConnection | null;
}

/**
 * Create a connection store with custom storage backend.
 *
 * @param storage - AsyncStorage (mobile) or localStorage (web)
 */
export const createConnectionStore = (
    storage?: Parameters<typeof createJSONStorage>[0],
) =>
    create<ConnectionState>()(
        persist(
            (set, get) => ({
                connections: [],
                activeConnectionId: null,

                addConnection: (connection) =>
                    set((state) => ({
                        connections: [...state.connections, connection],
                    })),

                removeConnection: (id) =>
                    set((state) => ({
                        connections: state.connections.filter((c) => c.id !== id),
                        activeConnectionId:
                            state.activeConnectionId === id ? null : state.activeConnectionId,
                    })),

                setActive: (id) =>
                    set({ activeConnectionId: id }),

                updateConnection: (id, updates) =>
                    set((state) => ({
                        connections: state.connections.map((c) =>
                            c.id === id ? { ...c, ...updates } : c,
                        ),
                    })),

                getActiveConnection: () => {
                    const state = get();
                    if (!state.activeConnectionId) return null;
                    return (
                        state.connections.find((c) => c.id === state.activeConnectionId) ??
                        null
                    );
                },
            }),
            {
                name: 'odoo-portal-connections',
                ...(storage ? { storage: createJSONStorage(storage) } : {}),
            },
        ),
    );

/** Default store instance (in-memory for SSR safety — apps override with platform storage) */
export const useConnectionStore = createConnectionStore();
