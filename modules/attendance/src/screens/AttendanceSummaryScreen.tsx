import React, { useState, useMemo } from 'react';
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
import { useAuth, useOdooErrorToast, mapOdooError } from '@odoo-portal/core';
import { useMyEmployee, useCheckInOut, useAttendanceRecords, useMonthAttendance } from '../hooks.js';
import { useRouter } from 'expo-router';
import type { AttendanceRecord } from '../types.js';

import { fmtTime, fmtDate, fmtDayOnly, fmtMonthOnly, fmtDuration, odooToDate } from '@odoo-portal/core';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWeekend(date: Date): boolean {
    const d = date.getDay();
    return d === 0 || d === 6;
}

function isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
}

/** Build a simple attendance % for a month from attendance records vs work days */
function calcMonthStats(year: number, month: number, records: AttendanceRecord[]) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const workDays: Date[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!isWeekend(date) && date <= today) workDays.push(date);
    }

    const presentSet = new Set(records.map(r => odooToDate(r.checkIn)?.toDateString()));
    const presentCount = workDays.filter(d => presentSet.has(d.toDateString())).length;

    return workDays.length > 0 ? Math.round((presentCount / workDays.length) * 100) : 0;
}

// ── CalendarSidebar ───────────────────────────────────────────────────────────

interface CalendarSidebarProps {
    currentMonthRecords: AttendanceRecord[];
    activeDate: Date;
    onSelectDate: (date: Date) => void;
    displayDate: Date;
    setDisplayDate: (date: Date) => void;
}

const CalendarSidebar = ({ currentMonthRecords, activeDate, onSelectDate, displayDate, setDisplayDate }: CalendarSidebarProps) => {
    const router = useRouter();
    const today = new Date();
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth(); // 0-indexed
    const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const presentSet = useMemo(
        () => new Set(currentMonthRecords.map(r => odooToDate(r.checkIn)?.toDateString())),
        [currentMonthRecords],
    );

    // Current month grid
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDow = firstOfMonth.getDay();

    // Previous month grid (just 7 days for the mini preview)
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
    const prevMonthDays = Array.from({ length: 7 }, (_, i) => daysInPrevMonth - 6 + i);

    const handlePrevMonth = () => setDisplayDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setDisplayDate(new Date(year, month + 1, 1));

    function renderCell(day: number | null, dateObj?: Date) {
        if (day === null || !dateObj) return <View key={Math.random()} className="w-[14%] items-center py-1" />;
        const todayFlag = isToday(dateObj);
        const present = presentSet.has(dateObj.toDateString());
        const isActive = activeDate.toDateString() === dateObj.toDateString();

        return (
            <TouchableOpacity
                key={day}
                className="w-[14%] items-center py-1"
                onPress={() => onSelectDate(dateObj)}
            >
                {isActive ? (
                    <View className="bg-primary-500 rounded-lg w-6 h-6 items-center justify-center shadow-sm">
                        <Text className="text-[11px] font-bold text-white">{day}</Text>
                    </View>
                ) : todayFlag ? (
                    <View className="bg-primary-100 border border-primary-300 rounded-lg w-6 h-6 items-center justify-center">
                        <Text className="text-[11px] font-bold text-primary-600">{day}</Text>
                    </View>
                ) : present ? (
                    <View className="bg-success/10 rounded-md w-6 h-6 items-center justify-center">
                        <Text className="text-[11px] font-semibold text-success">{day}</Text>
                    </View>
                ) : (
                    <View className="w-6 h-6 items-center justify-center">
                        <Text className="text-[11px] font-medium text-slate-700">{day}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <View className="flex flex-col gap-6 w-full lg:max-w-xs xl:max-w-sm shrink-0">
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-2">
                        <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#3713ec" />
                        <Text className="text-sm font-bold text-slate-900">Calendar</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity onPress={handlePrevMonth} className="w-8 h-8 items-center justify-center rounded-full bg-slate-50 border border-slate-200 active:bg-slate-100">
                            <MaterialCommunityIcons name="chevron-left" size={20} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNextMonth} className="w-8 h-8 items-center justify-center rounded-full bg-slate-50 border border-slate-200 active:bg-slate-100">
                            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="gap-6">
                    {/* Current Month */}
                    <View className="flex-col">
                        <View className="flex-row justify-between items-center mb-2 px-1">
                            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {displayDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                            </Text>
                        </View>
                        <View className="flex-row flex-wrap">
                            {DAY_LABELS.map((d, i) => (
                                <View key={i} className="w-[14%] items-center mb-2">
                                    <Text className="text-[10px] font-bold text-slate-400">{d}</Text>
                                </View>
                            ))}
                            {/* Leading empty cells */}
                            {Array.from({ length: startDow }).map((_, i) => (
                                <View key={`e${i}`} className="w-[14%] items-center py-1" />
                            ))}
                            {/* Day cells */}
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                                const dateObj = new Date(year, month, d);
                                return renderCell(d, dateObj);
                            })}
                        </View>
                    </View>

                    {/* Previous Month mini-preview */}
                    <View className="flex-col opacity-50">
                        <View className="flex-row justify-between items-center mb-2 px-1">
                            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {new Date(prevYear, prevMonth, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                            </Text>
                        </View>
                        <View className="flex-row flex-wrap">
                            {DAY_LABELS.map((d, i) => (
                                <View key={i} className="w-[14%] items-center mb-1">
                                    <Text className="text-[10px] font-bold text-slate-400">{d}</Text>
                                </View>
                            ))}
                            {prevMonthDays.map(d => (
                                <View key={d} className="w-[14%] items-center py-0.5">
                                    <Text className="text-[10px] text-slate-700">{d}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            <View className="bg-primary-50 rounded-xl p-5 border border-primary-200">
                <Text className="text-sm font-bold text-primary-600 mb-2">Need a leave?</Text>
                <Text className="text-xs text-slate-600 leading-relaxed mb-4">
                    Request time off or manage your vacation schedule directly from here.
                </Text>
                <TouchableOpacity
                    onPress={() => router.push('/attendance/leave-request')}
                    className="w-full bg-primary-500 rounded-lg py-2 items-center active:bg-primary-600"
                >
                    <Text className="text-white text-xs font-bold">Go to Leaves</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ── HealthSummaryCard ─────────────────────────────────────────────────────────

interface HealthSummaryCardProps {
    employee: { id: number } | null | undefined;
}

const HealthSummaryCard = ({ employee }: HealthSummaryCardProps) => {
    const { client } = useAuth();
    const today = new Date();

    // Last 6 months
    const months = useMemo(() => {
        const result: { year: number; month: number; label: string }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            result.push({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                label: d.toLocaleDateString([], { month: 'short' }).toUpperCase(),
            });
        }
        return result;
    }, []);

    // We only fetch current month and last month to keep it lean.
    // For the bar chart we'll compute from the most recent month's records.
    const currentMonth = months[5]!;
    const { data: currentRecords = [] } = useMonthAttendance(
        client,
        employee?.id,
        currentMonth.year,
        currentMonth.month,
    );

    const currentPct = calcMonthStats(currentMonth.year, currentMonth.month, currentRecords);

    const prevMonth = months[4]!;
    const { data: prevRecords = [] } = useMonthAttendance(
        client,
        employee?.id,
        prevMonth.year,
        prevMonth.month,
    );
    const prevPct = calcMonthStats(prevMonth.year, prevMonth.month, prevRecords);
    const delta = currentPct - prevPct;

    // Build rough bar heights — only real data for last 2 months, fade older ones
    const barData = months.map((m, i) => {
        if (i === 5) return { label: m.label, val: currentPct, active: true };
        if (i === 4) return { label: m.label, val: prevPct, active: false };
        // Earlier months: placeholder at 70–90 range (no data fetched to keep it light)
        return { label: m.label, val: 75 + (i * 5) % 20, active: false };
    });

    const barColors = ['bg-primary-200', 'bg-primary-300', 'bg-primary-200', 'bg-primary-300', 'bg-primary-200', 'bg-primary-400'];

    return (
        <View className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <View className="flex-row justify-between items-start mb-8">
                <View className="flex-1">
                    <Text className="text-lg font-bold text-slate-900">Monthly Attendance Health</Text>
                    <Text className="text-sm text-slate-500">Overview of your punctuality and engagement.</Text>
                </View>
                <View className="items-end">
                    <Text className="text-3xl font-black text-primary-500 tracking-tight">{currentPct}%</Text>
                    <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full mt-1 ${delta >= 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                        <MaterialCommunityIcons
                            name={delta >= 0 ? 'trending-up' : 'trending-down'}
                            size={16}
                            color={delta >= 0 ? '#10b981' : '#ef4444'}
                        />
                        <Text className={`text-xs font-bold ${delta >= 0 ? 'text-success' : 'text-error'}`}>
                            {delta >= 0 ? '+' : ''}{delta}% vs last month
                        </Text>
                    </View>
                </View>
            </View>

            <View className="flex-row items-end justify-between h-32 gap-3 px-2">
                {barData.map((m, i) => (
                    <View key={i} className="flex-1 flex-col items-center gap-2 h-full justify-end">
                        <View className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden" style={{ height: `${m.val}%` }}>
                            <View className={`absolute bottom-0 w-full rounded-t-lg ${barColors[i]} ${m.active ? 'border-t-2 border-primary-500' : ''}`} style={{ height: '100%' }} />
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
    const checkInOut = useCheckInOut(client, session?.uid);

    const [activeDate, setActiveDate] = useState<Date>(new Date());
    const [displayDate, setDisplayDate] = useState<Date>(() => new Date());

    // Fetch records specifically for the calendar's display month
    const {
        data: monthRecords = [],
        isLoading: isRecLoading,
        refetch: refetchRec,
        isRefetching: isRecRefetching
    } = useMonthAttendance(client, employee?.id, displayDate.getFullYear(), displayDate.getMonth() + 1);

    const isLoading = isEmpLoading || isRecLoading;
    const isRefetching = isEmpRefetching || isRecRefetching;
    const isCheckedIn = employee?.attendanceState === 'checked_in';

    // Derive active day logs from the fetched month records
    const todayRecords = monthRecords
        .filter(r => odooToDate(r.checkIn)?.toDateString() === activeDate.toDateString())
        .sort((a, b) => (odooToDate(a.checkIn)?.getTime() ?? 0) - (odooToDate(b.checkIn)?.getTime() ?? 0));

    // Derive toast from current mutation state
    const checkInOutToast = useOdooErrorToast(checkInOut.error);

    const handleCheckInOut = () => {
        if (!employee) return;
        checkInOut.mutate(
            { employeeId: employee.id },
            {
                onError: (err: unknown) => {
                    const toast = mapOdooError(err);
                    Alert.alert(
                        toast?.title ?? 'Error',
                        toast?.message ?? 'Could not process attendance action',
                    );
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

    const totalWorkedHours = todayRecords.reduce((acc, curr) => acc + (curr.workedHours ?? 0), 0);

    return (
        <View className="flex-1 bg-surface">
            <ScrollView
                className="flex-1"
                contentContainerClassName="p-4 md:p-8"
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetchEmp(); refetchRec(); }} tintColor="#3713ec" />}
            >
                {/* Header & Controls */}
                <View className="flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <View>
                        <Text className="text-3xl font-black text-slate-900 tracking-tight">Attendance Daily Log & Summary</Text>
                        <Text className="text-base text-slate-500 mt-1">Select a date to view check-in timelines and manage your shifts.</Text>
                    </View>

                    <View className="flex-row items-center gap-3">
                        {checkInOutToast && (
                            <View className="bg-error/10 px-3 py-2 rounded-lg flex-row items-center gap-2">
                                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#ef4444" />
                                <Text className="text-xs font-bold text-error">{checkInOutToast.title}</Text>
                            </View>
                        )}
                        <View className="shadow-sm shadow-black/5">
                            <TouchableOpacity
                                onPress={handleCheckInOut}
                                disabled={checkInOut.isPending}
                                className={`flex-row items-center justify-center gap-2 px-6 py-3 rounded-xl border ${isCheckedIn
                                    ? 'bg-white border-slate-200 active:bg-slate-50'
                                    : 'bg-primary-600 border-primary-600 active:bg-primary-700'
                                    } ${checkInOut.isPending ? 'opacity-70' : ''}`}
                            >
                                {checkInOut.isPending ? (
                                    <ActivityIndicator size="small" color={isCheckedIn ? '#64748b' : '#ffffff'} />
                                ) : (
                                    <>
                                        <MaterialCommunityIcons
                                            name={isCheckedIn ? 'logout' : 'login'}
                                            size={20}
                                            color={isCheckedIn ? '#ef4444' : '#ffffff'}
                                        />
                                        <Text className={`text-sm font-bold ${isCheckedIn ? 'text-slate-700' : 'text-white'}`}>
                                            {isCheckedIn ? 'Clock Out' : 'Clock In Now'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="flex-col lg:flex-row gap-8 items-start">
                    {Platform.OS === 'web' ? (
                        <View className="hidden lg:flex">
                            <CalendarSidebar
                                currentMonthRecords={monthRecords}
                                activeDate={activeDate}
                                onSelectDate={setActiveDate}
                                displayDate={displayDate}
                                setDisplayDate={setDisplayDate}
                            />
                        </View>
                    ) : null}

                    <View className="flex-1 flex-col gap-6 w-full">
                        <HealthSummaryCard employee={employee} />

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

                            <ScrollView className="max-h-[380px]" contentContainerClassName="p-8" showsVerticalScrollIndicator={true}>
                                {todayRecords.length === 0 ? (
                                    <View className="items-center justify-center py-8 opacity-50">
                                        <MaterialCommunityIcons name="file-search-outline" size={48} color="#94a3b8" />
                                        <Text className="text-slate-500 font-medium mt-2">No attendance records for this date.</Text>
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
                                                        <View className="z-10 h-12 w-12 rounded-full bg-success/10 border-4 border-white flex items-center justify-center">
                                                            <MaterialCommunityIcons name="clock-outline" size={22} color="#10b981" />
                                                        </View>
                                                        <View className="flex-col gap-1 pt-2 flex-1">
                                                            <View className="flex-row items-center gap-2">
                                                                <View className="w-2 h-2 rounded-full bg-success" />
                                                                <Text className="font-bold text-success text-sm">In Progress</Text>
                                                            </View>
                                                            <Text className="text-slate-400 text-xs">Clock out to complete your shift</Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>

                            {/* Footer stats */}
                            <View className="bg-slate-50 p-6 border-t border-slate-100 flex-row justify-between items-center">
                                <Text className="text-xs text-slate-400 italic">
                                    Detailed stats via Timesheets module
                                </Text>
                                <TouchableOpacity>
                                    <Text className="text-primary-600 text-sm font-bold">View History →</Text>
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
                        <View className="mt-8">
                            <CalendarSidebar
                                currentMonthRecords={monthRecords}
                                activeDate={activeDate}
                                onSelectDate={setActiveDate}
                                displayDate={displayDate}
                                setDisplayDate={setDisplayDate}
                            />
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </View>
    );
}

