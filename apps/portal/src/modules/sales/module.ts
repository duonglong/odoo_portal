import type { ModuleRegistration } from '@odoo-portal/core';

export const salesModule: ModuleRegistration = {
    module: {
        id: 'sales',
        name: 'Sales Orders',
        icon: 'shopping-outline',
        requiredModels: [],   // TODO: e.g. ['sale.order']
        requiredGroups: [],   // TODO: e.g. ['sales_team.group_sale_salesman']
        routes: [
            { path: '/sales', title: 'Sales Orders', showInNav: true },
        ],
    },
    loadScreens: async () => {
        const { default: Main } = await import('./screens/MainScreen.js');
        return { Main };
    },
};
