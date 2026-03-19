import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { ModuleRegistry } from '../modules/module-registry.js';

/**
 * Fetches the current user's available Odoo group XML IDs.
 *
 * Returns strings like: ['base.group_user', 'hr_attendance.group_hr_attendance']
 *
 * This hook checks the exact groups needed by standard registered PortalModules
 * using `res.users.has_group`, which is safe for non-admin users to call.
 */
export const useUserGroups = (
    client: OdooClient | null,
): string[] => {
    const uid = client?.getSession()?.uid ?? null;

    const { data } = useQuery<string[]>({
        queryKey: ['odoo', 'user-groups', uid],
        queryFn: async () => {
            if (!client) throw new Error('Not authenticated');

            // Find exactly which groups the front-end modules care about
            const requiredGroups = ModuleRegistry.getAllRequiredGroups();

            if (requiredGroups.length === 0) return [];

            // Check them all in parallel via standard Odoo has_group
            const groupChecks = await Promise.all(
                requiredGroups.map(async (extId) => {
                    const hasAccess = await client.callKw<boolean>('res.users', 'has_group', [[uid], extId]);
                    return { extId, hasAccess };
                })
            );

            // Filter down to only the ones returning true
            return groupChecks.filter((g) => g.hasAccess).map((g) => g.extId);
        },
        enabled: client !== null && uid !== null,
        // Groups rarely change mid-session — cache indefinitely
        staleTime: Infinity,
    });

    return useMemo(() => data ?? [], [data]);
};
