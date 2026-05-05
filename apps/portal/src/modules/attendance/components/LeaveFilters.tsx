import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DatePicker } from './DatePicker.js';
import type { LeaveFilters as BaseFilters } from '../repository.js';

export type LeaveFiltersValue = BaseFilters;

interface Props {
    filters: LeaveFiltersValue;
    onChange: (filters: LeaveFiltersValue) => void;
}

export function LeaveFilters({ filters, onChange }: Props) {
    const router = useRouter();

    const tabs = [
        { id: 'all', label: 'All Requests' },
        { id: 'approved', label: 'Approved' },
        { id: 'pending', label: 'Pending' },
        { id: 'draft', label: 'Draft' },
    ];

    const currentStatus = filters.status || 'all';
    
    const thisYear = new Date().getFullYear();
    const currentPeriodLabel = filters.month && filters.year
        ? `${new Date(filters.year, filters.month - 1).toLocaleString('default', { month: 'short' })} ${filters.year}`
        : filters.year || thisYear;

    const currentMonthForPicker = filters.month || new Date().getMonth() + 1;
    const currentYearForPicker = filters.year || thisYear;
    const dateValue = `${currentYearForPicker}-${String(currentMonthForPicker).padStart(2, '0')}`;

    const handleDateChange = (dateStr: string) => {
        // Web type="month" returns "YYYY-MM", Native returns "YYYY-MM-DD"
        const parts = dateStr.split('-');
        const yStr = parts[0];
        const mStr = parts[1];
        if (!yStr || !mStr) return;
        onChange({ 
            ...filters, 
            month: parseInt(mStr, 10), 
            year: parseInt(yStr, 10) 
        });
    };

    return (
        <View className="flex flex-col gap-4">
            <View className="flex flex-row justify-between items-end gap-2 px-2 sm:px-0">
                <View>
                    <Text className="text-slate-900  text-3xl font-black tracking-tight">Leave Management</Text>
                    <Text className="text-slate-500  mt-1">Manage and track your time off requests and balances.</Text>
                </View>
                <View className="flex flex-row gap-3">
                    <Pressable
                        className="flex flex-row items-center gap-2 px-4 py-2 bg-primary rounded-lg shadow-sm"
                        onPress={() => router.push('/attendance/leave-request' as never)}
                    >
                        <MaterialIcons name="add" size={18} className="text-white" />
                        <Text className="text-sm font-bold text-white">New Request</Text>
                    </Pressable>
                    <DatePicker value={dateValue} type="month" onChange={handleDateChange}>
                        <View className="flex flex-row items-center gap-2 px-4 py-2 bg-white  border border-slate-200  rounded-lg">
                            <MaterialIcons name="calendar-today" size={16} className="text-slate-700 " />
                            <Text className="text-sm font-bold text-slate-700 ">{currentPeriodLabel}</Text>
                            <MaterialIcons name="expand-more" size={16} className="text-slate-700 " />
                        </View>
                    </DatePicker>
                    {filters.month && (
                        <Pressable
                            className="flex flex-row items-center px-3 py-2 bg-white border border-slate-200 rounded-lg"
                            onPress={() => onChange({ ...filters, month: undefined })}
                        >
                            <MaterialIcons name="close" size={16} className="text-slate-700" />
                        </Pressable>
                    )}
                </View>
            </View>

            <View className="flex flex-row gap-6 border-b border-slate-200  mt-2 px-2">
                {tabs.map((tab) => {
                    const isActive = currentStatus === tab.id;
                    return (
                        <Pressable
                            key={tab.id}
                            onPress={() => onChange({ ...filters, status: tab.id })}
                            className={`pb-4 -mb-[1px] border-b-2 ${isActive ? 'border-[#7c5fb4]' : 'border-transparent'}`}
                        >
                            <Text className={`text-sm font-bold ${isActive ? 'text-[#7c5fb4]' : 'text-slate-500 '}`}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
