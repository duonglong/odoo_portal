import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { LeaveBalance } from '../types.js';

export function LeaveBalanceCards({ balances, isLoading }: { balances: LeaveBalance[], isLoading: boolean }) {
    if (isLoading) {
        return (
            <View className="flex-row items-center justify-center p-4 h-32">
                <ActivityIndicator size="large" color="#7c5fb4" />
            </View>
        );
    }

    const getCardStyle = (typeName: string) => {
        const lower = typeName.toLowerCase();
        if (lower.includes('sick')) {
            return {
                icon: 'medical-services' as const,
                mainColorClass: 'text-emerald-600',
                bgClass: 'bg-emerald-100',
                progressBgClass: 'bg-emerald-500'
            };
        }
        if (lower.includes('unpaid') || lower.includes('compensatory')) {
            return {
                icon: 'block' as const,
                mainColorClass: 'text-slate-600',
                bgClass: 'bg-slate-100',
                progressBgClass: 'bg-slate-400'
            };
        }
        return { // Default to primary/PTO styling
            icon: 'beach-access' as const,
            mainColorClass: 'text-[#7c5fb4]',
            bgClass: 'bg-[#7c5fb4]/10',
            progressBgClass: 'bg-[#7c5fb4]'
        };
    };

    const renderCard = (item: LeaveBalance) => {
        const style = getCardStyle(item.typeName);
        const available = item.maxLeaves - item.leavesTaken;
        const total = item.maxLeaves || 1; // avoid division by zero
        const percent = Math.min(100, Math.max(0, (item.leavesTaken || 0) / total * 100));
        const isUnpaid = item.typeName.toLowerCase().includes('unpaid');

        return (
            <View key={item.typeId} className="flex flex-col gap-4 rounded-xl p-6 bg-white border border-slate-200 shadow-sm flex-1 min-w-[250px]">
                <div className="flex flex-row items-center gap-3">
                    <View className={`p-2 rounded-lg ${style.bgClass}`}>
                        <MaterialIcons name={style.icon} size={24} className={style.mainColorClass} />
                    </View>
                    <Text className="text-slate-600 text-sm font-semibold uppercase tracking-wider">
                        {item.typeName}
                    </Text>
                </div>
                <View className="flex flex-row items-baseline gap-2">
                    <Text className="text-slate-900 text-4xl font-bold tracking-tight">
                        {isUnpaid ? item.leavesTaken : available}
                    </Text>
                    <Text className="text-slate-500 text-sm">
                        {isUnpaid ? 'days used' : 'days available'}
                    </Text>
                </View>
                <View className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex-row">
                    <View className={`h-full ${style.progressBgClass}`} style={{ width: `${percent}%` }} />
                </View>
            </View>
        );
    };

    if (balances.length === 0) {
        // Fallback if user has no allocations mapped yet
        return (
            <View className="flex-col md:flex-row gap-6 w-full">
                <View className="flex flex-col gap-4 rounded-xl p-6 bg-white border border-slate-200 shadow-sm flex-1 opacity-50">
                    <Text className="text-slate-500 font-medium">No leave balances found</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full" contentContainerStyle={{ gap: 24, paddingRight: 24 }}>
            <View className="flex-row gap-6">
                {balances.map(b => renderCard(b))}
            </View>
        </ScrollView>
    );
}
