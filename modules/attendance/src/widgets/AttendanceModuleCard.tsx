import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@odoo-portal/core';
import { useMyEmployee, useAttendanceRecords, useCheckInOut, useIsCheckedIn } from '../hooks.js';
import { fmtTime, fmtDate, fmtDayOnly, fmtMonthOnly, fmtDuration, odooToDate } from '@odoo-portal/core';

/**
 * Dashboard module card for the Attendance module.
 *
 * Shows check-in status, last clock-in time, and a quick
 * Clock In / Clock Out action button.
 *
 * Navigation is handled by the parent dashboard (via onPress prop).
 */
export default function AttendanceModuleCard({ onPress }: { onPress?: () => void }) {
    const { session, client } = useAuth();
    const { data: employee, isLoading: isEmpLoading } = useMyEmployee(client, session?.uid);
    const { data: isCheckedIn } = useIsCheckedIn(client, employee?.id);
    const { data: records = [] } = useAttendanceRecords(client, employee?.id, 0, 5);
    const checkInOut = useCheckInOut(client, session?.uid);

    // Find the most recent check-in time today
    const todayStr = new Date().toDateString();
    const todayRecords = records.filter(r => odooToDate(r.checkIn)?.toDateString() === todayStr);
    const latestRecord = todayRecords[0];
    const checkInTimeStr = latestRecord ? fmtTime(latestRecord.checkIn) : null;

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

    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
        >
            {/* Icon */}
            <View className="w-12 h-12 rounded-xl items-center justify-center mb-4 bg-primary/10">
                <MaterialCommunityIcons name="timer-outline" size={28} color="#3713ec" />
            </View>

            {/* Title */}
            <Text className="text-lg font-bold mb-1 text-slate-900">Attendance</Text>

            {/* Live status */}
            <View className="gap-0.5">
                {isEmpLoading ? (
                    <ActivityIndicator size="small" color="#3713ec" />
                ) : isCheckedIn ? (
                    <>
                        <Text className="text-sm text-slate-500">
                            Checked in at <Text className="text-slate-900 font-bold">{checkInTimeStr ?? '—'}</Text>
                        </Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                            <View className="w-2 h-2 rounded-full bg-success" />
                            <Text className="text-xs text-success font-bold">Active session</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <Text className="text-sm text-slate-500">Not checked in</Text>
                        <Text className="text-xs text-slate-400">Tap to check in</Text>
                    </>
                )}
            </View>

            {/* Quick action */}
            <View className="mt-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1">
                    <Text className="text-xs font-bold tracking-wide uppercase text-primary">
                        Open Module
                    </Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color="#3713ec" />
                </View>

                {/* Inline Clock In/Out button */}
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation?.();
                        handleCheckInOut();
                    }}
                    disabled={checkInOut.isPending || !employee}
                    className={`flex-row items-center gap-1 px-3 py-1.5 rounded-lg ${isCheckedIn ? 'bg-error/10' : 'bg-primary/10'
                        } ${checkInOut.isPending ? 'opacity-50' : ''}`}
                >
                    {checkInOut.isPending ? (
                        <ActivityIndicator size={12} color={isCheckedIn ? '#ef4444' : '#3713ec'} />
                    ) : (
                        <>
                            <MaterialCommunityIcons
                                name={isCheckedIn ? 'logout' : 'login'}
                                size={14}
                                color={isCheckedIn ? '#ef4444' : '#3713ec'}
                            />
                            <Text className={`text-[10px] font-bold ${isCheckedIn ? 'text-error' : 'text-primary'}`}>
                                {isCheckedIn ? 'Out' : 'In'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}
