import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapFromOdoo, mapToOdoo, getOdooFields, many2oneId, many2oneName } from '../src/mappers/field-mapper.js';

describe('mapFromOdoo', () => {
    const fieldMap = {
        id: 'id',
        orderNumber: 'name',
        total: 'amount_total',
        customerName: 'partner_id',
        status: 'state',
    };

    it('maps Odoo fields to domain properties', () => {
        const odooRecord = {
            id: 1,
            name: 'SO001',
            amount_total: 1500.00,
            partner_id: [42, 'Acme Corp'],
            state: 'sale',
        };

        const result = mapFromOdoo(odooRecord, fieldMap);

        expect(result).toEqual({
            id: 1,
            orderNumber: 'SO001',
            total: 1500.00,
            customerName: { id: 42, name: 'Acme Corp' },
            status: 'sale',
        });
    });

    it('converts false to null', () => {
        const odooRecord = {
            id: 2,
            name: 'SO002',
            amount_total: 0,
            partner_id: false,
            state: 'draft',
        };

        const result = mapFromOdoo(odooRecord, fieldMap);

        expect(result).toMatchObject({
            customerName: null,
        });
    });

    it('handles missing fields gracefully', () => {
        const odooRecord = { id: 3, name: 'SO003' };
        const result = mapFromOdoo(odooRecord, fieldMap);

        expect(result).toMatchObject({
            id: 3,
            orderNumber: 'SO003',
            total: undefined,
        });
    });
});

describe('mapToOdoo', () => {
    const fieldMap = {
        orderNumber: 'name',
        total: 'amount_total',
        status: 'state',
    };

    it('maps domain properties to Odoo fields', () => {
        const domainData = { orderNumber: 'SO001', total: 1500 };
        const result = mapToOdoo(domainData, fieldMap);

        expect(result).toEqual({ name: 'SO001', amount_total: 1500 });
    });

    it('ignores properties not in the domain data', () => {
        const domainData = { status: 'sale' };
        const result = mapToOdoo(domainData, fieldMap);

        expect(result).toEqual({ state: 'sale' });
        expect(result).not.toHaveProperty('name');
    });
});

describe('getOdooFields', () => {
    it('returns Odoo field names from a field map', () => {
        const fieldMap = { id: 'id', orderNumber: 'name', total: 'amount_total' };
        expect(getOdooFields(fieldMap)).toEqual(['id', 'name', 'amount_total']);
    });
});

describe('many2oneId', () => {
    it('extracts ID from many2one tuple', () => {
        expect(many2oneId([42, 'Acme Corp'])).toBe(42);
    });

    it('returns null for false', () => {
        expect(many2oneId(false)).toBeNull();
    });
});

describe('many2oneName', () => {
    it('extracts name from many2one tuple', () => {
        expect(many2oneName([42, 'Acme Corp'])).toBe('Acme Corp');
    });

    it('returns null for false', () => {
        expect(many2oneName(false)).toBeNull();
    });
});
