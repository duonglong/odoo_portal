import { useMemo } from 'react';
import type { ModuleRegistration } from '@odoo-portal/core';
import { ModuleRegistry } from './module-registry.js';

/**
 * Hook to get modules accessible to the current user.
 *
 * @param userGroupIds - The user's Odoo group XML IDs
 * @returns Array of accessible module registrations
 */
export const useModules = (userGroupIds: string[] = []): ModuleRegistration[] => {
    return useMemo(
        () => ModuleRegistry.getAccessible(userGroupIds),
        [userGroupIds],
    );
};


