import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { AttendanceRepository, type LeaveFilters } from './repository.js';
import type { LeaveRequest } from './types.js';

const QUERY_KEYS = {
    employee: (userId: number) => ['attendance', 'employee', userId] as const,
    records: (employeeId: number, page: number) =>
        ['attendance', 'records', employeeId, page] as const,
    month: (employeeId: number, year: number, month: number) =>
        ['attendance', 'month', employeeId, year, month] as const,
    leaveBalances: (employeeId: number) => 
        ['attendance', 'leave_balances', employeeId] as const,
    myLeaveRequests: (employeeId: number, filters: LeaveFilters, page: number) => 
        ['attendance', 'my_leave_requests', employeeId, filters, page] as const,
    teamLeaves: (departmentId: number) =>
        ['attendance', 'team_leaves', departmentId] as const,
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
        staleTime: 1000 * 60 * 10,
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
        staleTime: 1000 * 60 * 1,
    });
};

/** Hook to get all attendance records for a calendar month */
export const useMonthAttendance = (
    client: OdooClient | null,
    employeeId: number | undefined,
    year: number,
    month: number,
) => {
    const repo = useMemo(
        () => (client ? new AttendanceRepository(client) : null),
        [client],
    );

    return useQuery({
        queryKey: QUERY_KEYS.month(employeeId ?? 0, year, month),
        queryFn: () => repo!.getMonthAttendance(employeeId!, year, month),
        enabled: repo !== null && employeeId !== undefined,
        staleTime: 1000 * 60 * 5,
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
            void queryClient.invalidateQueries({
                queryKey: ['attendance', 'employee', uid ?? 0],
            });
            void queryClient.invalidateQueries({
                queryKey: ['attendance', 'records'],
            });
        },
    });
};

// --- Leave Hooks ---

export const useLeaveBalances = (client: OdooClient | null, employeeId: number | undefined) => {
    const repo = useMemo(() => (client ? new AttendanceRepository(client) : null), [client]);
    
    return useQuery({
        queryKey: QUERY_KEYS.leaveBalances(employeeId ?? 0),
        queryFn: () => repo!.getLeaveBalances(employeeId!),
        enabled: repo !== null && employeeId !== undefined,
        staleTime: 1000 * 60 * 5,
    });
};

export const useMyLeaveRequests = (
    client: OdooClient | null, 
    employeeId: number | undefined, 
    filters: LeaveFilters = {},
    page = 0,
    pageSize = 20
) => {
    const repo = useMemo(() => (client ? new AttendanceRepository(client) : null), [client]);
    
    return useQuery({
        queryKey: QUERY_KEYS.myLeaveRequests(employeeId ?? 0, filters, page),
        queryFn: () => repo!.getMyLeaveRequests(employeeId!, filters, pageSize, page * pageSize),
        enabled: repo !== null && employeeId !== undefined,
        staleTime: 1000 * 60 * 2,
    });
};

export const useTeamLeaves = (client: OdooClient | null, departmentId: number | undefined) => {
    const repo = useMemo(() => (client ? new AttendanceRepository(client) : null), [client]);
    
    return useQuery({
        queryKey: QUERY_KEYS.teamLeaves(departmentId ?? 0),
        queryFn: () => repo!.getTeamUpcomingLeaves(departmentId!),
        enabled: repo !== null && departmentId !== undefined,
        staleTime: 1000 * 60 * 10,
    });
};

export const useCreateLeave = (client: OdooClient | null, employeeId: number | undefined) => {
    const queryClient = useQueryClient();
    // Implementation deferred to UI integration phase.
    return useMutation({
        mutationFn: async (data: Partial<LeaveRequest>) => {
            throw new Error("Not implemented yet");
        }
    });
}
