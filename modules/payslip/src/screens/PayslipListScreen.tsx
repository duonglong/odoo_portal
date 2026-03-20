import React from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@odoo-portal/core';
import { useRouter } from 'expo-router';
import { usePayslips, useBatchPayslipLines } from '../hooks.js';

export default function PayslipListScreen() {
    const { session, client } = useAuth();
    const router = useRouter();

    const {
        data: payslips = [],
        isLoading,
        refetch,
        isRefetching
    } = usePayslips(client, session?.uid);

    const slipIds = payslips.map(p => p.id);
    const { data: allLines = [], isLoading: isLoadingLines } = useBatchPayslipLines(client, slipIds);

    if (isLoading || isLoadingLines) {
        return (
            <View className="flex-1 items-center justify-center bg-surface-container-low">
                <ActivityIndicator size="large" color="#3713ec" />
            </View>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const calculateNetWage = (slipId: number) => {
        const slipLines = allLines.filter(l => l.slipId?.id === slipId);
        const earnings = slipLines.filter(l => 
            l.categoryId?.name === 'Earnings' || l.categoryId?.name === 'ALW' || l.code === 'BASIC' || l.code === 'ALW'
        );
        const deductions = slipLines.filter(l => 
            l.categoryId?.name === 'Deduction' || l.categoryId?.name === 'DED' || l.code === 'DED'
        );
        
        const totalGross = earnings.reduce((acc, curr) => acc + curr.total, 0);
        const totalDeductions = deductions.reduce((acc, curr) => acc + curr.total, 0);
        
        return totalGross - totalDeductions;
    };

    const totalYtd = payslips.reduce((acc, p) => acc + calculateNetWage(p.id), 0);

    return (
        <View className="flex-1 bg-surface-container-low">
            <ScrollView
                className="flex-1"
                contentContainerClassName="p-4 md:p-8 max-w-7xl mx-auto w-full"
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3713ec" />}
            >
                {/* Header */}
                <View className="flex-col md:flex-row md:items-end justify-between gap-6 mb-10 mt-4 md:mt-0">
                    <View>
                        <Text className="text-3xl font-black text-on-surface tracking-tight mb-2">Payslip Directory</Text>
                        <Text className="text-on-surface-variant text-sm">Managing records for the current fiscal year.</Text>
                    </View>
                </View>

                {/* Bento Data Cards */}
                <View className="flex-col md:flex-row gap-6 mb-10 w-full">
                    <View className="bg-white p-6 rounded-xl border border-outline-variant flex-1 shadow-sm">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Total Disbursed (YTD)</Text>
                        <Text className="text-3xl font-black text-on-surface">{formatCurrency(totalYtd)}</Text>
                        <View className="mt-4 flex-row items-center gap-2">
                            <MaterialCommunityIcons name="trending-up" size={16} color="#059669" />
                            <Text className="text-xs font-bold text-emerald-600">Based on history</Text>
                        </View>
                    </View>
                    <View className="bg-white p-6 rounded-xl border border-outline-variant flex-1 shadow-sm">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Total Records</Text>
                        <Text className="text-3xl font-black text-on-surface">{payslips.length}</Text>
                        <View className="mt-4 flex-row items-center gap-2">
                            <MaterialCommunityIcons name="minus" size={16} color="#64748b" />
                            <Text className="text-xs font-bold text-slate-500">Steady this month</Text>
                        </View>
                    </View>
                    <View className="bg-white p-6 rounded-xl border border-outline-variant flex-1 shadow-sm">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Pending Drafts</Text>
                        <Text className="text-3xl font-black text-on-surface">
                            {payslips.filter(p => p.state === 'draft').length < 10 ? `0${payslips.filter(p => p.state === 'draft').length}` : payslips.filter(p => p.state === 'draft').length}
                        </Text>
                        <View className="mt-4 flex-row items-center gap-2">
                            <MaterialCommunityIcons name="alert" size={16} color="#f59e0b" />
                            <Text className="text-xs font-bold text-amber-500">Requires attention</Text>
                        </View>
                    </View>
                </View>

                {/* List Section */}
                <View className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
                    {payslips.length === 0 ? (
                        <View className="items-center justify-center p-12">
                            <MaterialCommunityIcons name="receipt" size={48} color="#94a3b8" />
                            <Text className="text-slate-500 font-medium mt-4">No records found.</Text>
                        </View>
                    ) : (
                        <View className="divide-y divide-slate-100">
                            {/* Table Header (Hidden on small screens) */}
                            <View className="hidden md:flex flex-row bg-slate-50 border-b border-slate-100 px-6 py-4">
                                <Text className="flex-[2] text-[12px] font-bold uppercase tracking-wide text-on-surface-variant">Pay Period</Text>
                                <Text className="flex-1 text-[12px] font-bold uppercase tracking-wide text-on-surface-variant text-right text-right">Net Amount</Text>
                                <Text className="flex-1 text-[12px] font-bold uppercase tracking-wide text-on-surface-variant ml-6">Status</Text>
                                <Text className="w-24 text-[12px] font-bold uppercase tracking-wide text-on-surface-variant text-right">Actions</Text>
                            </View>
                            
                            {payslips.map((payslip, index) => {
                                const isDraft = payslip.state === 'draft';
                                const isDone = payslip.state === 'done';
                                
                                return (
                                    <TouchableOpacity
                                        key={payslip.id}
                                        onPress={() => router.push(`/payslip/${payslip.id}`)}
                                        className="flex-col md:flex-row items-start md:items-center px-6 py-5 hover:bg-slate-50 transition-colors"
                                    >
                                        <View className="flex-[2] flex-row items-center gap-3 w-full md:w-auto mb-4 md:mb-0">
                                            <View className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                isDone ? 'bg-primary-container' : 'bg-warning-container/20'
                                            }`}>
                                                <MaterialCommunityIcons name="file-document-outline" size={20} color={isDone ? "#3713ec" : "#f59e0b"} />
                                            </View>
                                            <View>
                                                <Text className="text-sm font-bold text-on-surface">
                                                    {formatDate(payslip.dateFrom)} - {formatDate(payslip.dateTo)}
                                                </Text>
                                                <Text className="text-xs text-on-surface-variant mt-0.5">Reference: {payslip.name}</Text>
                                            </View>
                                        </View>
                                        
                                        <View className="flex-1 w-full md:w-auto flex-row md:justify-end justify-between items-center md:items-end mb-4 md:mb-0">
                                            <Text className="md:hidden text-xs text-on-surface-variant uppercase font-bold">Net Amount</Text>
                                            <Text className="text-sm font-black text-on-surface">{formatCurrency(calculateNetWage(payslip.id))}</Text>
                                        </View>
                                        
                                        <View className="flex-1 w-full md:w-auto flex-row md:justify-start justify-between items-center md:ml-6 mb-4 md:mb-0">
                                            <Text className="md:hidden text-xs text-on-surface-variant uppercase font-bold">Status</Text>
                                            <View className={`px-2.5 py-0.5 rounded-full ${
                                                isDone ? 'bg-emerald-100' : isDraft ? 'bg-slate-100' : 'bg-amber-100'
                                            }`}>
                                                <Text className={`text-[10px] font-bold uppercase ${
                                                    isDone ? 'text-emerald-700' : isDraft ? 'text-slate-600' : 'text-amber-700'
                                                }`}>
                                                    {isDone ? 'Paid' : isDraft ? 'Draft' : payslip.state}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View className="w-full md:w-24 flex-row justify-end gap-2 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
                                            <TouchableOpacity 
                                                className="p-2 rounded-lg hover:bg-primary-container/50"
                                                onPress={() => router.push(`/payslip/${payslip.id}`)}
                                            >
                                                <MaterialCommunityIcons name="eye-outline" size={20} color="#64748b" />
                                            </TouchableOpacity>
                                            <TouchableOpacity className="p-2 rounded-lg hover:bg-primary-container/50">
                                                <MaterialCommunityIcons name="download-outline" size={20} color="#64748b" />
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
