/**
 * Model mapping configuration for translating between
 * Odoo field names and clean domain types.
 *
 * This is the core of the adaptability strategy — when Odoo has
 * custom fields, you add them to the mapping config, not the UI.
 */

/** Maps domain property names to Odoo field names */
export type FieldMap = Record<string, string>;

/** Complete model mapping configuration */
export interface ModelMapping {
    /** Odoo model name, e.g. 'sale.order' */
    model: string;
    /** Domain property → Odoo field mapping */
    fields: FieldMap;
    /** Default domain filter for this model (optional) */
    defaultDomain?: import('./domain.js').OdooDomain;
    /** Default sort order (optional) */
    defaultOrder?: string;
}

/** Registry of all model mappings */
export type ModelMappingRegistry = Record<string, ModelMapping>;

/**
 * Odoo many2one field value.
 * Odoo returns many2one as [id, display_name] or false.
 */
export type OdooMany2One = [number, string] | false;

/**
 * Odoo many2many / one2many field value.
 * Odoo returns as array of IDs.
 */
export type OdooX2Many = number[];

/** Raw Odoo record — unknown field types */
export type OdooRecord = Record<string, unknown>;
