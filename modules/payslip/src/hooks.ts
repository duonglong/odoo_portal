import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { PayslipRepository } from './repository.js';

export const usePayslips = (client: OdooClient | null, userId?: number) => {
    const repo = useMemo(
        () => (client ? new PayslipRepository(client) : null),
        [client],
    );

    return useQuery({
        queryKey: ['payslips', userId],
        queryFn: () => repo!.getPayslips(userId),
        enabled: repo !== null && userId !== undefined,
    });
};

export function usePayslipLines(client: OdooClient | null, slipId?: number) {
    return useQuery({
        queryKey: ['payslipLines', slipId],
        queryFn: async () => {
            if (!client || !slipId) return [];
            const repo = new PayslipRepository(client);
            return repo.getPayslipLinesBySlipId(slipId);
        },
        enabled: !!client && !!slipId,
        staleTime: 10 * 60 * 1000,
    });
}

export function useBatchPayslipLines(client: OdooClient | null, slipIds: number[]) {
    return useQuery({
        queryKey: ['batchPayslipLines', slipIds],
        queryFn: async () => {
            if (!client || !slipIds || slipIds.length === 0) return [];
            const repo = new PayslipRepository(client);
            return repo.getBatchPayslipLines(slipIds);
        },
        enabled: !!client && slipIds.length > 0,
        staleTime: 10 * 60 * 1000,
    });
}

export function useCompany(client: OdooClient | null, companyId?: number) {
    return useQuery({
        queryKey: ['company', companyId],
        queryFn: async () => {
            if (!client || !companyId) return null;
            const repo = new PayslipRepository(client);
            return repo.getCompanyDetails(companyId);
        },
        enabled: !!client && !!companyId,
        staleTime: 60 * 60 * 1000,
    });
}
