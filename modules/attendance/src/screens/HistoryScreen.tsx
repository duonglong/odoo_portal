import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { useAuth } from '@odoo-portal/core';
import { useMyEmployee, useAttendanceRecords } from '../hooks.js';
import type { AttendanceRecord } from '../types.js';

const PAGE_SIZE = 20;

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], {
        weekday: 'short', month: 'short', day: 'numeric',
    });

const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
};

function AttendanceRow({ record }: { record: AttendanceRecord }) {
    const isOpen = !record.checkOut;
    return (
        <View className="bg-surface-card rounded-card p-4 mb-2 border border-surface-border">
            <View className="flex-row justify-between items-start">
                <Text className="text-text-secondary text-xs">{fmtDate(record.checkIn)}</Text>
                {isOpen ? (
                    <View className="bg-success/20 px-2 py-0.5 rounded-full">
                        <Text className="text-success text-xs font-medium">In Progress</Text>
                    </View>
                ) : (
                    <Text className="text-text-primary text-sm font-semibold">
                        {fmtDuration(record.workedHours)}
                    </Text>
                )}
            </View>
            <View className="flex-row mt-2 gap-4">
                <View className="flex-row items-center gap-1">
                    <Text className="text-success text-xs">↑</Text>
                    <Text className="text-text-primary text-sm">{fmtTime(record.checkIn)}</Text>
                </View>
                {record.checkOut && (
                    <View className="flex-row items-center gap-1">
                        <Text className="text-error text-xs">↓</Text>
                        <Text className="text-text-primary text-sm">{fmtTime(record.checkOut)}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

export default function AttendanceHistoryScreen() {
    const { session, client } = useAuth();
    const [page, setPage] = useState(0);

    const { data: employee } = useMyEmployee(client, session?.uid);

    const {
        data: records = [],
        isLoading,
        isFetching,
        error,
    } = useAttendanceRecords(client, employee?.id, page, PAGE_SIZE);

    if (isLoading) {
        return (
            <View className="flex-1 bg-surface items-center justify-center">
                <ActivityIndicator color="#6366f1" />
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 bg-surface items-center justify-center px-6">
                <Text className="text-error text-sm text-center">{error.message}</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface">
            <FlatList<AttendanceRecord>
                data={records}
                keyExtractor={(r) => String(r.id)}
                renderItem={({ item }) => <AttendanceRow record={item} />}
                contentContainerClassName="px-4 py-4"
                ListHeaderComponent={
                    <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">
                        Attendance History
                    </Text>
                }
                ListEmptyComponent={
                    <View className="items-center py-16">
                        <Text className="text-4xl mb-3">📋</Text>
                        <Text className="text-text-secondary text-sm">No records found</Text>
                    </View>
                }
                ListFooterComponent={
                    records.length === PAGE_SIZE ? (
                        <View className="flex-row gap-3 justify-center py-4">
                            {page > 0 && (
                                <TouchableOpacity
                                    className="bg-surface-card rounded-button px-4 py-2 border border-surface-border"
                                    onPress={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={isFetching}
                                >
                                    <Text className="text-text-primary text-sm">← Prev</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                className="bg-surface-card rounded-button px-4 py-2 border border-surface-border"
                                onPress={() => setPage((p) => p + 1)}
                                disabled={isFetching}
                            >
                                <Text className="text-text-primary text-sm">Next →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}
