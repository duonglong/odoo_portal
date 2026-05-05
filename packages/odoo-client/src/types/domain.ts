/**
 * Odoo domain filter types.
 *
 * Domains are arrays of conditions used to filter records:
 *   [['state', '=', 'sale'], ['amount_total', '>', 100]]
 *
 * Logical operators prefix conditions:
 *   ['|', ['state', '=', 'draft'], ['state', '=', 'sent']]
 */

export type OdooOperator =
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'like'
    | 'not like'
    | 'ilike'
    | 'not ilike'
    | '=like'
    | '=ilike'
    | 'in'
    | 'not in'
    | 'child_of'
    | 'parent_of';

/** A single domain condition: [field, operator, value] */
export type OdooDomainLeaf = [string, OdooOperator, unknown];

/** Logical operators that combine domain leaves */
export type OdooDomainLogic = '&' | '|' | '!';

/** Complete domain expression — mix of leaves and logic operators */
export type OdooDomain = Array<OdooDomainLeaf | OdooDomainLogic>;

/** Options for search/searchRead operations */
export interface SearchOptions {
    /** Fields to return. Empty = all fields (expensive). */
    fields?: string[];
    /** Maximum number of records to return */
    limit?: number;
    /** Number of records to skip (for pagination) */
    offset?: number;
    /** Sort order, e.g. 'create_date desc, name asc' */
    order?: string;
}

/** Pagination metadata for list responses */
export interface PaginationInfo {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
