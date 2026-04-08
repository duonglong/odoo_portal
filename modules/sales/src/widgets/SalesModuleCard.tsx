import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import type { PortalModule } from '@odoo-portal/core';

interface Props { module: PortalModule }

export default function SalesModuleCard({ module }: Props) {
    return (
        <TouchableOpacity
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm active:opacity-80"
            onPress={() => router.push('/sales')}
        >
            <Text className="text-3xl mb-3">{module.icon}</Text>
            <Text className="text-base font-bold text-slate-900">{module.name}</Text>
            <Text className="text-xs text-slate-400 mt-1">Open module →</Text>
        </TouchableOpacity>
    );
}
