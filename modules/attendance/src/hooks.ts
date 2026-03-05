import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { AttendanceRepository } from './repository.js';

const QUERY_KEYS = {
    employee: (userId: number) => ['attendance', 'employee', userId] as const,
    records: (employeeId: number, page: number) =>
        ['attendance', 'records', employeeId, page] as const,
    month: (employeeId: number, year: number, month: number) =>
        ['attendance', 'month', employeeId, year, month] as const,
};

/** Hook to get the current user's employee record */
export const useMyEmployee = (client: OdooClient | null, uid: number | undefined) => {
    const repo = useMemo(
        () => (client ? new AttendanceRepository(client) : null),
        [client],
    );

    return useQuery({
        queryKey: QUERY_KEYS.employee(uid ?? 0),
        queryFn: () => repo!.getMyEmployee(uid!),
        enabled: repo !== null && uid !== undefined,
        staleTime: 1000 * 60 * 10, // Employee data is stable — cache 10 min
    });
};

/** Hook to get attendance records (paginated) */
export const useAttendanceRecords = (
    client: OdooClient | null,
    employeeId: number | undefined,
    page = 0,
    pageSize = 20,
) => {
    const repo = useMemo(
        () => (client ? new AttendanceRepository(client) : null),
        [client],
    );

    return useQuery({
        queryKey: QUERY_KEYS.records(employeeId ?? 0, page),
        queryFn: () =>
            repo!.getMyAttendance(employeeId!, pageSize, page * pageSize),
        enabled: repo !== null && employeeId !== undefined,
        staleTime: 1000 * 60 * 1, // Attendance data changes often — 1 min
    });
};

/** Hook to get all attendance records for a calendar month (for the calendar grid view) */
export const useMonthAttendance = (
    client: OdooClient | null,
    employeeId: number | undefined,
    year: number,
    month: number, // 1-indexed
) => {
    const repo = useMemo(
        () => (client ? new AttendanceRepository(client) : null),
        [client],
    );

    return useQuery({
        queryKey: QUERY_KEYS.month(employeeId ?? 0, year, month),
        queryFn: () => repo!.getMonthAttendance(employeeId!, year, month),
        enabled: repo !== null && employeeId !== undefined,
        staleTime: 1000 * 60 * 5, // Monthly view — refresh every 5 min
    });
};

/** Hook to check in or check out */
export const useCheckInOut = (client: OdooClient | null, uid: number | undefined) => {
    const queryClient = useQueryClient();
    const repo = useMemo(
        () => (client ? new AttendanceRepository(client) : null),
        [client],
    );

    return useMutation({
        mutationFn: async ({ employeeId }: { employeeId: number }) => {
            if (!repo) throw new Error('Not authenticated');
            return repo.checkInOut({ employeeId });
        },
        onSuccess: () => {
            // Invalidate both the employee state and the attendance records
            void queryClient.invalidateQueries({
                queryKey: ['attendance', 'employee', uid ?? 0],
            });
            void queryClient.invalidateQueries({
                queryKey: ['attendance', 'records'],
            });
        },
    });
};
