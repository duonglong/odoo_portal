import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
        const allMetricWidgets: { order: number; node: React.ReactNode }[] = [];
        const allModuleCards: { order: number; node: React.ReactNode }[] = [];

        modules.forEach(reg => {
            let hasCustomModuleCard = false;
            
            if (reg.dashboardWidgets) {
                reg.dashboardWidgets.forEach(w => {
                    const path = reg.module.routes[0]?.path;
                    if (w.MetricCard) {
                        const Card = w.MetricCard as React.ComponentType;
                        allMetricWidgets.push({ order: w.order, node: <Card key={`metric-${w.id}`} /> });
                    }
                    if (w.ModuleCard) {
                        hasCustomModuleCard = true;
                        const Card = w.ModuleCard as React.ComponentType<{ onPress?: () => void }>;
                        allModuleCards.push({
                           order: w.order,
                           node: (
                              <Card 
                                  key={`module-${w.id}`} 
                                  onPress={() => {
                                      if (path) router.push(path as never);
                                  }} 
                              />
                           )
                        });
                    }
                });
            }

            if (!hasCustomModuleCard) {
                const path = reg.module.routes[0]?.path;
                allModuleCards.push({
                    order: 999, // default lowest priority
                    node: (
                        <TouchableOpacity
                            key={`generic-${reg.module.id}`}
                            onPress={() => {
                                if (path) router.push(path as never);
                            }}
                            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] flex flex-col"
                        >
                            <View className="w-12 h-12 rounded-xl items-center justify-center mb-4 bg-primary/10">
                                <MaterialCommunityIcons name={reg.module.icon as any} size={28} color="#3713ec" />
                            </View>
                            <Text className="text-lg font-bold mb-1 text-slate-900">{reg.module.name}</Text>
                            <View className="flex-1 min-h-[40px]" />
                            <View className="mt-4 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-xs font-bold tracking-wide uppercase text-primary">
                                        Open Module
                                    </Text>
                                    <MaterialCommunityIcons name="arrow-right" size={16} color="#3713ec" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    )
                });
            }
        });

        allMetricWidgets.sort((a, b) => a.order - b.order);
        allModuleCards.sort((a, b) => a.order - b.order);

        return {
            metricWidgets: allMetricWidgets.map(w => w.node),
            moduleCards: allModuleCards.map(w => w.node),
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
                    {metricWidgets}
                </View>
            )}

            {/* Module Cards — auto-discovered from accessible modules */}
            <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg md:text-xl font-bold text-slate-900">Your Modules</Text>
            </View>

            {moduleCards.length > 0 ? (
                <View className="flex-row flex-wrap gap-4 md:gap-6 mb-12">
                    {moduleCards}
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
