import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { OdooProvider, ModuleRegistry, useAuth, mapOdooError } from '@odoo-portal/core';
import { attendanceModule } from '@odoo-portal/attendance';
import { platformSessionStorage } from '~/lib/storage';
import { Platform } from 'react-native';
import { createOdooClient } from '~/lib/create-client';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MATERIAL_COMMUNITY_FONT_FAMILY, MATERIAL_COMMUNITY_FONT_DATA_URI } from '~/lib/material-community-font';

import '../global.css';

// Keep the splash screen visible while fonts are loading
SplashScreen.preventAutoHideAsync();

// ── Inject Inter typeface from CDN ──
if (typeof document !== 'undefined') {
    const existingLink = document.getElementById('odoo-portal-inter');
    if (!existingLink) {
        const link = document.createElement('link');
        link.id = 'odoo-portal-inter';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        const style = document.createElement('style');
        style.textContent = `
            body, html, #root { font-family: 'Inter', system-ui, sans-serif !important; }
            @font-face {
                font-family: '${MATERIAL_COMMUNITY_FONT_FAMILY}';
                src: url('${MATERIAL_COMMUNITY_FONT_DATA_URI}') format('truetype');
            }
        `;
        document.head.appendChild(style);
    }
}

// ── Register feature modules (runs once at app start) ──────
ModuleRegistry.register(attendanceModule);

// ── Custom Toast System ────────────────────────────
type ToastMessage = ReturnType<typeof mapOdooError> & { id: string };

const toastEmitter = {
    listeners: new Set<(toast: ToastMessage) => void>(),
    emit(toast: ReturnType<typeof mapOdooError>) {
        if (!toast) return;
        const message = { ...toast, id: Math.random().toString(36).substring(7) };
        this.listeners.forEach((listener) => listener(message));
    },
    subscribe(listener: (toast: ToastMessage) => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
};

function GlobalToastContainer() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        return toastEmitter.subscribe((toast) => {
            setToasts((prev) => [...prev, toast]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }, 5000);
        });
    }, []);

    if (toasts.length === 0) return null;

    // Matches notification.html precisely: fixed top-20 right-6 z-50 flex flex-col gap-3 w-full max-w-sm
    return (
        <View
            style={[
                { position: 'absolute', zIndex: 1000, flexDirection: 'column', gap: 12 },
                Platform.OS === 'web'
                    ? { top: 80, right: 24, width: 384 }
                    : { top: 60, alignSelf: 'center', width: '100%', maxWidth: 384, paddingHorizontal: 16 }
            ]}
            pointerEvents="box-none"
        >
            {toasts.map((toast) => (
                <View
                    key={toast.id}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 16,
                        padding: 16,
                        borderRadius: 12,
                        backgroundColor: '#fef2f2', // bg-red-50 
                        borderColor: '#fecaca', // border-red-200
                        borderWidth: 1,
                        width: '100%',
                        shadowColor: '#991b1b',
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 5
                    }}
                >
                    <View style={{ flexShrink: 0, backgroundColor: '#ef4444', borderRadius: 9999, height: 24, width: 24, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="close" size={14} color="white" />
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ color: '#991b1b', fontSize: 14, fontWeight: 'bold' }}>{toast.title}</Text>
                        <Text style={{ color: '#b91c1c', fontSize: 12, marginTop: 2 }}>{toast.message}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} hitSlop={10}>
                        <MaterialCommunityIcons name="close" size={20} color="#f87171" style={{ opacity: 0.8 }} />
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}

// ── Global Error Handler ───────────────────────────
function handleGlobalError(error: unknown) {
    const odooToast = mapOdooError(error);
    if (odooToast) {
        console.error('Global Error Caught:', odooToast, error);
        toastEmitter.emit(odooToast);
    }
}

// ── TanStack Query client ──────────────────────────
const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: handleGlobalError,
    }),
    mutationCache: new MutationCache({
        onError: handleGlobalError,
    }),
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: (failureCount, error: Error & { name?: string }) => {
                // Do not retry terminal Odoo application errors
                if (
                    error.name === 'RpcError' ||
                    error.name === 'AccessDeniedError' ||
                    error.name === 'SessionExpiredError'
                ) {
                    return false;
                }
                // Otherwise, standard exponential backoff retries for network glitches
                return failureCount < 2;
            },
            refetchOnWindowFocus: false,
        },
    },
});

function SessionRestorer() {
    const { restoreSession } = useAuth();

    useEffect(() => {
        const url = process.env.EXPO_PUBLIC_ODOO_URL ?? '';
        const database = process.env.EXPO_PUBLIC_ODOO_DATABASE ?? '';
        restoreSession({ url: url.trim().replace(/\/$/, ''), database: database.trim() });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}

export default function RootLayout() {
    const [fontsLoaded, setFontsLoaded] = useState(false);

    useEffect(() => {
        async function prepare() {
            try {
                // Load from base64 data URI — no HTTP fetch, fully embedded in JS bundle.
                // This bypasses Metro's dev server interception of TTF/asset URLs.
                await Font.loadAsync({
                    [MATERIAL_COMMUNITY_FONT_FAMILY]: MATERIAL_COMMUNITY_FONT_DATA_URI,
                });
            } catch (e) {
                console.warn('Font loading error:', e);
            } finally {
                setFontsLoaded(true);
                await SplashScreen.hideAsync();
            }
        }
        prepare();
    }, []);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <OdooProvider
                clientOptions={{ sessionStorage: platformSessionStorage }}
                clientFactory={createOdooClient}
            >
                <SessionRestorer />
                <StatusBar style="auto" />
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(app)" options={{ headerShown: false }} />
                </Stack>
                <GlobalToastContainer />
            </OdooProvider>
        </QueryClientProvider>
    );
}

