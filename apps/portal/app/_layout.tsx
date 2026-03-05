import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OdooProvider, createConnectionStore, ModuleRegistry, useAuth } from '@odoo-portal/core';
import { attendanceModule } from '@odoo-portal/attendance';
import { platformSessionStorage, asyncStorageAdapter } from '~/lib/storage';
import { createOdooClient } from '~/lib/create-client';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
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

// ── TanStack Query client ──────────────────────────
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});

// ── Zustand connection store ──
const useConnectionStore = createConnectionStore(() => asyncStorageAdapter);

function SessionRestorer() {
    const { restoreSession } = useAuth();
    const getActiveConnection = useConnectionStore((s) => s.getActiveConnection);

    useEffect(() => {
        const savedConn = getActiveConnection();
        if (savedConn) {
            restoreSession({ url: savedConn.url, database: savedConn.database });
        } else {
            restoreSession({ url: '', database: '' });
        }
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
            </OdooProvider>
        </QueryClientProvider>
    );
}

