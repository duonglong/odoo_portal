import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { useRepository } from '@odoo-portal/core';
import { PayslipRepository } from './repository.js';

export const QUERY_KEYS = {
    list:        (userId: number)    => ['payslip', 'list', userId] as const,
    linesSingle: (slipId: number)    => ['payslip', 'lines-single', slipId] as const,
    lines:       (slipIds: number[]) => ['payslip', 'lines', slipIds] as const,
    company:     (companyId: number) => ['company', companyId] as const,
} as const;

export const usePayslips = (client: OdooClient | null, userId?: number) => {
    const repo = useRepository(client, (c) => new PayslipRepository(c));

    return useQuery({
        queryKey: QUERY_KEYS.list(userId ?? 0),
        queryFn: () => repo!.getPayslips(userId),
        enabled: repo !== null && userId !== undefined,
    });
};

export function usePayslipLines(client: OdooClient | null, slipId?: number) {
    return useQuery({
        queryKey: QUERY_KEYS.linesSingle(slipId ?? 0),
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
        queryKey: QUERY_KEYS.lines(slipIds),
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
    const repo = useRepository(client, (c) => new PayslipRepository(c));
    return useQuery({
        queryKey: QUERY_KEYS.company(companyId ?? 0),
        queryFn: () => repo!.getCompanyDetails(companyId!),
        enabled: repo !== null && !!companyId,
        staleTime: 60 * 60 * 1000,
    });
}
