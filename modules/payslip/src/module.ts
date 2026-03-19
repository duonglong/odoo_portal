import type { ModuleRegistration } from '@odoo-portal/core';

export const payslipModule: ModuleRegistration = {
    module: {
        id: 'payslip',
        name: 'Payslips',
        icon: 'cash-multiple',
        requiredModels: ['hr.payslip'],
        routes: [
            { path: '/payslip', title: 'Payslips', icon: 'cash-multiple', showInNav: true },
        ],
    },
    loadScreens: async () => {
        const { default: PayslipList } = await import('./screens/PayslipListScreen.js');
        return { PayslipList };
    },
};
