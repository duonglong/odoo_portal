import type { ModuleRegistration } from '@odoo-portal/core';

export const settingsModule: ModuleRegistration = {
    module: {
        id: 'settings',
        name: 'Settings',
        icon: 'cog-outline',
        requiredModels: ['res.users', 'res.partner', 'hr.employee'],
        requiredGroups: ['base.group_portal', 'base.group_user'],
        routes: [
            {
                title: 'Settings',
                path: '/settings/profile',
                icon: 'cog-outline',
                showInNav: true,
            }
        ],
    },
    loadScreens: async () => {
        const { default: ProfileScreen } = await import('./screens/ProfileScreen.js');
        return { ProfileScreen };
    },
};
