import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, mapOdooError } from '@odoo-portal/core';
import { LeaveRepository } from '@odoo-portal/odoo-client';

const LEAVE_KEYS = {
    all: ['leaves'] as const,
    types: () => [...LEAVE_KEYS.all, 'types'] as const,
    balances: (employeeId?: number) => [...LEAVE_KEYS.all, 'balances', employeeId] as const,
    myUpcoming: (employeeId?: number) => [...LEAVE_KEYS.all, 'upcoming', employeeId] as const,
    teamUpcoming: () => [...LEAVE_KEYS.all, 'team', 'upcoming'] as const,
};

function useLeaveRepository() {
    const { client } = useAuth();
    if (!client) throw new Error('Odoo client not initialized');
    return new LeaveRepository(client);
}

export function useLeaveTypes() {
    const repo = useLeaveRepository();

    return useQuery({
        queryKey: LEAVE_KEYS.types(),
        queryFn: () => repo.getLeaveTypes(),
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useLeaveBalances() {
    const { session } = useAuth();
    const repo = useLeaveRepository();

    // In a real app we'd get the actual employee_id from res.users
    // For now we map the user's partner_id or uid as a fallback, or assume employee_id = uid
    const employeeId = session?.uid;

    return useQuery({
        queryKey: LEAVE_KEYS.balances(employeeId),
        queryFn: () => repo.getMyBalances(employeeId!),
        enabled: !!employeeId,
    });
}

export function useTeamLeaves() {
    const repo = useLeaveRepository();

    return useQuery({
        queryKey: LEAVE_KEYS.teamUpcoming(),
        queryFn: () => repo.getTeamUpcomingLeaves(),
    });
}

export function useMyUpcomingLeaves(employeeId?: number) {
    const repo = useLeaveRepository();

    return useQuery({
        queryKey: LEAVE_KEYS.myUpcoming(employeeId),
        queryFn: () => repo.getMyUpcomingLeaves(employeeId!),
        enabled: !!employeeId,
    });
}

export function useCreateLeave() {
    const repo = useLeaveRepository();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: {
            holiday_status_id: number;
            request_date_from: string;
            request_date_to: string;
            name: string;
            employee_id?: number;
        }) => repo.createLeaveRequest(data),
        onSuccess: () => {
            // Invalidate balances and team leaves to refetch
            queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });
        },
    });
}

export function useDeleteLeave() {
    const repo = useLeaveRepository();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (leaveId: number) => repo.deleteLeaveRequest(leaveId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LEAVE_KEYS.all });
            queryClient.invalidateQueries({ queryKey: ['attendance', 'my_leave_requests'] });
            queryClient.invalidateQueries({ queryKey: ['attendance', 'leave_balances'] });
        }
    });
}
