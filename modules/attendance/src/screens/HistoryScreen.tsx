import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    SectionList,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@odoo-portal/core';
import { useMyEmployee, useAttendanceRecords } from '../hooks.js';
import type { AttendanceRecord } from '../types.js';
import { fmtDate, fmtTime, fmtDuration } from '../utils.js';

const PAGE_SIZE = 40;

// ── Group records by calendar date ────────────────────────────────────────────

function groupByDate(records: AttendanceRecord[]): Array<{ title: string; data: AttendanceRecord[] }> {
    const map = new Map<string, AttendanceRecord[]>();
    for (const r of records) {
        const key = fmtDate(r.checkIn); // e.g. "Mon, Mar 5"
        const existing = map.get(key) ?? [];
        existing.push(r);
        map.set(key, existing);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ── Row component ─────────────────────────────────────────────────────────────

function AttendanceRow({ record }: { record: AttendanceRecord }) {
    const isOpen = !record.checkOut;
    return (
        <View className="bg-white mx-4 mb-1.5 rounded-xl px-4 py-3 border border-slate-100 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
                {/* In/Out indicator */}
                <View className={`w-2 h-10 rounded-full ${isOpen ? 'bg-success' : 'bg-slate-200'}`} />
                <View>
                    <View className="flex-row items-center gap-2">
                        <MaterialCommunityIcons name="login" size={12} color="#10b981" />
                        <Text className="text-slate-900 text-sm font-semibold">{fmtTime(record.checkIn)}</Text>
                        {record.checkOut && (
                            <>
                                <Text className="text-slate-300 text-xs">→</Text>
                                <MaterialCommunityIcons name="logout" size={12} color="#ef4444" />
                                <Text className="text-slate-700 text-sm">{fmtTime(record.checkOut)}</Text>
                            </>
                        )}
                    </View>
                    {isOpen && (
                        <View className="flex-row items-center gap-1 mt-0.5">
                            <View className="w-1.5 h-1.5 rounded-full bg-success" />
                            <Text className="text-success text-xs font-medium">In Progress</Text>
                        </View>
                    )}
                </View>
            </View>
            <Text className="text-slate-900 text-sm font-bold">
                {isOpen ? '–' : fmtDuration(record.workedHours)}
            </Text>
        </View>
    );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, totalHours }: { title: string; totalHours: number }) {
    return (
        <View className="flex-row justify-between items-center px-4 py-2 bg-surface">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</Text>
            <Text className="text-xs font-semibold text-slate-400">{fmtDuration(totalHours)}</Text>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AttendanceHistoryScreen() {
    const { session, client } = useAuth();
    const [page, setPage] = useState(0);

    const { data: employee } = useMyEmployee(client, session?.uid);
    const { data: records = [], isLoading, isFetching, error } = useAttendanceRecords(
        client,
        employee?.id,
        page,
        PAGE_SIZE,
    );

    const sections = useMemo(() => groupByDate(records), [records]);

    // Compute daily totals for each section header
    const sectionHours = useMemo(() => {
        const map = new Map<string, number>();
        for (const s of sections) {
            map.set(s.title, s.data.reduce((acc, r) => acc + (r.workedHours ?? 0), 0));
        }
        return map;
    }, [sections]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-surface items-center justify-center">
                <ActivityIndicator color="#3713ec" />
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-surface items-center justify-center px-6">
                <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#ef4444" />
                <Text className="text-error text-sm text-center mt-2">{error.message}</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface">
            <SectionList<AttendanceRecord, { title: string; data: AttendanceRecord[] }>
                sections={sections}
                keyExtractor={(r) => String(r.id)}
                renderItem={({ item }) => <AttendanceRow record={item} />}
                renderSectionHeader={({ section }) => (
                    <SectionHeader
                        title={section.title}
                        totalHours={sectionHours.get(section.title) ?? 0}
                    />
                )}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                ListHeaderComponent={
                    <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest px-4 pb-2">
                        Attendance History
                    </Text>
                }
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#cbd5e1" />
                        <Text className="text-slate-400 text-sm mt-3">No records found</Text>
                    </View>
                }
                ListFooterComponent={
                    <View className="flex-row gap-3 justify-center py-4 px-4">
                        {page > 0 && (
                            <TouchableOpacity
                                className="flex-1 bg-white rounded-lg px-4 py-2.5 border border-slate-200 items-center flex-row justify-center gap-2"
                                onPress={() => setPage((p) => Math.max(0, p - 1))}
                                disabled={isFetching}
                            >
                                <MaterialCommunityIcons name="chevron-left" size={16} color="#475569" />
                                <Text className="text-slate-700 text-sm font-semibold">Previous</Text>
                            </TouchableOpacity>
                        )}
                        {records.length === PAGE_SIZE && (
                            <TouchableOpacity
                                className="flex-1 bg-white rounded-lg px-4 py-2.5 border border-slate-200 items-center flex-row justify-center gap-2"
                                onPress={() => setPage((p) => p + 1)}
                                disabled={isFetching}
                            >
                                <Text className="text-slate-700 text-sm font-semibold">Next</Text>
                                <MaterialCommunityIcons name="chevron-right" size={16} color="#475569" />
                            </TouchableOpacity>
                        )}
                        {isFetching && <ActivityIndicator size="small" color="#3713ec" />}
                    </View>
                }
            />
        </View>
    );
}
