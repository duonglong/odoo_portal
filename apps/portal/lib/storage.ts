import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { SessionStorage } from '@odoo-portal/odoo-client';
import type { OdooSession } from '@odoo-portal/odoo-client';

/**
 * Mobile session storage using expo-secure-store (encrypted keychain/keystore).
 * Falls back gracefully on web since SecureStore isn't available there.
 */
const secureStorage: SessionStorage = {
    async save(key: string, session: OdooSession): Promise<void> {
        await SecureStore.setItemAsync(key, JSON.stringify(session));
    },
    async load(key: string): Promise<OdooSession | null> {
        const raw = await SecureStore.getItemAsync(key);
        if (!raw) return null;
        return JSON.parse(raw) as OdooSession;
    },
    async clear(key: string): Promise<void> {
        await SecureStore.deleteItemAsync(key);
    },
};

/**
 * Web session storage using AsyncStorage (localStorage on web).
 */
const asyncStorage: SessionStorage = {
    async save(key: string, session: OdooSession): Promise<void> {
        await AsyncStorage.setItem(key, JSON.stringify(session));
    },
    async load(key: string): Promise<OdooSession | null> {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as OdooSession;
    },
    async clear(key: string): Promise<void> {
        await AsyncStorage.removeItem(key);
    },
};

/**
 * Platform-appropriate session storage.
 * Native: SecureStore (encrypted)
 * Web: AsyncStorage (localStorage)
 */
export const platformSessionStorage: SessionStorage =
    Platform.OS === 'web' ? asyncStorage : secureStorage;


