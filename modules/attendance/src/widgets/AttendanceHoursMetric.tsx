import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '@odoo-portal/core';
import { useMyEmployee, useAttendanceRecords } from '../hooks.js';
import { fmtTime, fmtDate, fmtDayOnly, fmtMonthOnly, fmtDuration, odooToDate } from '@odoo-portal/core';

/**
 * Dashboard metric card: "Hours Today"
 *
 * Shows the total hours worked today in HH:MM format.
 * Self-contained — fetches its own data via attendance hooks.
 */
export default function AttendanceHoursMetric() {
    const { session, client } = useAuth();
    const { data: employee } = useMyEmployee(client, session?.uid);
    const { data: records = [] } = useAttendanceRecords(client, employee?.id, 0, 20);

    // Compute today's total worked hours
    const todayStr = new Date().toDateString();
    const todayHours = records
        .filter(r => odooToDate(r.checkIn)?.toDateString() === todayStr)
        .reduce((acc, r) => acc + (r.workedHours || 0), 0);

    const h = Math.floor(todayHours);
    const m = Math.round((todayHours - h) * 60);
    const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    return (
        <View className="bg-white p-5 rounded-3xl border border-slate-200 flex-1 min-w-[140px] md:min-w-[200px] shadow-sm">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hours Today</Text>
            <Text className="text-2xl md:text-3xl font-extrabold mt-2 text-slate-900">{display}</Text>
        </View>
    );
}
