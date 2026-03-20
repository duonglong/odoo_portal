import { mapFromOdoo, getOdooFields } from '@odoo-portal/odoo-client';
import type { OdooClient } from '@odoo-portal/odoo-client';
import { payslipFieldMap, payslipLineFieldMap, companyFieldMap } from './mappings.js';
import type { Payslip, PayslipLine, Company } from './types.js';

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

    async getPayslipLinesBySlipId(slipId: number): Promise<PayslipLine[]> {
        if (!slipId) return [];
        const raw = await this.client.searchRead(
            'hr.payslip.line',
            [['slip_id', '=', slipId]],
            getOdooFields(payslipLineFieldMap),
            { order: 'sequence asc, id asc' }
        );
        return raw.map((r) => mapFromOdoo<PayslipLine>(r, payslipLineFieldMap));
    }

    async getBatchPayslipLines(slipIds: number[]): Promise<PayslipLine[]> {
        if (!slipIds || slipIds.length === 0) return [];
        const raw = await this.client.searchRead(
            'hr.payslip.line',
            [['slip_id', 'in', slipIds]],
            getOdooFields(payslipLineFieldMap),
            { order: 'sequence asc, id asc' }
        );
        return raw.map((r) => mapFromOdoo<PayslipLine>(r, payslipLineFieldMap));
    }

    async getCompanyDetails(companyId: number): Promise<Company> {
        const raw = await this.client.searchRead(
            'res.company',
            [['id', '=', companyId]],
            getOdooFields(companyFieldMap),
            { limit: 1 },
        );
        const companyRecord = raw[0];
        if (!companyRecord) {
            throw new Error(`Company with ID ${companyId} not found`);
        }
        return mapFromOdoo<Company>(companyRecord, companyFieldMap);
    }
}
