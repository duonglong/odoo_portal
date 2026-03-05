import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OdooClient } from '@odoo-portal/odoo-client';

/**
 * Fetches the current user's Odoo group XML IDs.
 *
 * Returns strings like: ['base.group_user', 'hr_attendance.group_hr_attendance']
 *
 * These match the `requiredGroups` entries in PortalModule registrations.
 *
 * Two-step lookup (res.groups.full_name is "Category / Name" — NOT the XML ID):
 *   1. Get DB IDs of the user's groups via res.groups, filtered by user_ids
 *   2. Resolve those IDs → "module.name" XML IDs via ir.model.data
 */
export const useUserGroups = (
    client: OdooClient | null,
): string[] => {
    const uid = client?.getSession()?.uid ?? null;

    const { data } = useQuery<string[]>({
        queryKey: ['odoo', 'user-groups', uid],
        queryFn: async () => {
            if (!client) throw new Error('Not authenticated');

            // Step 1: get the DB IDs of the groups the user belongs to
            const groupRows = await client.searchRead<{ id: number }>(
                'res.groups',
                [['user_ids', 'in', [uid!]]],
                ['id'],
            );
            const groupIds = groupRows.map((r) => r.id);

            if (groupIds.length === 0) return [];

            // Step 2: resolve DB IDs → XML IDs via ir.model.data
            // ir.model.data has module='hr_attendance', name='group_hr_attendance'
            // → "module.name" == the XML ID used in requiredGroups
            const imdRows = await client.searchRead<{ module: string; name: string }>(
                'ir.model.data',
                [
                    ['model', '=', 'res.groups'],
                    ['res_id', 'in', groupIds],
                ],
                ['module', 'name'],
            );

            return imdRows.map((r) => `${r.module}.${r.name}`);
        },
        enabled: client !== null && uid !== null,
        // Groups rarely change mid-session — cache indefinitely
        staleTime: Infinity,
    });

    return useMemo(() => data ?? [], [data]);
};
