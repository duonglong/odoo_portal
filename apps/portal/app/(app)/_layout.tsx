import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Slot, useRouter, usePathname, useRootNavigationState } from 'expo-router';
import { useAuth, useUserGroups, useModules, ModuleRegistry } from '@odoo-portal/core';
import { payslipModule } from '@odoo-portal/payslip';

// Register modules
ModuleRegistry.register(payslipModule);
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '@odoo-portal/settings';

export default function AppLayout() {
    const { session, logout, isSessionChecked, client } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { width } = useWindowDimensions();
    const { data: profile } = useProfile();

    // Fetch the user's real Odoo group XML IDs, then filter modules accordingly.
    // Groups are cached for the session lifetime (staleTime: Infinity).
    const userGroups = useUserGroups(client);
    const modules = useModules(userGroups);

    // ── Auth guard ─────────────────────────────────────────────────────────────
    // useRootNavigationState ensures the root Stack is mounted before we navigate.
    // Without this, router.replace() fires before the navigator exists → crash.
    const rootNavState = useRootNavigationState();
    const navReady = rootNavState?.key != null;

    useEffect(() => {
        if (!navReady) return;          // root navigator not mounted yet
        if (!isSessionChecked) return;  // still restoring session from storage
        if (!session) {
            router.replace('/(auth)/login');
        }
    }, [navReady, session, isSessionChecked, router]);

    // Show a loading screen while restoring session from storage
    if (!isSessionChecked || !session) {
        return (
            <View className="flex-1 items-center justify-center bg-surface">
                <ActivityIndicator size="large" color="#875A7B" />
            </View>
        );
    }
    // ──────────────────────────────────────────────────────────────────────────

    const isDesktop = width >= 768;

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const routes = [
        { name: 'Dashboard', path: '/', icon: 'view-dashboard-outline' },
        ...modules.flatMap(reg =>
            reg.module.routes.filter(r => r.showInNav).map(r => ({
                name: r.title,
                path: r.path,
                icon: r.icon ?? 'circle-outline',
            }))
        )
    ];

    // Find the most specific active route to avoid double highlighting (e.g., /attendance and /attendance/leave-request)
    const activeRoutePath = routes.reduce((bestMatch, route) => {
        // Special case: Since both /attendance/leave-list and /attendance/leave-request 
        // belong to "Leaves", let's make sure the "Leaves" tab stays highlighted 
        // when either is active. The route.path registered for Leaves is '/attendance/leave-list'.
        if (pathname.startsWith('/attendance/leave')) {
            return route.path === '/attendance/leave-list' ? route.path : bestMatch;
        }

        if (pathname === route.path || (route.path !== '/' && pathname.startsWith(route.path + '/'))) {
            if (!bestMatch || route.path.length > bestMatch.length) {
                return route.path;
            }
        }
        return bestMatch;
    }, '');

    const SidebarContent = () => (
        <>
            <View className="flex-row items-center gap-3 px-4 py-6">
                <View className="bg-primary w-10 h-10 rounded-xl items-center justify-center">
                    <MaterialCommunityIcons name="rocket-launch" size={24} color="white" />
                </View>
                <View>
                    <Text className="text-slate-900 text-base font-bold leading-none">Odoo Portal</Text>
                    <Text className="text-slate-500 text-xs mt-1"></Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-4">
                <View className="gap-2">
                    {routes.map((route) => {
                        // Fix double highlighting for paths like /attendance and /attendance/leave-request
                        const isActive = route.path === activeRoutePath;

                        return (
                            <TouchableOpacity
                                key={route.path}
                                onPress={() => router.push(route.path as never)}
                                className={`flex-row items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isActive
                                    ? 'bg-primary/10 border border-primary/20'
                                    : 'hover:bg-slate-200/50 border border-transparent'
                                    }`}
                            >
                                <MaterialCommunityIcons
                                    name={route.icon as any}
                                    size={22}
                                    color={isActive ? '#3713ec' : '#64748b'}
                                />
                                <Text className={`text-sm ${isActive ? 'font-bold text-primary' : 'font-medium text-slate-600'
                                    }`}>
                                    {route.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View className="p-4 mt-auto border-t border-slate-200">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                        <View className="w-9 h-9 rounded-full bg-slate-200 items-center justify-center overflow-hidden border border-slate-300">
                            {profile?.image1920 ? (
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${profile.image1920}` }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text className="text-slate-500 font-bold uppercase">{session?.name?.charAt(0) || 'U'}</Text>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-slate-900 text-sm font-bold truncate" numberOfLines={1}>
                                {session?.name || 'User'}
                            </Text>
                            <Text className="text-slate-500 text-xs truncate" numberOfLines={1}>
                                {session?.username}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleLogout} className="p-2">
                        <MaterialCommunityIcons name="logout" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );

    const MobileTabBar = () => (
        <View className="flex-row items-center justify-around bg-white border-t border-slate-200 pb-safe pt-2 px-2 shadow-xl shadow-black/5">
            {routes.slice(0, 4).map((route) => {
                // To prevent double highlights (e.g. /attendance vs /attendance/leave-request), 
                // we exact-match or check if it's a true parent route rather than a sibling.
                const isActive = route.path === activeRoutePath;
                return (
                    <TouchableOpacity
                        key={route.path}
                        onPress={() => router.push(route.path as never)}
                        className="items-center justify-center p-2 min-w-[64px]"
                    >
                        <MaterialCommunityIcons
                            name={isActive ? (route.icon.replace('-outline', '') as any) : (route.icon as any)}
                            size={24}
                            color={isActive ? '#3713ec' : '#94a3b8'}
                        />
                        <Text className={`text-[10px] mt-1 ${isActive ? 'font-bold text-primary' : 'font-medium text-slate-500'}`}>
                            {route.name}
                        </Text>
                    </TouchableOpacity>
                );
            })}
            <TouchableOpacity onPress={handleLogout} className="items-center justify-center p-2 min-w-[64px]">
                <MaterialCommunityIcons name="logout" size={24} color="#ef4444" />
                <Text className="text-[10px] mt-1 font-medium text-error flex-wrap">Logout</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-surface md:flex-row" edges={['top', 'left', 'right']}>

            {/* Desktop Sidebar */}
            {isDesktop && (
                <View className="w-64 bg-slate-50 border-r border-slate-200 h-full">
                    <SidebarContent />
                </View>
            )}

            {/* Main Content Area */}
            <View className="flex-1 bg-white flex-col h-full overflow-hidden">
                {/* Mobile Header */}
                {!isDesktop && (
                    <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200 bg-white z-10">
                        <View className="flex-row items-center gap-2">
                            <View className="bg-primary w-8 h-8 rounded-lg items-center justify-center">
                                <MaterialCommunityIcons name="rocket-launch" size={18} color="white" />
                            </View>
                            <Text className="text-slate-900 font-bold">Odoo Portal</Text>
                        </View>
                        <View className="flex-row items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <Text className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">v{session?.serverVersion}</Text>
                        </View>
                    </View>
                )}

                {/* Desktop Header */}
                {isDesktop && (
                    <View className="h-16 border-b border-slate-200 bg-white flex-row items-center justify-between px-8 z-20 shrink-0">
                        <View className="flex-row items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 flex-1 max-w-md">
                            <MaterialCommunityIcons name="magnify" size={20} color="#64748b" />
                            <Text className="text-slate-400 font-medium text-sm">Search resources...</Text>
                        </View>

                        <View className="flex-row items-center gap-6">
                            <View className="flex-row items-center gap-4 border-r border-slate-200 pr-6 mr-2">
                                <TouchableOpacity className="relative">
                                    {/* <MaterialCommunityIcons name="bell-outline" size={22} color="#64748b" /> */}
                                    {/* <View className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full border-2 border-white" /> */}
                                </TouchableOpacity>
                                <TouchableOpacity>
                                    {/* <MaterialCommunityIcons name="help-circle-outline" size={22} color="#64748b" /> */}
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row items-center gap-4">
                                <Text className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Content Slot overrides the Tabs behavior and just renders the current route */}
                <View className="flex-1">
                    <Slot />
                </View>

                {/* Mobile Bottom Bar */}
                {!isDesktop && <MobileTabBar />}
            </View>

        </SafeAreaView>
    );
}
