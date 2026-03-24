import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useAuth } from '@odoo-portal/core';
import { useMyEmployee, useLeaveBalances, useMyLeaveRequests } from '../hooks.js';
import type { LeaveFiltersValue } from '../components/LeaveFilters.js';
import { LeaveBalanceCards } from '../components/LeaveBalanceCards.js';
import { LeaveFilters } from '../components/LeaveFilters.js';
import { LeaveRequestTable } from '../components/LeaveRequestTable.js';

export default function LeaveRequestListScreen() {
    const { client, session } = useAuth();
    const { data: employee } = useMyEmployee(client, session?.uid);

    const [filters, setFilters] = useState<LeaveFiltersValue>({
        status: 'all',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
    });
    const [page, setPage] = useState(0);

    const { data: balances = [], isLoading: balancesLoading } = useLeaveBalances(client, employee?.id);
    const { data: requests = [], isLoading: requestsLoading } = useMyLeaveRequests(
        client,
        employee?.id,
        filters,
        page
    );

    const handleFilterChange = (newFilters: LeaveFiltersValue) => {
        setFilters(newFilters);
        setPage(0); // Reset page on filter change
    };

    return (
        <View className="flex-1 bg-slate-50 ">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 32 }}
            >
                <View className="max-w-7xl mx-auto w-full gap-8">

                    {/* Header & Filters */}
                    <LeaveFilters filters={filters} onChange={handleFilterChange} />

                    {/* Balances */}
                    <LeaveBalanceCards balances={balances} isLoading={balancesLoading} />

                    {/* Main Table Area */}
                    <View className="flex flex-col bg-white  border border-slate-200  rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                        <LeaveRequestTable
                            requests={requests}
                            isLoading={requestsLoading}
                            page={page}
                            setPage={setPage}
                            hasMore={requests.length === 20} // Simple heuristic for pagination given limit 20
                        />
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}
