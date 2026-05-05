import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Platform,
    RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@odoo-portal/core';
import { useMyEmployee, useMonthAttendance } from '../hooks.js';
import type { AttendanceRecord } from '../types.js';
import { fmtTime, fmtDate, fmtDayOnly, fmtMonthOnly, fmtDuration, odooToDate } from '@odoo-portal/core';

// ── Types ─────────────────────────────────────────────────────────────────────

type DayStatus = 'present' | 'late' | 'half-day' | 'absent' | 'weekend' | 'future' | 'empty';

interface DayData {
    date: Date;
    status: DayStatus;
    records: AttendanceRecord[];
    workedHours: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Check-in after this many minutes past 9:00 AM is considered "late" */
const LATE_THRESHOLD_MINUTES = 15;
/** Worked less than this many hours → half-day */
const HALF_DAY_THRESHOLD_HOURS = 5;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWeekend(date: Date): boolean {
    const d = date.getDay();
    return d === 0 || d === 6;
}

function isFuture(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
}

function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

function getDayStatus(date: Date, records: AttendanceRecord[]): DayStatus {
    if (isWeekend(date)) return 'weekend';
    if (isFuture(date)) return 'future';

    if (records.length === 0) return 'absent';

    const totalHours = records.reduce((acc, r) => acc + (r.workedHours ?? 0), 0);
    if (totalHours < HALF_DAY_THRESHOLD_HOURS && records.some(r => r.checkOut)) {
        return 'half-day';
    }

    // Check if first check-in was late
    const firstRecord = records[0];
    if (firstRecord) {
        const checkIn = odooToDate(firstRecord.checkIn);
        if (checkIn) {
            const shiftStart = new Date(checkIn);
            shiftStart.setHours(9, 0, 0, 0);
            const minutesLate = (checkIn.getTime() - shiftStart.getTime()) / (1000 * 60);
            if (minutesLate > LATE_THRESHOLD_MINUTES) return 'late';
        }
    }

    return 'present';
}

const STATUS_CONFIG: Record<DayStatus, { label: string; bg: string; text: string; dot: string }> = {
    present: { label: 'Present', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
    late: { label: 'Late', bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
    'half-day': { label: 'Half-day', bg: 'bg-primary-100', text: 'text-primary-600', dot: 'bg-primary-400' },
    absent: { label: 'Absent', bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
    weekend: { label: '', bg: '', text: '', dot: '' },
    future: { label: '', bg: '', text: '', dot: '' },
    empty: { label: '', bg: '', text: '', dot: '' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string;
    sub?: string;
    subColor?: string;
    icon?: string;
    circlePercent?: number;
}

function StatCard({ label, value, sub, subColor, icon, circlePercent }: StatCardProps) {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const dashArray = circlePercent !== undefined
        ? `${(circlePercent / 100) * circumference} ${circumference}`
        : undefined;

    return (
        <View className="bg-white rounded-xl border border-slate-200 p-4 flex-1 flex-row items-center gap-4 shadow-sm">
            {circlePercent !== undefined ? (
                <View className="relative items-center justify-center" style={{ width: 56, height: 56 }}>
                    {/* SVG is web-only friendly here; on native we use a simple ring approach */}
                    <View className="absolute w-14 h-14 rounded-full border-4 border-slate-100" />
                    <View
                        className="absolute w-14 h-14 rounded-full border-4 border-primary-500"
                        style={{ borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent' }}
                    />
                    <Text className="text-sm font-bold text-slate-900">{circlePercent}%</Text>
                </View>
            ) : icon ? (
                <View className="w-12 h-12 rounded-xl bg-primary-50 items-center justify-center">
                    <MaterialCommunityIcons name={icon as any} size={24} color="#3713ec" />
                </View>
            ) : null}
            <View className="flex-1">
                <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</Text>
                <Text className="text-slate-900 text-2xl font-bold mt-1">{value}</Text>
                {sub ? (
                    <Text className={`text-xs font-medium mt-1 ${subColor ?? 'text-slate-400'}`}>{sub}</Text>
                ) : null}
            </View>
        </View>
    );
}

interface DayCellProps {
    day: DayData | null; // null = empty leading cell
    isSelected: boolean;
    onPress?: () => void;
}

function DayCell({ day, isSelected, onPress }: DayCellProps) {
    if (!day) {
        return <View className="h-24 md:h-28 bg-slate-50/30" />;
    }

    const { date, status, records } = day;
    const cfg = STATUS_CONFIG[status];
    const todayHighlight = isToday(date);
    const showBadge = status !== 'weekend' && status !== 'future' && status !== 'empty' && status !== 'absent';
    const firstRecord = records[0];

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`h-24 md:h-28 p-2 relative ${isSelected ? 'bg-primary-50' : 'hover:bg-slate-50'} transition-colors`}
            activeOpacity={0.7}
        >
            {/* Date number */}
            <View className={`w-6 h-6 items-center justify-center rounded-full ${todayHighlight ? 'bg-primary-500' : ''}`}>
                <Text className={`text-xs font-semibold ${todayHighlight ? 'text-white' : status === 'weekend' || status === 'future' ? 'text-slate-400' : 'text-slate-900'}`}>
                    {date.getDate()}
                </Text>
            </View>

            {isSelected && (
                <Text className="absolute top-1.5 right-1.5 text-[9px] font-bold text-primary-500 uppercase bg-primary-100 px-1 rounded">
                    Sel
                </Text>
            )}

            {/* Status badge */}
            {showBadge && cfg.label ? (
                <View className="mt-1 gap-0.5">
                    <View className={`flex-row items-center gap-1 ${cfg.bg} px-1.5 py-0.5 rounded`}>
                        <View className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <Text className={`text-[10px] font-medium ${cfg.text}`}>{cfg.label}</Text>
                    </View>
                    {firstRecord ? (
                        <Text className={`text-[10px] px-1.5 ${isSelected ? 'text-primary-500 font-bold' : 'text-slate-400'}`}>
                            {fmtTime(firstRecord.checkIn)} – {firstRecord.checkOut ? fmtTime(firstRecord.checkOut) : '…'}
                        </Text>
                    ) : null}
                </View>
            ) : null}

            {/* Absent dot */}
            {status === 'absent' && (
                <View className="mt-1 flex-row items-center gap-1 bg-error/10 px-1.5 py-0.5 rounded">
                    <View className="w-1.5 h-1.5 rounded-full bg-error" />
                    <Text className="text-[10px] font-medium text-error">Absent</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

interface DailyLogPanelProps {
    day: DayData | null;
    onClose?: () => void; // mobile modal close
    isModal?: boolean;
}

function DailyLogPanel({ day, onClose, isModal }: DailyLogPanelProps) {
    const content = (
        <View className={`bg-white rounded-xl border border-slate-200 shadow-sm flex-col ${isModal ? '' : 'flex-1'}`}>
            {/* Header */}
            <View className="p-5 border-b border-slate-200 flex-row items-center justify-between">
                <View>
                    <Text className="text-xl font-black text-slate-900 leading-none">
                        {day ? day.date.getDate() : '–'}
                    </Text>
                    <Text className="text-slate-500 font-medium text-sm mt-0.5">
                        {day ? day.date.toLocaleDateString([], { weekday: 'long', month: 'long', year: 'numeric' }) : 'Select a day'}
                    </Text>
                </View>
                {onClose && (
                    <TouchableOpacity onPress={onClose} className="w-8 h-8 items-center justify-center rounded-full bg-slate-100">
                        <MaterialCommunityIcons name="close" size={18} color="#64748b" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Log entries */}
            <View className="p-5 gap-4 flex-1">
                {!day || day.records.length === 0 ? (
                    <View className="items-center py-8 opacity-50">
                        <MaterialCommunityIcons name="calendar-blank-outline" size={36} color="#94a3b8" />
                        <Text className="text-slate-500 text-sm mt-2">
                            {!day ? 'Tap a day to see detail' : day.status === 'weekend' ? 'Weekend — no record' : 'No attendance record'}
                        </Text>
                    </View>
                ) : (
                    <>
                        {day.records.map((record) => (
                            <View key={record.id} className="gap-4">
                                {/* Check-in */}
                                <View className="flex-row items-start gap-3">
                                    <View className="w-10 h-10 rounded-lg bg-success/10 items-center justify-center shrink-0">
                                        <MaterialCommunityIcons name="login" size={20} color="#10b981" />
                                    </View>
                                    <View>
                                        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Check-in</Text>
                                        <Text className="text-slate-900 text-base font-bold mt-0.5">{fmtTime(record.checkIn)}</Text>
                                        <Text className="text-slate-400 text-xs">
                                            {STATUS_CONFIG[day.status].label || 'On time'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Check-out */}
                                <View className="flex-row items-start gap-3">
                                    <View className="w-10 h-10 rounded-lg bg-blue-50 items-center justify-center shrink-0">
                                        <MaterialCommunityIcons name="logout" size={20} color="#3b82f6" />
                                    </View>
                                    <View>
                                        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Check-out</Text>
                                        <Text className="text-slate-900 text-base font-bold mt-0.5">
                                            {record.checkOut ? fmtTime(record.checkOut) : '– In progress'}
                                        </Text>
                                        <Text className="text-slate-400 text-xs">Regular hours</Text>
                                    </View>
                                </View>

                                {/* Duration */}
                                <View className="flex-row items-start gap-3">
                                    <View className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                                        <MaterialCommunityIcons name="timer-outline" size={20} color="#64748b" />
                                    </View>
                                    <View>
                                        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Duration</Text>
                                        <Text className="text-slate-900 text-base font-bold mt-0.5">
                                            {fmtDuration(record.workedHours)}
                                        </Text>
                                        <Text className="text-slate-400 text-xs">Total active time</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </View>

            {/* Footer */}
            <View className="p-4 bg-slate-50 rounded-b-xl border-t border-slate-200">
                <TouchableOpacity className="w-full bg-white border border-slate-200 py-2.5 rounded-lg items-center">
                    <Text className="text-slate-700 font-bold text-sm">Request Modification</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (isModal) {
        return (
            <View className="p-4">
                {content}
            </View>
        );
    }

    return content;
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function MyAttendanceScreen() {
    const { session, client } = useAuth();

    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-indexed
    const [selectedDate, setSelectedDate] = useState<Date | null>(today);
    const [showDayModal, setShowDayModal] = useState(false);

    const { data: employee, isLoading: isEmpLoading } = useMyEmployee(client, session?.uid);
    const {
        data: monthRecords = [],
        isLoading: isMonthLoading,
        isRefetching,
        refetch,
    } = useMonthAttendance(client, employee?.id, viewYear, viewMonth);

    const isLoading = isEmpLoading || isMonthLoading;

    // ── Build calendar grid ───────────────────────────────────────────────────

    // Group records by date string (YYYY-MM-DD)
    const recordsByDay = useMemo(() => {
        const map = new Map<string, AttendanceRecord[]>();
        for (const r of monthRecords) {
            const key = odooToDate(r.checkIn)?.toDateString() ?? '';
            const existing = map.get(key) ?? [];
            existing.push(r);
            map.set(key, existing);
        }
        return map;
    }, [monthRecords]);

    // Build DayData for every calendar cell
    const calendarDays = useMemo((): (DayData | null)[] => {
        const firstOfMonth = new Date(viewYear, viewMonth - 1, 1);
        const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
        const startDow = firstOfMonth.getDay(); // 0=Sun

        const cells: (DayData | null)[] = [];

        // leading empty cells
        for (let i = 0; i < startDow; i++) cells.push(null);

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(viewYear, viewMonth - 1, d);
            const records = recordsByDay.get(date.toDateString()) ?? [];
            const workedHours = records.reduce((acc, r) => acc + (r.workedHours ?? 0), 0);
            const status = getDayStatus(date, records);
            cells.push({ date, status, records, workedHours });
        }

        return cells;
    }, [viewYear, viewMonth, recordsByDay]);

    // ── Summary stats ─────────────────────────────────────────────────────────

    const summaryStats = useMemo(() => {
        const workDays = calendarDays.filter(
            d => d !== null && !isWeekend(d.date) && !isFuture(d.date),
        ) as DayData[];
        const presentDays = workDays.filter(d => d.status === 'present' || d.status === 'half-day' || d.status === 'late').length;
        const lateDays = workDays.filter(d => d.status === 'late').length;
        const totalHours = monthRecords.reduce((acc, r) => acc + (r.workedHours ?? 0), 0);
        const attendancePercent = workDays.length > 0
            ? Math.round((presentDays / workDays.length) * 100)
            : 0;

        return {
            attendancePercent,
            presentDays,
            workDays: workDays.length,
            lateDays,
            totalHours,
        };
    }, [calendarDays, monthRecords]);

    // ── Selected day data ─────────────────────────────────────────────────────

    const selectedDayData = useMemo((): DayData | null => {
        if (!selectedDate) return null;
        const found = calendarDays.find(
            d => d !== null && d.date.toDateString() === selectedDate.toDateString(),
        );
        return found ?? null;
    }, [selectedDate, calendarDays]);

    // ── Month navigation ──────────────────────────────────────────────────────

    const goToPrevMonth = () => {
        if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };

    const goToNextMonth = () => {
        if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const goToToday = () => {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth() + 1);
        setSelectedDate(today);
    };

    const handleDayPress = (day: DayData) => {
        setSelectedDate(day.date);
        if (Platform.OS !== 'web') setShowDayModal(true);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-surface">
                <ActivityIndicator size="large" color="#3713ec" />
            </View>
        );
    }

    const isCurrentOrFutureMonth =
        viewYear > today.getFullYear() ||
        (viewYear === today.getFullYear() && viewMonth >= today.getMonth() + 1);

    return (
        <ScrollView
            className="flex-1 bg-surface"
            contentContainerClassName="pb-10"
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3713ec" />}
        >
            <View className="max-w-[1440px] mx-auto w-full p-4 md:p-8 flex-col gap-6">

                {/* Breadcrumbs */}
                <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-medium text-slate-500">Portal</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color="#64748b" />
                    <Text className="text-sm font-medium text-primary-500">My Attendance</Text>
                </View>

                {/* Summary stat cards */}
                <View className="flex-col md:flex-row gap-3">
                    <StatCard
                        label="Attendance Health"
                        value={summaryStats.attendancePercent >= 90 ? 'Excellent' : summaryStats.attendancePercent >= 75 ? 'Good' : 'Needs Attention'}
                        sub={`↑ ${summaryStats.attendancePercent}% this month`}
                        subColor="text-success"
                        circlePercent={summaryStats.attendancePercent}
                    />
                    <StatCard
                        label="Days Present"
                        value={`${summaryStats.presentDays}`}
                        sub={`/ ${summaryStats.workDays} working days`}
                        icon="calendar-check-outline"
                    />
                    <StatCard
                        label="Late Arrivals"
                        value={String(summaryStats.lateDays).padStart(2, '0')}
                        sub={summaryStats.lateDays > 0 ? `Avg delay tracked` : 'All on time'}
                        subColor={summaryStats.lateDays > 0 ? 'text-warning' : 'text-success'}
                        icon="clock-alert-outline"
                    />
                    <StatCard
                        label="Total Hours"
                        value={`${summaryStats.totalHours.toFixed(1)}h`}
                        sub="This month"
                        icon="timer-sand-outline"
                    />
                </View>

                {/* Calendar + side panel */}
                <View className="flex-col lg:flex-row gap-6 items-start">

                    {/* Calendar block */}
                    <View className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                        {/* Calendar header */}
                        <View className="p-5 border-b border-slate-200 flex-row items-center justify-between bg-slate-50/50">
                            <View className="flex-row items-center gap-3">
                                <Text className="text-xl font-bold text-slate-900">
                                    {MONTH_NAMES[viewMonth - 1]} {viewYear}
                                </Text>
                                <View className="flex-row gap-1">
                                    <TouchableOpacity
                                        onPress={goToPrevMonth}
                                        className="w-7 h-7 items-center justify-center rounded hover:bg-slate-200 active:bg-slate-200"
                                    >
                                        <MaterialCommunityIcons name="chevron-left" size={20} color="#64748b" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={goToNextMonth}
                                        className="w-7 h-7 items-center justify-center rounded hover:bg-slate-200 active:bg-slate-200"
                                    >
                                        <MaterialCommunityIcons name="chevron-right" size={20} color="#64748b" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="flex-row items-center gap-4">
                                {/* Legend */}
                                <View className="hidden md:flex flex-row items-center gap-4 mr-4 border-r border-slate-200 pr-4">
                                    {(['present', 'late', 'absent', 'half-day'] as DayStatus[]).map(s => (
                                        <View key={s} className="flex-row items-center gap-1.5">
                                            <View className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                                            <Text className="text-xs text-slate-500 font-medium">{STATUS_CONFIG[s].label}</Text>
                                        </View>
                                    ))}
                                </View>
                                <TouchableOpacity
                                    onPress={goToToday}
                                    className="bg-primary-500 px-4 py-1.5 rounded-lg"
                                >
                                    <Text className="text-white text-sm font-bold">Today</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Day-of-week headers */}
                        <View className="flex-row border-b border-slate-100 bg-slate-50/50">
                            {DAY_LABELS.map(d => (
                                <View key={d} className="flex-1 items-center py-2.5">
                                    <Text className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{d}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Calendar grid */}
                        <View className="flex-row flex-wrap border-t border-slate-100 divide-x divide-y divide-slate-100">
                            {calendarDays.map((day, idx) => (
                                <View key={idx} style={{ width: `${100 / 7}%` }} className="border-slate-100">
                                    <DayCell
                                        day={day}
                                        isSelected={
                                            day !== null &&
                                            selectedDate !== null &&
                                            day.date.toDateString() === selectedDate.toDateString()
                                        }
                                        onPress={day ? () => handleDayPress(day) : undefined}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Side panel — visible on web desktop */}
                    {Platform.OS === 'web' ? (
                        <View className="hidden lg:flex w-80 xl:w-96">
                            <DailyLogPanel day={selectedDayData} />
                        </View>
                    ) : null}
                </View>
            </View>

            {/* Mobile day detail modal */}
            {Platform.OS !== 'web' && (
                <Modal
                    visible={showDayModal}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowDayModal(false)}
                >
                    <View className="flex-1 justify-end bg-black/40">
                        <DailyLogPanel
                            day={selectedDayData}
                            onClose={() => setShowDayModal(false)}
                            isModal
                        />
                    </View>
                </Modal>
            )}
        </ScrollView>
    );
}
