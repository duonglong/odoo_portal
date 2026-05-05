import { describe, it, expect } from 'vitest';
import { mapFromOdoo, getOdooFields } from '../src/mappers/field-mapper.js';

describe('getOdooFields', () => {
    it('returns Odoo field names from a field map', () => {
        const fieldMap = { id: 'id', orderNumber: 'name', total: 'amount_total' };
        expect(getOdooFields(fieldMap)).toEqual(['id', 'name', 'amount_total']);
    });
});

describe('mapFromOdoo', () => {
    it('renames fields using the field map', () => {
        expect(mapFromOdoo({ check_in: '2026-01-15 08:00:00' }, { checkIn: 'check_in' }))
            .toEqual({ checkIn: '2026-01-15 08:00:00' });
    });

    it('normalizes many2one tuple to { id, name }', () => {
        expect(mapFromOdoo({ employee_id: [42, 'Alice'] }, { employeeId: 'employee_id' }))
            .toEqual({ employeeId: { id: 42, name: 'Alice' } });
    });

    it('converts false to null', () => {
        expect(mapFromOdoo({ check_out: false }, { checkOut: 'check_out' }))
            .toEqual({ checkOut: null });
    });

    it('excludes Odoo fields not present in the field map', () => {
        expect(mapFromOdoo({ id: 1, unknown_field: 'x' }, { id: 'id' }))
            .toEqual({ id: 1 });
    });

    it('returns mapped key with undefined when field is absent from record', () => {
        expect(mapFromOdoo({}, { id: 'id' })).toEqual({ id: undefined });
    });

    it('handles nested many2one with id and name', () => {
        expect(mapFromOdoo({ department_id: [1, 'Dept A'] }, { departmentId: 'department_id' }))
            .toEqual({ departmentId: { id: 1, name: 'Dept A' } });
    });
});
