import React from 'react';
import { View, Text, ActivityIndicator, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@odoo-portal/core';
import { usePayslips } from '../hooks.js';

export default function PayslipListScreen() {
    const { session, client } = useAuth();

    const {
        data: payslips = [],
        isLoading,
        refetch,
        isRefetching
    } = usePayslips(client, session?.uid);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-surface">
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

    return (
        <View className="flex-1 bg-surface">
            <ScrollView
                className="flex-1"
                contentContainerClassName="p-4 md:p-8"
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3713ec" />}
            >
                <View className="mb-8">
                    <Text className="text-3xl font-black text-slate-900 tracking-tight">Payslips</Text>
                    <Text className="text-base text-slate-500 mt-1">View and manage your salary slips.</Text>
                </View>

                <View className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {payslips.length === 0 ? (
                        <View className="items-center justify-center p-12">
                            <MaterialCommunityIcons name="file-document-outline" size={48} color="#94a3b8" />
                            <Text className="text-slate-500 font-medium mt-4">No payslips found.</Text>
                        </View>
                    ) : (
                        <View className="divide-y divide-slate-100">
                            {payslips.map(payslip => (
                                <TouchableOpacity
                                    key={payslip.id}
                                    className="p-5 flex-row items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                >
                                    <View className="flex-row items-center gap-4">
                                        <View className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center">
                                            <MaterialCommunityIcons name="currency-usd" size={24} color="#3713ec" />
                                        </View>
                                        <View>
                                            <Text className="text-base font-bold text-slate-900">{payslip.name}</Text>
                                            <Text className="text-sm text-slate-500 mt-0.5">
                                                {formatDate(payslip.dateFrom)} - {formatDate(payslip.dateTo)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="items-end gap-1">
                                        <Text className="text-lg font-black text-slate-900">{formatCurrency(payslip.netWage)}</Text>
                                        <View className={`px-2 py-0.5 rounded-full ${payslip.state === 'done' ? 'bg-success/10' :
                                            payslip.state === 'draft' ? 'bg-slate-100' : 'bg-warning/10'
                                            }`}>
                                            <Text className={`text-xs font-bold ${payslip.state === 'done' ? 'text-success' :
                                                payslip.state === 'draft' ? 'text-slate-500' : 'text-warning'
                                                }`}>
                                                {payslip.state.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
