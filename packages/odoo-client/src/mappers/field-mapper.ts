import type { OdooMany2One, FieldMap, OdooRecord } from '@odoo-portal/types';

/**
 * Utility to map between Odoo field names and clean domain property names.
 *
 * Example:
 *   mapFromOdoo({ name: 'SO001', amount_total: 500 }, { orderNumber: 'name', total: 'amount_total' })
 *   → { orderNumber: 'SO001', total: 500 }
 */

/**
 * Map an Odoo record to a domain object using a field map.
 * Handles many2one fields by extracting the display name.
 */
export const mapFromOdoo = <T>(
    record: OdooRecord,
    fieldMap: FieldMap,
): T => {
    const result: Record<string, unknown> = {};

    for (const [domainKey, odooField] of Object.entries(fieldMap)) {
        const value = record[odooField];
        result[domainKey] = normalizeOdooValue(value);
    }

    return result as unknown as T;
};

/**
 * Map a domain object to Odoo field values for create/write operations.
 * Reverses the field map direction.
 */
export const mapToOdoo = (
    data: Record<string, unknown>,
    fieldMap: FieldMap,
): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    for (const [domainKey, odooField] of Object.entries(fieldMap)) {
        if (domainKey in data) {
            result[odooField] = data[domainKey];
        }
    }

    return result;
};

/**
 * Get the list of Odoo field names from a field map.
 * Used to construct the `fields` param for searchRead.
 */
export const getOdooFields = (fieldMap: FieldMap): string[] =>
    Object.values(fieldMap);

/**
 * Normalize Odoo field values:
 * - many2one [id, name] → { id, name }
 * - false → null
 * - everything else passes through
 */
const normalizeOdooValue = (value: unknown): unknown => {
    if (value === false) {
        return null;
    }

    // Many2one: [id, display_name]
    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'string') {
        return { id: value[0] as number, name: value[1] as string };
    }

    return value;
};

/**
 * Extract the ID from a many2one value.
 */
export const many2oneId = (value: OdooMany2One): number | null =>
    Array.isArray(value) ? value[0] : null;

/**
 * Extract the display name from a many2one value.
 */
export const many2oneName = (value: OdooMany2One): string | null =>
    Array.isArray(value) ? value[1] : null;
