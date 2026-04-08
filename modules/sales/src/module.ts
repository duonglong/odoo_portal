import type { ModuleRegistration } from '@odoo-portal/core';

export const salesModule: ModuleRegistration = {
    module: {
        id: 'sales',
        name: 'Sales Orders',
        icon: '📦',                             // TODO: pick an emoji or icon
        requiredModels: [],                      // TODO: e.g. ['sales.record']
        requiredGroups: [],                      // TODO: e.g. ['base.group_user']
        routes: [
            { path: '/sales', title: 'Sales Orders', showInNav: true },
        ],
    },
    widgets: {
        ModuleCard: () => import('./widgets/SalesModuleCard.js').then(m => m.default),
    },
    loadScreens: async () => {
        const { default: Main } = await import('./screens/MainScreen.js');
        return { Main };
    },
};
