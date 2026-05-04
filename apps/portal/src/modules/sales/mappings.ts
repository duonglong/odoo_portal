import type { FieldMap } from '@odoo-portal/odoo-client';

// Maps camelCase domain fields → Odoo snake_case field names.
// Change only this file to adapt to a custom Odoo installation.
export const salesFieldMap: FieldMap = {
    id:   'id',
    name: 'name',
    // TODO: add your field mappings
};
