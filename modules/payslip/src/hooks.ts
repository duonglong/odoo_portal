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
