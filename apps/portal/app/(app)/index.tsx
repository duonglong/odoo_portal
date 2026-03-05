import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth, useModules } from '@odoo-portal/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HomeScreen() {
    const { session } = useAuth();
    const modules = useModules();

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
                    Your organization overview for today. You have <Text className="text-odoo-primary font-bold">— items</Text> requiring attention.
                </Text>
            </View>

            {/* Metrics Row */}
            <View className="flex-row flex-wrap gap-4 mb-10">
                <MetricCard title="Hours Today" value="—" />
                <MetricCard title="Monthly Sales" value="—" />
                <MetricCard title="Pending Tasks" value="—" valueColor="text-odoo-primary" />
                <MetricCard title="System Status" value="—" valueColor="text-emerald-600" />
            </View>

            {/* Modules Section */}
            <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg md:text-xl font-bold text-slate-900">Your Modules</Text>
                <TouchableOpacity>
                    <Text className="text-odoo-primary text-sm font-bold">Customize Dashboard</Text>
                </TouchableOpacity>
            </View>

            {modules.length > 0 ? (
                <View className="flex-row flex-wrap gap-4 md:gap-6 mb-12">
                    {modules.map((reg) => {
                        const isAttendance = reg.module.name.toLowerCase().includes('attendance');
                        const isSales = reg.module.name.toLowerCase().includes('sale');

                        // Layout config for design match, values are empty
                        const config = isAttendance ? {
                            icon: 'timer-outline' as any,
                            bgColor: 'bg-primary/10',
                            iconColor: '#3713ec',
                            textColor: 'text-primary',
                            metricHtml: <Text className="text-sm text-slate-500">Checked in at <Text className="text-slate-900 font-bold">—</Text></Text>,
                            subtext: 'Shift: —',
                            action: 'Open Module',
                        } : isSales ? {
                            icon: 'cart-outline' as any,
                            bgColor: 'bg-amber-500/10',
                            iconColor: '#f59e0b',
                            textColor: 'text-amber-600',
                            metricHtml: <Text className="text-sm text-slate-900 font-bold">— Active Orders</Text>,
                            subtext: 'Total pipeline: —',
                            action: 'Manage Sales',
                        } : {
                            icon: 'cube-outline' as any,
                            bgColor: 'bg-indigo-500/10',
                            iconColor: '#6366f1',
                            textColor: 'text-indigo-600',
                            metricHtml: <Text className="text-sm text-slate-500">—</Text>,
                            subtext: '—',
                            action: 'Open Module',
                        };

                        return (
                            <TouchableOpacity
                                key={reg.module.id}
                                onPress={() => {
                                    const firstRoute = reg.module.routes[0];
                                    if (firstRoute) router.push(firstRoute.path as never);
                                }}
                                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
                            >
                                <View className={`w-12 h-12 rounded-xl items-center justify-center mb-4 ${config.bgColor}`}>
                                    <MaterialCommunityIcons name={config.icon} size={28} color={config.iconColor} />
                                </View>
                                <Text className="text-lg font-bold mb-1 text-slate-900">{reg.module.name}</Text>
                                <View className="gap-0.5">
                                    {config.metricHtml}
                                    <Text className="text-xs text-slate-400">{config.subtext}</Text>
                                </View>
                                <View className="mt-6 flex-row items-center gap-1">
                                    <Text className={`text-xs font-bold tracking-wide uppercase ${config.textColor}`}>
                                        {config.action}
                                    </Text>
                                    <MaterialCommunityIcons name="arrow-right" size={16} color={config.iconColor} />
                                </View>
                            </TouchableOpacity>
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

            {/* Recent Activity Section */}
            <View className="mb-12">
                <View className="flex-row items-center justify-between mb-5">
                    <Text className="text-lg md:text-xl font-bold text-slate-900">Recent Activity</Text>
                    <TouchableOpacity className="bg-slate-100 px-4 py-2 rounded-xl">
                        <Text className="text-slate-700 text-sm font-bold">View Logs</Text>
                    </TouchableOpacity>
                </View>

                {Platform.OS === 'web' ? (
                    /* Web Table View */
                    <View className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                        <View className="flex-row border-b border-slate-200 bg-slate-50 py-4 px-6">
                            <Text className="flex-1 text-xs font-bold uppercase text-slate-500 tracking-wider">Module</Text>
                            <Text className="flex-2 text-xs font-bold uppercase text-slate-500 tracking-wider">Description</Text>
                            <Text className="flex-1 text-xs font-bold uppercase text-slate-500 tracking-wider">User</Text>
                            <Text className="flex-1 text-xs font-bold uppercase text-slate-500 tracking-wider">Time</Text>
                            <Text className="flex-[0.5] text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Status</Text>
                        </View>

                        <ActivityRow module="—" dot="bg-slate-200" desc="—" user="—" time="—" status="—" statusColor="text-slate-400" statusBg="bg-slate-50" />
                        <ActivityRow module="—" dot="bg-slate-200" desc="—" user="—" time="—" status="—" statusColor="text-slate-400" statusBg="bg-slate-50" />
                        <ActivityRow module="—" dot="bg-slate-200" desc="—" user="—" time="—" status="—" statusColor="text-slate-400" statusBg="bg-slate-50" />
                    </View>
                ) : (
                    /* Mobile Card View */
                    <View className="gap-3">
                        <ActivityCard module="—" dot="bg-slate-200" desc="—" time="—" status="—" statusColor="text-slate-400" statusBg="bg-slate-50" />
                        <ActivityCard module="—" dot="bg-slate-200" desc="—" time="—" status="—" statusColor="text-slate-400" statusBg="bg-slate-50" />
                        <ActivityCard module="—" dot="bg-slate-200" desc="—" time="—" status="—" statusColor="text-slate-400" statusBg="bg-slate-50" />
                    </View>
                )}
            </View>

        </ScrollView>
    );
}

// Subcomponents

function MetricCard({ title, value, valueColor = 'text-slate-900' }: { title: string, value: string, valueColor?: string }) {
    return (
        <View className="bg-white p-5 rounded-3xl border border-slate-200 flex-1 min-w-[140px] md:min-w-[200px] shadow-sm">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</Text>
            <Text className={`text-2xl md:text-3xl font-extrabold mt-2 ${valueColor}`}>{value}</Text>
        </View>
    );
}

function ActivityRow({ module, dot, desc, user, time, status, statusColor, statusBg }: any) {
    return (
        <View className="flex-row items-center border-b border-slate-100 py-4 px-6 hover:bg-slate-50 transition-colors">
            <View className="flex-1 flex-row items-center gap-2">
                <View className={`w-2 h-2 rounded-full ${dot}`} />
                <Text className="text-sm font-bold text-slate-900">{module}</Text>
            </View>
            <View className="flex-2"><Text className="text-sm text-slate-600 font-bold">{desc}</Text></View>
            <View className="flex-1"><Text className="text-sm text-slate-600">{user}</Text></View>
            <View className="flex-1"><Text className="text-sm text-slate-500">{time}</Text></View>
            <View className="flex-[0.5] items-end">
                <View className={`px-2 py-1 rounded bg-emerald-100 ${statusBg}`}>
                    <Text className={`text-[10px] font-extrabold uppercase tracking-tighter ${statusColor}`}>{status}</Text>
                </View>
            </View>
        </View>
    );
}

function ActivityCard({ module, dot, desc, time, status, statusColor, statusBg }: any) {
    return (
        <View className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-row items-center justify-between">
            <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                    <View className={`w-2 h-2 rounded-full ${dot}`} />
                    <Text className="text-xs font-bold text-slate-500">{module}</Text>
                    <Text className="text-xs text-slate-400">• {time}</Text>
                </View>
                <Text className="text-sm text-slate-900 font-bold pr-2">{desc}</Text>
            </View>
            <View className={`px-2 py-1 rounded ${statusBg}`}>
                <Text className={`text-[10px] font-extrabold uppercase tracking-tighter ${statusColor}`}>{status}</Text>
            </View>
        </View>
    );
}
