import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@odoo-portal/core';
import { SalesRepository } from './repository.js';

export function useSalesRecords() {
    const { client } = useAuth();
    return useQuery({
        queryKey: ['sales', 'list'],
        queryFn: () => new SalesRepository(client!).list(),
        enabled: !!client,
    });
}
