import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, toast } from '@odoo-portal/core';
import {
    useMyEmployee,
    useLeaveTypes,
    useLeaveBalances,
    useTeamLeaves,
    useCreateLeave,
    useMyUpcomingLeaves
} from '../hooks.js';
import { DatePicker } from '../components/DatePicker.js';

export default function LeaveRequestScreen() {
    const router = useRouter();
    const { session, client } = useAuth();
    const { data: employee } = useMyEmployee(client, session?.uid);
    const queryClient = useQueryClient();

    // Queries
    const { data: leaveTypes, isLoading: loadingTypes } = useLeaveTypes(client);
    const { data: balances, isLoading: loadingBalances } = useLeaveBalances(client, employee?.id);
    const { data: teamLeaves, isLoading: loadingTeam } = useTeamLeaves(client, employee?.departmentId?.id);
    const { data: upcomingLeaves, isLoading: loadingUpcoming } = useMyUpcomingLeaves(client, employee?.id);

    // Mutations
    const { mutate: createLeave, isPending: submitting } = useCreateLeave(client);

    // Form State
    const [leaveTypeId, setLeaveTypeId] = useState<number | null>(null);
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]!);
    const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]!);
    const [description, setDescription] = useState('');

    const handleSubmit = () => {
        if (!leaveTypeId) return; // TODO: add inline validation

        createLeave(
            {
                holiday_status_id: leaveTypeId,
                request_date_from: startDate,
                request_date_to: endDate,
                name: description,
                employee_id: employee?.id
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['attendance'] });
                    toast.success('Request Submitted', 'Your leave request has been successfully created.');
                    router.replace('/attendance/leave-list');
                }
            }
        );
    };

    const selectedLeaveType = leaveTypes?.find(t => t.id === leaveTypeId);

    return (
        <View className="flex-1 bg-surface">
            <ScrollView className="flex-1" contentContainerClassName="p-4 md:p-8 lg:px-20">
                <View className="max-w-[1200px] mx-auto w-full">
                    {/* Breadcrumbs */}
                    <View className="flex-row items-center gap-2 mb-6 text-slate-500">
                        <TouchableOpacity onPress={() => router.navigate('/attendance')} className="active:opacity-70">
                            <Text className="text-sm text-slate-500 hover:text-primary-600">Home</Text>
                        </TouchableOpacity>
                        <MaterialCommunityIcons name="chevron-right" size={16} color="#64748b" />
                        <Text className="text-sm text-slate-500 hover:text-primary-600">Leave Management</Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color="#64748b" />
                        <Text className="text-sm font-medium text-slate-900">New Request</Text>
                    </View>

                    {/* Header */}
                    <View className="mb-8 flex-row items-center gap-4">
                        {Platform.OS !== 'web' && (
                            <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 bg-white rounded-full items-center justify-center border border-slate-200">
                                <MaterialCommunityIcons name="arrow-left" size={24} color="#0f172a" />
                            </TouchableOpacity>
                        )}
                        <View>
                            <Text className="text-3xl font-black tracking-tight text-slate-900">Request Leave</Text>
                            <Text className="text-base text-slate-500 mt-1">Plan your time off and sync with your team.</Text>
                        </View>
                    </View>

                    {/* Main Content Grid */}
                    <View className="flex-col lg:flex-row gap-8 items-start">

                        {/* Left Column: Form */}
                        <View className="w-full lg:flex-1 space-y-6 flex-col gap-6">
                            <View className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                                <View className="flex-row items-center gap-2 mb-6">
                                    <MaterialCommunityIcons name="file-document-edit-outline" size={24} color="#3713ec" />
                                    <Text className="text-xl font-bold text-slate-900">Request Details</Text>
                                </View>

                                {/* Form Fields */}
                                <View className="flex-col gap-6">
                                    {/* Leave Type */}
                                    <View style={{ zIndex: 50 }}>
                                        <Text className="text-sm font-semibold text-slate-700 mb-2">Leave Type</Text>
                                        {loadingTypes ? (
                                            <ActivityIndicator size="small" color="#94a3b8" />
                                        ) : (
                                            <View className="relative z-50">
                                                <TouchableOpacity
                                                    className={`h-12 border ${isTypeDropdownOpen ? 'border-primary-400 ring-2 ring-primary-100' : 'border-slate-200'} rounded-lg bg-white flex-row items-center justify-between px-4 active:bg-slate-50`}
                                                    onPress={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                                                >
                                                    <Text className="text-slate-900 text-base">
                                                        {selectedLeaveType?.name || 'Select a Leave Type'}
                                                    </Text>
                                                    <MaterialCommunityIcons name={isTypeDropdownOpen ? "chevron-up" : "chevron-down"} size={24} color="#94a3b8" />
                                                </TouchableOpacity>

                                                {isTypeDropdownOpen && leaveTypes && leaveTypes.length > 0 && (
                                                    <View className="absolute top-14 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden" style={{ elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
                                                        {leaveTypes.map((type, index) => (
                                                            <TouchableOpacity
                                                                key={type.id}
                                                                className={`p-4 flex-row items-center justify-between ${index !== leaveTypes.length - 1 ? 'border-b border-slate-100' : ''} ${leaveTypeId === type.id ? 'bg-primary-50' : 'bg-white'}`}
                                                                onPress={() => {
                                                                    setLeaveTypeId(type.id);
                                                                    setIsTypeDropdownOpen(false);
                                                                }}
                                                            >
                                                                <Text className={`text-base ${leaveTypeId === type.id ? 'text-primary-700 font-semibold' : 'text-slate-700'}`}>
                                                                    {type.name}
                                                                </Text>
                                                                {leaveTypeId === type.id && (
                                                                    <MaterialCommunityIcons name="check" size={20} color="#3713ec" />
                                                                )}
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    {/* Dates Row */}
                                    <View className="flex-col md:flex-row gap-6">
                                        <View className="flex-1">
                                            <Text className="text-sm font-semibold text-slate-700 mb-2">Start Date</Text>
                                            <DatePicker
                                                value={startDate}
                                                onChange={setStartDate}
                                            >
                                                <View className="flex-row items-center h-12 border border-slate-200 rounded-lg bg-white px-3">
                                                    <MaterialCommunityIcons name="calendar" size={20} color="#94a3b8" className="mr-2" />
                                                    <Text className="text-slate-900 text-base">{startDate || 'YYYY-MM-DD'}</Text>
                                                </View>
                                            </DatePicker>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-semibold text-slate-700 mb-2">End Date</Text>
                                            <DatePicker
                                                value={endDate}
                                                onChange={setEndDate}
                                                minimumDate={new Date(startDate)} // Ensure End isn't strictly before Start in JS memory
                                            >
                                                <View className="flex-row items-center h-12 border border-slate-200 rounded-lg bg-white px-3">
                                                    <MaterialCommunityIcons name="calendar" size={20} color="#94a3b8" className="mr-2" />
                                                    <Text className="text-slate-900 text-base">{endDate || 'YYYY-MM-DD'}</Text>
                                                </View>
                                            </DatePicker>
                                        </View>
                                    </View>

                                    {/* Description */}
                                    <View>
                                        <Text className="text-sm font-semibold text-slate-700 mb-2">Description</Text>
                                        <TextInput
                                            className="w-full rounded-lg border border-slate-200 bg-white p-4 pt-4 text-slate-900 text-base text-top"
                                            placeholder="Optional: Brief reason for leave or handover notes..."
                                            placeholderTextColor="#94a3b8"
                                            multiline
                                            numberOfLines={4}
                                            style={{ minHeight: 100, textAlignVertical: 'top' }}
                                            value={description}
                                            onChangeText={setDescription}
                                        />
                                    </View>

                                    {/* Info Alert */}
                                    <View className="flex-row items-center gap-3 p-4 rounded-xl bg-primary-50 border border-primary-200">
                                        <MaterialCommunityIcons name="information" size={20} color="#3713ec" />
                                        <Text className="text-sm text-slate-700 flex-1">
                                            You are requesting <Text className="font-bold text-primary-600">5 working days</Text> off.
                                        </Text>
                                    </View>

                                    {/* Actions */}
                                    <View className="flex-row items-center justify-end gap-4 pt-4 mt-2 border-t border-slate-100">
                                        <TouchableOpacity disabled={submitting} onPress={() => router.back()} className="px-6 py-3 rounded-lg active:bg-slate-50">
                                            <Text className="text-sm font-semibold text-slate-600">Discard</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            disabled={!leaveTypeId || submitting}
                                            onPress={handleSubmit}
                                            className={`px-8 py-3 rounded-lg active:bg-primary-700 shadow-sm shadow-primary-600/20 flex-row items-center gap-2 ${!leaveTypeId || submitting ? 'bg-primary-300' : 'bg-primary-600'}`}
                                        >
                                            {submitting && <ActivityIndicator size="small" color="white" />}
                                            <Text className="text-sm font-semibold text-white">
                                                {submitting ? 'Submitting...' : 'Submit Request'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Right Column: Context Cards */}
                        <View className="w-full lg:w-[380px] flex-col gap-6 shrink-0">

                            {/* Card 1: Balances */}
                            <View className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <View className="flex-row items-center gap-2 mb-6">
                                    <MaterialCommunityIcons name="wallet-outline" size={24} color="#3713ec" />
                                    <Text className="text-base font-bold text-slate-900">Your Leave Balances</Text>
                                </View>

                                <View className="flex-col gap-5">
                                    {loadingBalances ? (
                                        <ActivityIndicator size="small" color="#94a3b8" className="py-4" />
                                    ) : (!balances || balances.length === 0) ? (
                                        <Text className="text-sm text-slate-500 py-2">No leave balances found.</Text>
                                    ) : (
                                        balances.map(balance => {
                                            const remaining = balance.maxLeaves - balance.leavesTaken;
                                            const percent = balance.maxLeaves > 0 ? (balance.leavesTaken / balance.maxLeaves) * 100 : 0;

                                            // Provide some visual distinction. In reality, Odoo defines colors.
                                            const bgColor = balance.maxLeaves > 10 ? 'bg-primary-600' : 'bg-emerald-500';

                                            return (
                                                <View key={balance.id}>
                                                    <View className="flex-row justify-between text-sm mb-2">
                                                        <Text className="text-slate-500 font-medium">
                                                            {balance.typeName || 'Time Off'}
                                                        </Text>
                                                        <Text className="font-bold text-slate-900">
                                                            {remaining} / {balance.maxLeaves} days
                                                        </Text>
                                                    </View>
                                                    <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <View className={`h-full ${bgColor}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </View>
                            </View>

                            {/* Card 2: My Schedule */}
                            <View className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <View className="flex-row items-center gap-2 mb-6">
                                    <MaterialCommunityIcons name="calendar-month" size={24} color="#3713ec" />
                                    <Text className="text-base font-bold text-slate-900">My Schedule</Text>
                                </View>

                                <View className="flex-col gap-5">
                                    {loadingUpcoming ? (
                                        <ActivityIndicator size="small" color="#94a3b8" className="py-4" />
                                    ) : (!upcomingLeaves || upcomingLeaves.length === 0) ? (
                                        <Text className="text-sm text-slate-500 py-2">No upcoming scheduled leaves.</Text>
                                    ) : (
                                        upcomingLeaves.map(leave => {
                                            let statusColor = 'bg-slate-100';
                                            let statusTextColor = 'text-slate-600';
                                            let statusLabel: string = leave.status;

                                            switch (leave.status) {
                                                case 'validate':
                                                case 'validate1':
                                                    statusColor = 'bg-indigo-100';
                                                    statusTextColor = 'text-indigo-700';
                                                    statusLabel = 'Approved';
                                                    break;
                                                case 'confirm':
                                                    statusColor = 'bg-amber-100';
                                                    statusTextColor = 'text-amber-700';
                                                    statusLabel = 'To Approve';
                                                    break;
                                                case 'draft':
                                                    statusLabel = 'Draft';
                                                    break;
                                            }

                                            return (
                                                <View key={leave.id} className="flex-row items-center gap-3">
                                                    <View className={`h-10 w-10 flex-row shrink-0 rounded-full ${statusColor} items-center justify-center`}>
                                                        <MaterialCommunityIcons name="account" size={20} color={statusTextColor.replace('text-', '#')} style={{ opacity: 0.8 }} />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{leave.description || leave.typeName}</Text>
                                                        <Text className="text-xs text-slate-500">
                                                            {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </Text>
                                                    </View>
                                                    <View className={`px-2 py-1 rounded ${statusColor}`}>
                                                        <Text className={`text-[10px] font-bold uppercase tracking-wider ${statusTextColor}`}>{statusLabel}</Text>
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </View>
                            </View>

                            {/* Card 3: Team Calendar */}
                            <View className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <View className="flex-row items-center gap-2 mb-6">
                                    <MaterialCommunityIcons name="account-group-outline" size={24} color="#3713ec" />
                                    <Text className="text-base font-bold text-slate-900">Who's Out (Team)</Text>
                                </View>

                                <View className="flex-col gap-5">
                                    {loadingTeam ? (
                                        <ActivityIndicator size="small" color="#94a3b8" className="py-4" />
                                    ) : (!teamLeaves || teamLeaves.length === 0) ? (
                                        <Text className="text-sm text-slate-500 py-2">No team members are out today.</Text>
                                    ) : (
                                        teamLeaves.map(leave => (
                                            <View key={leave.id} className="flex-row items-center gap-3">
                                                <View className="h-10 w-10 rounded-full bg-slate-200 items-center justify-center">
                                                    <Text className="text-slate-500 font-bold uppercase">{leave.employeeName?.charAt(0) || 'U'}</Text>
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{leave.employeeName}</Text>
                                                    <Text className="text-xs text-slate-500">
                                                        {leave.startDate} to {leave.endDate}
                                                    </Text>
                                                </View>
                                                <View className="px-2 py-1 rounded bg-slate-100">
                                                    <Text className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{leave.status}</Text>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </View>

                                {/* Mini Calendar Conflicts Preview */}
                                <View className="mt-6 pt-6 border-t border-slate-100">
                                    <View className="flex-row justify-between mb-2 px-1">
                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                            <Text key={i} className="text-[10px] font-bold text-slate-400 uppercase w-6 text-center">{d}</Text>
                                        ))}
                                    </View>
                                    <View className="flex-row justify-between px-1">
                                        {/* Mocked mini week view */}
                                        <Text className="text-xs text-slate-400 p-1 w-6 text-center">19</Text>
                                        <View className="bg-primary-100 rounded-full w-6 h-6 items-center justify-center">
                                            <Text className="text-xs font-bold text-primary-600">20</Text>
                                        </View>
                                        <View className="bg-primary-100 rounded-full w-6 h-6 items-center justify-center">
                                            <Text className="text-xs font-bold text-primary-600">21</Text>
                                        </View>
                                        <View className="bg-primary-100 rounded-full w-6 h-6 items-center justify-center">
                                            <Text className="text-xs font-bold text-primary-600">22</Text>
                                        </View>
                                        <View className="bg-primary-100 rounded-full w-6 h-6 items-center justify-center">
                                            <Text className="text-xs font-bold text-primary-600">23</Text>
                                        </View>
                                        <View className="bg-primary-100 rounded-full w-6 h-6 items-center justify-center">
                                            <Text className="text-xs font-bold text-primary-600">24</Text>
                                        </View>
                                        <Text className="text-xs text-slate-400 p-1 w-6 text-center">25</Text>
                                    </View>
                                    <Text className="text-[11px] text-slate-500 mt-4 text-center italic">
                                        High conflict on Nov 20-22. Consider adjusting dates.
                                    </Text>
                                </View>
                            </View>
                        </View>

                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
