import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@odoo-portal/core';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { usePayslips, usePayslipLines, useCompany } from '../hooks.js';

export default function PayslipDetailScreen({ payslipId }: { payslipId: number }) {
    const { session, client } = useAuth();
    const router = useRouter();

    const { data: payslips = [], isLoading: isLoadingPayslips } = usePayslips(client, session?.uid);
    const payslip = payslips.find(p => p.id === payslipId);

    const { data: lines = [], isLoading: isLoadingLines } = usePayslipLines(client, payslipId);
    const { data: company, isLoading: isLoadingCompany } = useCompany(client, payslip?.companyId?.id || 0);

    const isLoading = isLoadingPayslips || isLoadingLines || isLoadingCompany;



    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-surface-container-low">
                <ActivityIndicator size="large" color="#3713ec" />
            </View>
        );
    }

    if (!payslip) {
        return (
            <View className="flex-1 items-center justify-center bg-surface-container-low">
                <Text className="text-on-surface-variant font-medium">Payslip not found.</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 px-4 py-2 bg-primary rounded-lg">
                    <Text className="text-white font-bold">Go Back</Text>
                </TouchableOpacity>
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

    const formatPaymentDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
    };

    // Process lines from Odoo 
    const earnings = lines.filter(l => {
        const catName = (l.categoryId?.name || '').toUpperCase();
        const code = (l.code || '').toUpperCase();
        return catName.includes('EARNING') || catName.includes('BASIC') || catName.includes('ALW') || 
               code === 'BASIC' || code === 'ALW' || code.includes('EARN');
    });

    const deductions = lines.filter(l => {
        const catName = (l.categoryId?.name || '').toUpperCase();
        const code = (l.code || '').toUpperCase();
        return catName.includes('DEDUCTION') || catName.includes('DED') || catName.includes('TAX') || 
               code.includes('DED') || code.includes('TAX');
    });

    const totalGross = earnings.reduce((acc, curr) => acc + curr.total, 0);
    const totalDeductions = deductions.reduce((acc, curr) => acc + curr.total, 0);

    // Use company data dynamically
    const companyName = company?.name || 'Unknown Company';
    const companyAddress = company 
        ? [company.street, company.city, company.zip].filter(Boolean).join(' ')
        : '';
    const companyVat = company?.vat || 'Not Provided';
    const companyEmail = company?.email || 'Not Provided';
    
    // In a real scenario, basic would come from the lines, and netWage would be totalGross - totalDeductions
    const finalNet = totalGross - totalDeductions;

    return (
        <View className="flex-1 bg-surface-container-low">
            <ScrollView className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full">

                {/* Back button */}
                <TouchableOpacity onPress={() => router.back()} className="mb-6 flex-row items-center gap-2 self-start">
                    <MaterialCommunityIcons name="arrow-left" size={20} color="#64748b" />
                    <Text className="text-on-surface-variant font-bold text-sm hover:text-primary transition-colors">Back to Directory</Text>
                </TouchableOpacity>

                {/* Hero Header */}
                <View className="flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 md:gap-8">
                    <View className="space-y-2">
                        <View className="bg-primary-container px-3 py-1 rounded-full self-start mb-2">
                            <Text className="text-[10px] font-bold uppercase tracking-[0.05em] text-primary">
                                Payslip Reference: {payslip.name}
                            </Text>
                        </View>
                        <Text className="text-3xl md:text-[1.875rem] font-black text-on-surface leading-tight tracking-tight">
                            {formatDate(payslip.dateFrom)} - {formatDate(payslip.dateTo)}
                        </Text>
                        <Text className="text-on-surface-variant font-medium mt-1">Payment Date: {formatPaymentDate(payslip.dateTo)}</Text>
                    </View>
                    <View className="md:text-right flex flex-col md:items-end w-full md:w-auto mt-4 md:mt-0">
                        <Text className="text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant mb-1">Net Pay Amount</Text>
                        <Text className="text-4xl md:text-5xl font-black text-primary tracking-tighter">
                            {formatCurrency(finalNet)}
                        </Text>
                    </View>
                </View>

                {/* Main Bento Grid */}
                <View className="flex-col md:flex-row flex-wrap gap-6 mb-12">
                    
                    {/* Earnings Section (Span 2) */}
                    <View className="bg-white rounded-xl border border-outline-variant p-6 md:p-8 relative overflow-hidden shadow-sm flex-[2] min-w-[300px]">
                        <View className="absolute -top-4 -right-4 opacity-[0.04]">
                            <MaterialCommunityIcons name="cash-multiple" size={144} color="#000" />
                        </View>
                        <View className="flex-row items-center justify-between mb-8">
                            <View className="flex-row items-center gap-2">
                                <MaterialCommunityIcons name="wallet-outline" size={20} color="#3713ec" />
                                <Text className="text-lg font-bold text-on-surface">Earnings</Text>
                            </View>
                        </View>

                        <View className="overflow-hidden">
                            <View className="flex-row bg-slate-50 border-b border-slate-100 py-3 px-4">
                                <Text className="flex-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Description</Text>
                                <Text className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant text-right">Amount</Text>
                            </View>
                            <View className="divide-y divide-slate-100">
                                {earnings.map((earn, idx) => (
                                    <View key={idx} className="flex-row py-4 px-4 hover:bg-slate-50/50">
                                        <Text className="flex-1 text-sm font-medium text-on-surface">{earn.name}</Text>
                                        <Text className="text-sm font-medium text-on-surface text-right">{formatCurrency(earn.total)}</Text>
                                    </View>
                                ))}
                            </View>
                            <View className="flex-row py-4 px-4 border-t border-slate-200 mt-2">
                                <Text className="flex-1 text-sm font-bold text-on-surface">Total Gross Pay</Text>
                                <Text className="text-sm font-black text-on-surface text-right">{formatCurrency(totalGross)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Company Info */}
                    <View className="bg-white rounded-xl border border-outline-variant p-6 md:p-8 relative overflow-hidden shadow-sm flex-1 min-w-[250px]">
                        <View className="absolute -top-4 -right-4 opacity-[0.04]">
                            <MaterialCommunityIcons name="domain" size={120} color="#000" />
                        </View>
                        <View className="flex-row items-center gap-2 mb-6">
                            <MaterialCommunityIcons name="domain" size={20} color="#3713ec" />
                            <Text className="text-lg font-bold text-on-surface">Employer</Text>
                        </View>

                        <View className="space-y-6">
                            <View>
                                <Text className="text-sm font-black text-on-surface">{companyName}</Text>
                                <Text className="text-xs text-on-surface-variant leading-relaxed mt-1">
                                    {companyAddress}
                                </Text>
                            </View>
                            <View className="space-y-3">
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-[10px] font-bold uppercase text-on-surface-variant w-16">Tax ID:</Text>
                                    <Text className="text-xs font-medium text-on-surface">{companyVat}</Text>
                                </View>
                                <View className="flex-row items-center gap-2 mt-2">
                                    <Text className="text-[10px] font-bold uppercase text-on-surface-variant w-16">Contact:</Text>
                                    <Text className="text-xs font-medium text-on-surface">{companyEmail}</Text>
                                </View>
                            </View>
                            <View className="pt-4 border-t border-slate-100 mt-4 flex-row items-center gap-3">
                                <View className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                                    <MaterialCommunityIcons name="qrcode-scan" size={20} color="#94a3b8" />
                                </View>
                                <View className="flex-col">
                                    <Text className="text-[10px] font-bold uppercase text-on-surface-variant">Verify Record</Text>
                                    <Text className="text-[10px] font-medium text-primary hover:underline">Scan for authentication</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Deductions Section (Span full width) */}
                    <View className="bg-white rounded-xl border border-outline-variant p-6 md:p-8 relative overflow-hidden shadow-sm w-full">
                        <View className="absolute -top-4 -right-4 opacity-[0.04]">
                            <MaterialCommunityIcons name="trending-down" size={144} color="#000" />
                        </View>
                        <View className="flex-row items-center justify-between mb-8">
                            <View className="flex-row items-center gap-2">
                                <MaterialCommunityIcons name="minus-circle-outline" size={20} color="#ef4444" />
                                <Text className="text-lg font-bold text-on-surface">Deductions</Text>
                            </View>
                        </View>

                        <View className="flex-col lg:flex-row gap-8 lg:gap-12">
                            <View className="overflow-hidden flex-1">
                                <View className="flex-row bg-slate-50 border-b border-slate-100 py-3 px-4">
                                    <Text className="flex-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Deduction Type</Text>
                                    <Text className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant text-right">Amount</Text>
                                </View>
                                <View className="divide-y divide-slate-100">
                                    {deductions.map((ded, idx) => (
                                        <View key={idx} className="flex-row py-4 px-4 hover:bg-slate-50/50">
                                            <Text className="flex-1 text-sm font-medium text-on-surface">{ded.name}</Text>
                                            <Text className="text-sm font-medium text-on-surface text-right">{formatCurrency(ded.total)}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <View className="bg-slate-50/50 rounded-xl p-6 flex flex-col justify-center border border-slate-100 lg:w-[400px]">
                                <View className="space-y-4">
                                    <View className="flex-row justify-between items-center pb-3 border-b border-slate-200">
                                        <Text className="text-sm font-medium text-on-surface-variant">Total Gross Earnings</Text>
                                        <Text className="text-sm font-bold text-on-surface">{formatCurrency(totalGross)}</Text>
                                    </View>
                                    <View className="flex-row justify-between items-center pb-3 border-b border-slate-200 mt-3">
                                        <Text className="text-sm font-medium text-on-surface-variant">Total Deductions</Text>
                                        <Text className="text-sm font-bold text-error">({formatCurrency(totalDeductions)})</Text>
                                    </View>
                                    <View className="flex-row justify-between items-center pt-2 mt-3">
                                        <View className="flex-col">
                                            <Text className="text-[10px] font-bold uppercase text-primary">Final Settlement</Text>
                                            <Text className="text-xl md:text-2xl font-black text-on-surface">Net Take Home</Text>
                                        </View>
                                        <Text className="text-2xl md:text-3xl font-black text-primary">{formatCurrency(finalNet)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>


            </ScrollView>
        </View>
    );
}
