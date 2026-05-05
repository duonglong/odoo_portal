/**
 * Model mapping configuration for translating between
 * Odoo field names and clean domain types.
 *
 * This is the core of the adaptability strategy — when Odoo has
 * custom fields, you add them to the mapping config, not the UI.
 */

/** Maps domain property names to Odoo field names */
export type FieldMap = Record<string, string>;

/**
 * Odoo many2one field value.
 * Odoo returns many2one as [id, display_name] or false.
 */
export type OdooMany2One = [number, string] | false;

/** Raw Odoo record — unknown field types */
export type OdooRecord = Record<string, unknown>;
