import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { useAuth } from '@odoo-portal/core';
import { useMyEmployee, useCheckInOut } from '../hooks.js';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/** Format ISO 8601 to a readable local time string */
const fmtTime = (iso: string | null): string => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Format ISO 8601 to a readable local date string */
const fmtDate = (iso: string | null): string => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

/**
 * Attendance Clock Screen — Check In / Check Out.
 * Shows current state, last check-in time, and a big CTA button.
 */
export default function AttendanceClockScreen() {
    const { session, client } = useAuth();

    const {
        data: employee,
        isLoading: loadingEmployee,
        error: employeeError,
    } = useMyEmployee(client, session?.uid);

    const checkInOut = useCheckInOut(client, session?.uid);

    const handleCheckInOut = () => {
        if (!employee) return;
        checkInOut.mutate(
            { employeeId: employee.id },
            {
                onError: (err: Error) => {
                    Alert.alert(
                        'Error',
                        err.message || 'Could not process attendance action',
                    );
                },
            },
        );
    };

    const isCheckedIn = employee?.attendanceState === 'checked_in';

    if (loadingEmployee) {
        return (
            <View className="flex-1 bg-surface items-center justify-center">
                <ActivityIndicator color="#3713ec" />
            </View>
        );
    }

    if (employeeError || !employee) {
        return (
            <View className="flex-1 bg-surface items-center justify-center p-6">
                <View className="bg-white p-8 rounded-3xl shadow-sm items-center w-full max-w-sm border border-slate-200">
                    <Text className="text-4xl mb-4">⚠️</Text>
                    <Text className="text-slate-900 font-bold text-lg text-center mb-2">
                        Employee Not Found
                    </Text>
                    <Text className="text-slate-500 text-sm text-center">
                        Your user account isn't linked to an employee record. Contact your HR administrator.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface content-center justify-center p-4">
            <View className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 p-8 mx-auto w-full max-w-[420px] border border-slate-100">

                {/* Employee info */}
                <View className="items-center mb-8">
                    <View className="w-24 h-24 bg-slate-100 rounded-full items-center justify-center mb-4">
                        <MaterialCommunityIcons name="account" size={48} color="#94a3b8" />
                    </View>
                    <Text className="text-slate-900 text-2xl font-extrabold">{employee.name}</Text>
                    {employee.jobTitle && (
                        <Text className="text-slate-500 text-sm mt-1 font-medium">{employee.jobTitle}</Text>
                    )}
                </View>

                {/* Status badge */}
                <View className={`self-center px-6 py-2.5 rounded-full mb-10 ${isCheckedIn ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-100 border border-slate-200'}`}>
                    <View className="flex-row items-center gap-2.5">
                        <View className={`w-2.5 h-2.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-slate-400'}`} />
                        <Text className={`font-bold text-sm tracking-wide uppercase ${isCheckedIn ? 'text-emerald-700' : 'text-slate-600'}`}>
                            {isCheckedIn ? 'Checked In' : 'Checked Out'}
                        </Text>
                    </View>
                </View>

                {/* Current time display */}
                <View className="items-center mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <Text className="text-slate-400 text-xs mb-2 font-bold uppercase tracking-widest">
                        {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <LiveClock />
                </View>

                {/* Check in / out button */}
                <TouchableOpacity
                    className={`rounded-2xl py-5 items-center shadow-lg border-b-[4px] active:border-b-0 active:translate-y-1 transition-all ${isCheckedIn
                            ? 'bg-rose-500 border-rose-700 shadow-rose-500/30'
                            : 'bg-emerald-500 border-emerald-700 shadow-emerald-500/30'
                        } ${checkInOut.isPending ? 'opacity-80' : ''}`}
                    onPress={handleCheckInOut}
                    disabled={checkInOut.isPending}
                >
                    {checkInOut.isPending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View className="flex-row items-center gap-3">
                            <MaterialCommunityIcons
                                name={isCheckedIn ? "logout" : "login"}
                                size={24}
                                color="white"
                            />
                            <Text className="text-white font-extrabold text-xl tracking-wide uppercase">
                                {isCheckedIn ? 'Check Out' : 'Check In'}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

/** Small clock component that updates every minute */
function LiveClock() {
    const [time, setTime] = React.useState(() =>
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    );

    React.useEffect(() => {
        const id = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 1000); // Updated to 1s to feel more "alive"
        return () => clearInterval(id);
    }, []);

    return (
        <Text className="text-slate-900 text-5xl font-extrabold tracking-tighter">
            {time}
        </Text>
    );
}
