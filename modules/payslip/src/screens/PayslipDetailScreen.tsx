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

    // Use company data dynamically
    const companyName = company?.name || 'Unknown Company';
    const companyAddress = company 
        ? [company.street, company.city, company.zip].filter(Boolean).join(' ')
        : '';
    const companyVat = company?.vat || 'Not Provided';
    const companyEmail = company?.email || 'Not Provided';

    // Find final Net
    const netLine = lines.find(l => l.code === 'NET');
    const finalNet = netLine ? netLine.total : lines.reduce((acc, curr) => acc + curr.total, 0);

    // Group lines dynamically by category to recreate the document structure
    const categories: { name: string, lines: typeof lines }[] = [];
    lines.forEach(l => {
        const catName = l.categoryId?.name || 'Uncategorized';
        let cat = categories.find(c => c.name === catName);
        if (!cat) {
            cat = { name: catName, lines: [] };
            categories.push(cat);
        }
        cat.lines.push(l);
    });

    return (
        <View className="flex-1 bg-surface-container-low">
            <ScrollView className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full">

                {/* Back button */}
                <TouchableOpacity onPress={() => router.back()} className="mb-6 flex-row items-center gap-2 self-start">
                    <MaterialCommunityIcons name="arrow-left" size={20} color="#64748b" />
                    <Text className="text-on-surface-variant font-bold text-sm hover:text-primary transition-colors">Back to Directory</Text>
                </TouchableOpacity>

                {/* Header Information */}
                <View className="bg-white rounded-xl border border-outline-variant p-6 md:p-8 shadow-sm mb-8">
                    <View className="flex-col md:flex-row justify-between mb-8 gap-6 border-b border-slate-100 pb-8">
                        <View className="flex-1">
                            <Text className="text-2xl font-black text-on-surface mb-2">{payslip.name}</Text>
                            <Text className="text-sm text-on-surface-variant mb-4">
                                {formatDate(payslip.dateFrom)} - {formatDate(payslip.dateTo)}
                            </Text>
                            <View className="flex-row items-center gap-2">
                                <MaterialCommunityIcons name="domain" size={16} color="#64748b" />
                                <Text className="text-sm font-bold text-on-surface">{companyName}</Text>
                            </View>
                            {companyAddress ? <Text className="text-xs text-on-surface-variant mt-1">{companyAddress}</Text> : null}
                            {companyVat ? <Text className="text-xs text-on-surface-variant mt-1">VAT: {companyVat}</Text> : null}
                        </View>
                        <View className="flex-1 md:items-end w-full md:w-auto mt-4 md:mt-0">
                            <Text className="text-[10px] font-bold uppercase tracking-[0.05em] text-on-surface-variant mb-1">Net Pay Amount</Text>
                            <Text className="text-4xl md:text-5xl font-black text-primary tracking-tighter">
                                {formatCurrency(finalNet)}
                            </Text>
                            <View className="bg-primary-container px-3 py-1 rounded-full mt-3">
                                <Text className="text-xs font-bold uppercase tracking-wide text-primary">
                                    Status: {payslip.state}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Salary Computation Table */}
                    <View className="mt-4">
                        <Text className="text-lg font-bold text-on-surface flex-row items-center mb-6">
                            Salary Computation
                        </Text>
                        
                        <View className="rounded-xl border border-outline-variant overflow-hidden">
                            {/* Table Header */}
                            <View className="flex-row bg-slate-50 border-b border-slate-200 py-3 px-4">
                                <Text className="flex-[2] text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Name</Text>
                                <Text className="flex-1 hidden md:flex text-[10px] font-bold uppercase tracking-wide text-on-surface-variant text-right">Quantity</Text>
                                <Text className="flex-1 hidden md:flex text-[10px] font-bold uppercase tracking-wide text-on-surface-variant text-right">Rate</Text>
                                <Text className="flex-1 hidden md:flex text-[10px] font-bold uppercase tracking-wide text-on-surface-variant text-right">Amount</Text>
                                <Text className="flex-1 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant text-right">Total</Text>
                            </View>
                            
                            {/* Table Body Groups */}
                            <View className="divide-y divide-slate-100 bg-white">
                                {categories.map((cat, catIdx) => (
                                    <View key={catIdx} className="group">
                                        <View className="bg-slate-50/50 py-2 px-4 border-b border-slate-50">
                                            <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{cat.name}</Text>
                                        </View>
                                        {cat.lines.map((line, lineIdx) => (
                                            <View key={lineIdx} className="flex-row py-3 px-4 hover:bg-slate-50/50 items-center">
                                                <View className="flex-[2]">
                                                    <Text className="text-sm font-medium text-on-surface">{line.name}</Text>
                                                    <Text className="text-xs text-on-surface-variant md:hidden">
                                                        {line.quantity ? `Qty: ${line.quantity} ` : ''}
                                                        {line.rate ? `@ ${line.rate}% ` : ''}
                                                    </Text>
                                                </View>
                                                <Text className="flex-1 hidden md:flex text-sm text-on-surface-variant text-right">{line.quantity || '-'}</Text>
                                                <Text className="flex-1 hidden md:flex text-sm text-on-surface-variant text-right">{line.rate ? `${line.rate}%` : '-'}</Text>
                                                <Text className="flex-1 hidden md:flex text-sm text-on-surface-variant text-right">{line.amount ? formatCurrency(line.amount) : '-'}</Text>
                                                <Text className="flex-1 text-sm font-medium text-on-surface text-right">{formatCurrency(line.total)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}
