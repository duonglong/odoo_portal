import { mapFromOdoo, getOdooFields } from '@odoo-portal/odoo-client';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { payslipFieldMap } from './mappings.js';
import type { Payslip } from './types.js';

export class PayslipRepository {
    constructor(private client: OdooClient) { }

    async getPayslips(userId?: number, limit = 50): Promise<Payslip[]> {
        const domain: any[] = [];
        if (userId) {
            domain.push(['employee_id.user_id', '=', userId]);
        }

        const raw = await this.client.searchRead(
            'hr.payslip',
            domain,
            getOdooFields(payslipFieldMap),
            { limit, order: 'date_to desc' },
        );
        return raw.map((r) => mapFromOdoo<Payslip>(r, payslipFieldMap));
    }
}
