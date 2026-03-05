import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
    Platform,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@odoo-portal/core';
import { useMyEmployee, useCheckInOut, useAttendanceRecords } from '../hooks.js';
import type { AttendanceRecord } from '../types.js';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDayOnly = (iso: string) =>
    new Date(iso).toLocaleDateString([], { day: '2-digit' });

const fmtMonthOnly = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: 'short' });

const fmtDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const CalendarSidebar = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const prevMonthDays = [28, 29, 30, 1, 2, 3, 4];

    return (
        <View className="flex flex-col gap-6 w-full lg:max-w-xs xl:max-w-sm shrink-0">
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <View className="flex-row items-center gap-2 mb-4">
                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#3713ec" />
                    <Text className="text-sm font-bold text-slate-900">Calendar View</Text>
                </View>

                <View className="gap-6">
                    {/* Current Month */}
                    <View className="flex-col">
                        <View className="flex-row justify-between items-center mb-2 px-1">
                            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">June 2024</Text>
                        </View>
                        <View className="flex-row flex-wrap">
                            {days.map((d, i) => (
                                <View key={i} className="w-[14%] items-center mb-2">
                                    <Text className="text-[10px] font-bold text-slate-400">{d}</Text>
                                </View>
                            ))}
                            <View className="w-[14%] items-center py-1"><Text className="text-xs text-slate-300">26</Text></View>
                            <View className="w-[14%] items-center py-1"><Text className="text-xs text-slate-300">27</Text></View>
                            <View className="w-[14%] items-center py-1"><Text className="text-xs text-slate-300">28</Text></View>
                            <View className="w-[14%] items-center py-1"><Text className="text-xs text-slate-300">29</Text></View>
                            <View className="w-[14%] items-center py-1"><Text className="text-xs text-slate-300">30</Text></View>
                            <View className="w-[14%] items-center py-1"><Text className="text-xs text-slate-300">31</Text></View>

                            {[1, 2, 3].map(d => (
                                <View key={d} className="w-[14%] items-center py-1"><Text className="text-xs font-medium text-slate-700">{d}</Text></View>
                            ))}

                            <View className="w-[14%] items-center py-1">
                                <View className="bg-primary-100 border border-primary-300 rounded-lg w-6 h-6 items-center justify-center">
                                    <Text className="text-xs font-bold text-primary-500">4</Text>
                                </View>
                            </View>

                            {[5, 6, 7, 8, 9, 10, 11, 12].map(d => (
                                <View key={d} className="w-[14%] items-center py-1"><Text className="text-xs font-medium text-slate-700">{d}</Text></View>
                            ))}
                        </View>
                    </View>

                    {/* Previous Month */}
                    <View className="flex-col opacity-50">
                        <View className="flex-row justify-between items-center mb-2 px-1">
                            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">May 2024</Text>
                        </View>
                        <View className="flex-row flex-wrap">
                            {days.map((d, i) => (
                                <View key={i} className="w-[14%] items-center mb-1">
                                    <Text className="text-[10px] font-bold text-slate-400">{d}</Text>
                                </View>
                            ))}
                            {prevMonthDays.map((d) => (
                                <View key={d} className="w-[14%] items-center py-0.5"><Text className="text-[10px] text-slate-700">{d}</Text></View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            <View className="bg-primary-50 rounded-xl p-5 border border-primary-200">
                <Text className="text-sm font-bold text-primary-600 mb-2">Need a leave?</Text>
                <Text className="text-xs text-slate-600 leading-relaxed mb-4">Request time off or manage your vacation schedule directly from here.</Text>
                <TouchableOpacity className="w-full bg-primary-500 rounded-lg py-2 items-center active:bg-primary-600">
                    <Text className="text-white text-xs font-bold">Go to Leaves</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const HealthSummaryCard = () => {
    const months = [
        { label: 'JAN', val: 75, color: 'bg-primary-200' },
        { label: 'FEB', val: 85, color: 'bg-primary-300' },
        { label: 'MAR', val: 60, color: 'bg-primary-200' },
        { label: 'APR', val: 95, color: 'bg-primary-500' },
        { label: 'MAY', val: 70, color: 'bg-primary-200' },
        { label: 'JUN', val: 80, color: 'bg-primary-400', active: true },
    ];

    return (
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <View className="flex-row justify-between items-start mb-8">
                <View className="flex-1">
                    <Text className="text-lg font-bold text-slate-900">Monthly Attendance Health</Text>
                    <Text className="text-sm text-slate-500">Overview of your punctuality and engagement.</Text>
                </View>
                <View className="items-end">
                    <Text className="text-3xl font-black text-primary-500 tracking-tight">94%</Text>
                    <View className="flex-row items-center gap-1 bg-success/10 px-2 py-0.5 rounded-full mt-1">
                        <MaterialCommunityIcons name="trending-up" size={16} color="#10b981" />
                        <Text className="text-success text-xs font-bold">+2.4% vs last month</Text>
                    </View>
                </View>
            </View>

            <View className="flex-row items-end justify-between h-32 gap-3 px-2">
                {months.map((m, i) => (
                    <View key={i} className="flex-1 flex-col items-center gap-2 h-full justify-end">
                        <View className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden" style={{ height: `${m.val}%` }}>
                            <View className={`absolute bottom-0 w-full rounded-t-lg ${m.color} ${m.active ? 'border-t-2 border-primary-500' : ''}`} style={{ height: '100%' }} />
                        </View>
                        <Text className={`text-[10px] font-bold ${m.active ? 'text-primary-500' : 'text-slate-400'}`}>{m.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AttendanceSummaryScreen() {
    const { session, client } = useAuth();

    const { data: employee, isLoading: isEmpLoading, refetch: refetchEmp, isRefetching: isEmpRefetching } = useMyEmployee(client, session?.uid);
    const { data: records = [], isLoading: isRecLoading, refetch: refetchRec, isRefetching: isRecRefetching } = useAttendanceRecords(client, employee?.id, 0, 10);
    const checkInOut = useCheckInOut(client, session?.uid);

    const isLoading = isEmpLoading || isRecLoading;
    const isRefetching = isEmpRefetching || isRecRefetching;

    const isCheckedIn = employee?.attendanceState === 'checked_in';
    const firstRecord = records[0];
    const activeDate = firstRecord ? new Date(firstRecord.checkIn) : new Date();

    const handleCheckInOut = () => {
        if (!employee) return;
        checkInOut.mutate(
            { employeeId: employee.id },
            {
                onError: (err: Error) => {
                    Alert.alert('Error', err.message || 'Could not process attendance action');
                },
            },
        );
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-surface">
                <ActivityIndicator size="large" color="#3713ec" />
            </View>
        );
    }

    const todayRecords = records.filter(r => new Date(r.checkIn).toDateString() === activeDate.toDateString());
    const totalWorkedHours = todayRecords.reduce((acc, r) => acc + (r.workedHours || 0), 0);

    return (
        <ScrollView
            className="flex-1 bg-surface"
            contentContainerClassName="pb-10"
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchEmp(); refetchRec(); }} tintColor="#3713ec" />}
        >
            <View className="max-w-[1440px] mx-auto w-full p-4 md:p-8 flex-col gap-8">

                {/* Breadcrumbs & Header */}
                <View className="flex-col gap-2">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-medium text-slate-500">Portal</Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color="#64748b" />
                        <Text className="text-sm font-medium text-primary-500">My Attendance</Text>
                    </View>

                    <View className="flex-col md:flex-row justify-between items-start md:items-end gap-4 mt-2">
                        <View className="flex-col gap-1 flex-shrink">
                            <Text className="text-3xl font-black text-slate-900 tracking-tight">Attendance Daily Log & Summary</Text>
                            <Text className="text-slate-500">Real-time tracking and monthly health trends for your work shifts.</Text>
                        </View>

                        <View className="flex-row gap-3 self-stretch md:self-auto">
                            <TouchableOpacity className="flex-row items-center justify-center gap-2 bg-primary-100 px-4 py-2.5 rounded-lg border border-primary-200">
                                <MaterialCommunityIcons name="download" size={18} color="#3713ec" />
                                <Text className="text-primary-600 font-bold text-sm">Export Log</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCheckInOut}
                                disabled={checkInOut.isPending}
                                className={`flex-row items-center justify-center gap-2 px-6 py-2.5 rounded-lg shadow-sm ${isCheckedIn ? 'bg-error shadow-error/20' : 'bg-primary-500 shadow-primary-500/30'
                                    } ${checkInOut.isPending ? 'opacity-70' : ''}`}
                            >
                                {checkInOut.isPending ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name={isCheckedIn ? 'logout' : 'login'} size={18} color="white" />
                                        <Text className="text-white font-bold text-sm">
                                            {isCheckedIn ? 'Clock Out' : 'Clock In'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="flex-col lg:flex-row gap-8 items-start">
                    {Platform.OS === 'web' ? (
                        <View className="hidden lg:flex"><CalendarSidebar /></View>
                    ) : null}

                    <View className="flex-1 flex-col gap-6 w-full">
                        <HealthSummaryCard />

                        {/* Daily Log Timeline Card */}
                        <View className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <View className="p-6 border-b border-slate-100 flex-row justify-between items-center bg-slate-50/50">
                                <View className="flex-row items-center gap-4">
                                    <View className="bg-white h-12 w-12 rounded-xl flex-col items-center justify-center border border-slate-200 shadow-sm">
                                        <Text className="text-[10px] font-bold uppercase text-slate-400 leading-none">{fmtMonthOnly(activeDate.toISOString())}</Text>
                                        <Text className="text-xl font-black text-slate-900 leading-none mt-1">{fmtDayOnly(activeDate.toISOString())}</Text>
                                    </View>
                                    <View>
                                        <Text className="font-bold text-slate-900 text-base">{activeDate.toLocaleDateString([], { weekday: 'long' })}'s Daily Log</Text>
                                        <View className="flex-row items-center gap-2 mt-0.5">
                                            <Text className="text-xs font-medium text-slate-500">{fmtDuration(totalWorkedHours)} total time</Text>
                                            <View className="w-1 h-1 rounded-full bg-slate-300" />
                                            <View className="flex-row items-center gap-1">
                                                <View className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-success' : 'bg-slate-400'}`} />
                                                <Text className={`text-xs font-bold ${isCheckedIn ? 'text-success' : 'text-slate-500'}`}>
                                                    {isCheckedIn ? 'Present' : 'Not Clocked In'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity className="w-8 h-8 items-center justify-center rounded-full">
                                    <MaterialCommunityIcons name="dots-vertical" size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <View className="p-8">
                                {todayRecords.length === 0 ? (
                                    <View className="items-center justify-center py-8 opacity-50">
                                        <MaterialCommunityIcons name="file-search-outline" size={48} color="#94a3b8" />
                                        <Text className="text-slate-500 font-medium mt-2">No attendance records today.</Text>
                                    </View>
                                ) : (
                                    <View className="relative flex-col">
                                        <View className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-slate-100" />

                                        {todayRecords.map((record, index) => (
                                            <View key={record.id} className="flex-col">
                                                <View className="relative flex-row items-start gap-6 mb-10">
                                                    <View className="z-10 h-12 w-12 rounded-full bg-emerald-50 border-4 border-white flex items-center justify-center">
                                                        <MaterialCommunityIcons name="login" size={20} color="#10b981" />
                                                    </View>
                                                    <View className="flex-col gap-1 pt-1.5 flex-1">
                                                        <View className="flex-row justify-between items-center pr-4">
                                                            <Text className="font-bold text-slate-900 text-base">Clock In</Text>
                                                            <Text className="text-sm font-bold text-slate-900">{fmtTime(record.checkIn)}</Text>
                                                        </View>
                                                        <Text className="text-sm text-slate-500">Manual clock-in</Text>
                                                    </View>
                                                </View>

                                                {record.checkOut ? (
                                                    <View className={`relative flex-row items-start gap-6 ${index !== todayRecords.length - 1 ? 'mb-10' : ''}`}>
                                                        <View className="z-10 h-12 w-12 rounded-full bg-rose-50 border-4 border-white flex items-center justify-center">
                                                            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
                                                        </View>
                                                        <View className="flex-col gap-1 pt-1.5 flex-1">
                                                            <View className="flex-row justify-between items-center pr-4">
                                                                <Text className="font-bold text-slate-900 text-base">Clock Out</Text>
                                                                <Text className="text-sm font-bold text-slate-900">{fmtTime(record.checkOut)}</Text>
                                                            </View>
                                                            <Text className="text-sm text-slate-500">Duration: {fmtDuration(record.workedHours)}</Text>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <View className="relative flex-row items-start gap-6">
                                                        <View className="z-10 h-12 w-12 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center">
                                                            <ActivityIndicator size="small" color="#64748b" />
                                                        </View>
                                                        <View className="flex-col gap-1 pt-3 flex-1">
                                                            <Text className="font-bold text-slate-400 italic">Currently working...</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View className="bg-slate-50 p-6 border-t border-slate-100 flex-row justify-between items-center">
                                <View className="flex-row gap-6">
                                    <View className="flex-col">
                                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Productivity</Text>
                                        <Text className="text-sm font-bold text-slate-900">92.4%</Text>
                                    </View>
                                    <View className="w-px h-8 bg-slate-200" />
                                    <View className="flex-col">
                                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Break</Text>
                                        <Text className="text-sm font-bold text-slate-900">1h 00m</Text>
                                    </View>
                                </View>
                                <TouchableOpacity>
                                    <Text className="text-primary-600 text-sm font-bold">View Detailed Stats</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Status Legend */}
                        <View className="flex-col md:flex-row gap-4 mb-10">
                            {[
                                { label: 'Present', sub: 'On Track', color: 'bg-success' },
                                { label: 'Late / Early', sub: 'Deviation', color: 'bg-warning' },
                                { label: 'Absent', sub: 'Action Required', color: 'bg-error' },
                            ].map(item => (
                                <View key={item.label} className="bg-white p-4 rounded-xl border border-slate-200 flex-1 flex-row items-center gap-3">
                                    <View className={`w-2 h-8 rounded-full ${item.color}`} />
                                    <View>
                                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</Text>
                                        <Text className="text-sm font-bold text-slate-900">{item.sub}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {Platform.OS !== 'web' ? (
                        <View className="flex lg:hidden"><CalendarSidebar /></View>
                    ) : null}
                </View>
            </View>
        </ScrollView>
    );
}
