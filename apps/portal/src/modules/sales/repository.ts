import type { OdooClient } from '@odoo-portal/odoo-client';
import { mapFromOdoo, getOdooFields } from '@odoo-portal/odoo-client';
import { salesFieldMap } from './mappings.js';
import type { SalesRecord } from './types.js';

// TODO: replace with the actual Odoo model name
const MODEL = 'sales.record';

export class SalesRepository {
    constructor(private client: OdooClient) {}

    async list(limit = 40): Promise<SalesRecord[]> {
        const raw = await this.client.searchRead(
            MODEL,
            [],
            getOdooFields(salesFieldMap),
            { limit, order: 'id desc' },
        );
        return raw.map(r => mapFromOdoo<SalesRecord>(r, salesFieldMap));
    }
}
