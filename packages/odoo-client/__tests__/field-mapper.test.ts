import { describe, it, expect } from 'vitest';
import { mapFromOdoo, getOdooFields } from '../src/mappers/field-mapper.js';

describe('getOdooFields', () => {
    it('returns Odoo field names from a field map', () => {
        const fieldMap = { id: 'id', orderNumber: 'name', total: 'amount_total' };
        expect(getOdooFields(fieldMap)).toEqual(['id', 'name', 'amount_total']);
    });
});
