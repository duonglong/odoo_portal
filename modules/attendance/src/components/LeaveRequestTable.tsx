import { View, Text, Pressable, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useDeleteLeave } from '../hooks/useLeave.js';
import { toast } from '@odoo-portal/core';
import type { LeaveRequest } from '../types.js';

interface Props {
    requests: LeaveRequest[];
    isLoading: boolean;
    page: number;
    setPage: (p: number) => void;
    hasMore: boolean;
}

export function LeaveRequestTable({ requests, isLoading, page, setPage, hasMore }: Props) {
    const { mutate: deleteLeave, isPending: isDeleting } = useDeleteLeave();

    const handleDelete = (id: number) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this leave request?')) {
                executeDelete(id);
            }
        } else {
            Alert.alert(
                'Delete Request',
                'Are you sure you want to delete this leave request?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => executeDelete(id) }
                ]
            );
        }
    };

    const executeDelete = (id: number) => {
        deleteLeave(id, {
            onSuccess: () => {
                toast.success('Request Deleted', 'The leave request was successfully deleted.');
            },
            onError: (err) => {
                toast.odooError(err);
            }
        });
    };
    if (isLoading && requests.length === 0) {
        return (
            <View className="flex items-center justify-center p-12">
                <ActivityIndicator size="large" color="#7c5fb4" />
            </View>
        );
    }

    if (requests.length === 0) {
        return (
            <View className="flex items-center justify-center p-12">
                <Text className="text-slate-500 ">No requests found.</Text>
            </View>
        );
    }

    const renderStatus = (status: string) => {
        let bg = 'bg-slate-100 ';
        let text = 'text-slate-600 ';
        let label = 'Draft';

        if (status === 'validate') {
            bg = 'bg-emerald-100 ';
            text = 'text-emerald-700 ';
            label = 'Approved';
        } else if (status === 'confirm' || status === 'validate1') {
            bg = 'bg-amber-100 ';
            text = 'text-amber-700 ';
            label = 'Pending';
        } else if (status === 'refuse') {
            bg = 'bg-red-100 ';
            text = 'text-red-700 ';
            label = 'Refused';
        }

        return (
            <View className={`rounded-full px-3 py-1 ${bg} self-center sm:self-auto`}>
                <Text className={`text-xs font-bold ${text}`}>{label}</Text>
            </View>
        );
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatYear = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).getFullYear().toString();
    };


    const isWeb = Platform.OS === 'web';

    return (
        <View className="flex-1 w-full">
            {isWeb ? (
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 ">
                                <th className="px-6 py-4 text-slate-500  font-bold text-xs uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-slate-500  font-bold text-xs uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-slate-500  font-bold text-xs uppercase tracking-wider">Dates</th>
                                <th className="px-6 py-4 text-slate-500  font-bold text-xs uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-4 text-slate-500  font-bold text-xs uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 text-slate-500  font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 ">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50/50 :bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${req.typeName.toLowerCase().includes('sick') ? 'bg-emerald-500' : 'bg-primary'}`}></div>
                                            <span className="font-medium">{req.typeName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-slate-600 ">{req.description || req.typeName}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">{formatDate(req.startDate)}{req.startDate !== req.endDate ? ` - ${formatDate(req.endDate)}` : ''}</span>
                                            <span className="text-xs text-slate-400">{formatYear(req.startDate)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 font-medium">{req.duration} Day{req.duration > 1 ? 's' : ''}</td>
                                    <td className="px-6 py-5 text-center flex justify-center">
                                        {renderStatus(req.status)}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        {(req.status === 'confirm' || req.status === 'validate1') && (
                                            <button
                                                onClick={() => handleDelete(req.id)}
                                                disabled={isDeleting}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                                                title="Delete Request"
                                            >
                                                <MaterialIcons name="delete-outline" size={20} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <ScrollView className="flex-1 w-full divide-y divide-slate-100 ">
                    {requests.map((req) => (
                        <View key={req.id} className="p-4 flex flex-row items-center justify-between gap-4">
                            <View className="flex flex-col gap-1 flex-1">
                                <View className="flex flex-row items-center gap-2">
                                    <View className={`w-2 h-2 rounded-full ${req.typeName.toLowerCase().includes('sick') ? 'bg-emerald-500' : 'bg-[#7c5fb4]'}`}></View>
                                    <Text className="text-slate-900  font-semibold text-base">{req.typeName}</Text>
                                </View>
                                <Text className="text-slate-500  text-sm">{formatDate(req.startDate)}{req.startDate !== req.endDate ? ` - ${formatDate(req.endDate)}` : ''} • {formatYear(req.startDate)}</Text>
                                <Text className="text-slate-600  text-sm mt-1">{req.duration} Day{req.duration > 1 ? 's' : ''}</Text>
                            </View>
                            <View className="flex-row items-center gap-4">
                                {renderStatus(req.status)}
                                {(req.status === 'confirm' || req.status === 'validate1') && (
                                    <Pressable
                                        onPress={() => handleDelete(req.id)}
                                        disabled={isDeleting}
                                        className="p-2 rounded-full bg-slate-50"
                                    >
                                        <MaterialIcons name="delete-outline" size={20} className="text-slate-400" />
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Pagination Controls */}
            <View className="px-6 py-4 bg-slate-50  flex flex-row items-center justify-between border-t border-slate-200 ">
                <Text className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    {requests.length > 0 ? `Showing page ${page + 1}` : ''}
                </Text>
                <View className="flex flex-row gap-2">
                    <Pressable
                        disabled={page === 0}
                        onPress={() => setPage(page - 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded border ${page === 0 ? 'border-slate-100  opacity-50' : 'border-slate-200  bg-white '}`}
                    >
                        <MaterialIcons name="chevron-left" size={16} className="text-slate-600 " />
                    </Pressable>
                    <View className="w-8 h-8 flex items-center justify-center rounded border border-[#7c5fb4] bg-[#7c5fb4]">
                        <Text className="text-white text-xs font-bold">{page + 1}</Text>
                    </View>
                    <Pressable
                        disabled={!hasMore}
                        onPress={() => setPage(page + 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded border ${!hasMore ? 'border-slate-100  opacity-50' : 'border-slate-200  bg-white '}`}
                    >
                        <MaterialIcons name="chevron-right" size={16} className="text-slate-600 " />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
