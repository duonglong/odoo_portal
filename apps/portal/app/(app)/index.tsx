import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth, useModules, useUserGroups } from '@odoo-portal/core';
import type { DashboardWidget } from '@odoo-portal/core';

/**
 * Home / Dashboard Screen
 *
 * Fully dynamic — auto-discovers dashboard widgets from accessible modules.
 * Each user only sees widgets matching their Odoo groups:
 *   - HR user → attendance metrics + card
 *   - Sales user → sales metrics + card (when that module exists)
 *   - Manager → everything
 */
export default function HomeScreen() {
    const { session, client } = useAuth();
    const userGroups = useUserGroups(client);
    const modules = useModules(userGroups);

    // Collect widgets from accessible modules, sorted by order
    const { metricWidgets, moduleCards } = useMemo(() => {
        const allWidgets: (DashboardWidget & { modulePath?: string })[] = modules.flatMap(reg =>
            (reg.dashboardWidgets ?? []).map(w => ({
                ...w,
                modulePath: reg.module.routes[0]?.path,
            })),
        );

        return {
            metricWidgets: allWidgets.filter(w => w.MetricCard).sort((a, b) => a.order - b.order),
            moduleCards: allWidgets.filter(w => w.ModuleCard).sort((a, b) => a.order - b.order),
        };
    }, [modules]);

    return (
        <ScrollView
            className="flex-1 bg-surface"
            contentContainerClassName="p-4 md:p-8 max-w-7xl mx-auto w-full"
        >
            {/* Greeting Header */}
            <View className="mb-8 mt-2 md:mt-0">
                <Text className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                    Welcome back, {session?.name?.split(' ')[0] ?? 'User'}
                </Text>
                <Text className="text-slate-500 mt-1 md:text-base">
                    Your organization overview for today.
                </Text>
            </View>

            {/* Metrics Row — auto-discovered from accessible modules */}
            {metricWidgets.length > 0 && (
                <View className="flex-row flex-wrap gap-4 mb-10">
                    {metricWidgets.map(w => {
                        const Card = w.MetricCard! as React.ComponentType;
                        return <Card key={w.id} />;
                    })}
                </View>
            )}

            {/* Module Cards — auto-discovered from accessible modules */}
            <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg md:text-xl font-bold text-slate-900">Your Modules</Text>
            </View>

            {moduleCards.length > 0 ? (
                <View className="flex-row flex-wrap gap-4 md:gap-6 mb-12">
                    {moduleCards.map(w => {
                        const Card = w.ModuleCard! as React.ComponentType<{ onPress?: () => void }>;
                        return (
                            <Card
                                key={w.id}
                                onPress={() => {
                                    if (w.modulePath) router.push(w.modulePath as never);
                                }}
                            />
                        );
                    })}
                </View>
            ) : (
                <View className="items-center py-12 bg-white rounded-3xl border border-slate-200 mb-12">
                    <Text className="text-4xl mb-4">📦</Text>
                    <Text className="text-slate-500 text-center">
                        No modules available.{'\n'}Install feature modules to get started.
                    </Text>
                </View>
            )}

            {/* Recent Activity — future: modules will contribute activity items */}
            {Platform.OS === 'web' && (
                <View className="mb-12">
                    <View className="flex-row items-center justify-between mb-5">
                        <Text className="text-lg md:text-xl font-bold text-slate-900">Recent Activity</Text>
                    </View>
                    <View className="items-center py-8 bg-white rounded-3xl border border-slate-200 opacity-50">
                        <Text className="text-slate-500 text-sm">Activity feed coming soon</Text>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}
