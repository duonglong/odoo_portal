import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import type { OdooDomain, SearchOptions } from '@odoo-portal/types';
import type { OdooClient } from '@odoo-portal/odoo-client';

export interface UseOdooQueryOptions<T = Record<string, unknown>> {
    /** Odoo model name, e.g. 'sale.order' */
    model: string;
    /** Domain filter */
    domain?: OdooDomain;
    /** Fields to fetch. Empty = all (expensive). */
    fields?: string[];
    /** Pagination and sorting options */
    options?: SearchOptions;
    /** The OdooClient instance to use (from useAuth) */
    client: OdooClient | null;
    /**
     * Additional TanStack Query options.
     * Use `enabled` to conditionally fetch.
     */
    queryOptions?: Omit<
        UseQueryOptions<T[], Error>,
        'queryKey' | 'queryFn'
    >;
}

/**
 * TanStack Query wrapper for Odoo searchRead.
 *
 * Usage:
 *   const { client } = useAuth();
 *   const { data, isLoading } = useOdooQuery({
 *     model: 'sale.order',
 *     domain: [['state', '=', 'sale']],
 *     fields: ['name', 'amount_total'],
 *     client,
 *   });
 */
export const useOdooQuery = <T = Record<string, unknown>>({
    model,
    domain = [],
    fields = [],
    options = {},
    client,
    queryOptions = {},
}: UseOdooQueryOptions<T>) => {
    return useQuery<T[], Error>({
        queryKey: ['odoo', model, domain, fields, options],
        queryFn: async () => {
            if (!client) throw new Error('Not authenticated');
            return client.searchRead<T>(model, domain, fields, options);
        },
        enabled: client !== null && (queryOptions.enabled ?? true),
        ...queryOptions,
    });
};

/**
 * Query hook for counting records.
 */
export interface UseOdooCountOptions {
    model: string;
    domain?: OdooDomain;
    client: OdooClient | null;
    queryOptions?: Omit<UseQueryOptions<number, Error>, 'queryKey' | 'queryFn'>;
}

export const useOdooCount = ({
    model,
    domain = [],
    client,
    queryOptions = {},
}: UseOdooCountOptions) => {
    return useQuery<number, Error>({
        queryKey: ['odoo', model, 'count', domain],
        queryFn: async () => {
            if (!client) throw new Error('Not authenticated');
            return client.searchCount(model, domain);
        },
        enabled: client !== null && (queryOptions.enabled ?? true),
        ...queryOptions,
    });
};
