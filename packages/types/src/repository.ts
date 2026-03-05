import type { OdooDomain, SearchOptions } from './domain.js';

/**
 * Generic repository interface — abstracts CRUD operations.
 *
 * Feature modules program against this interface, not the Odoo client directly.
 * This enables testing with mocks and future protocol changes.
 */
export interface Repository<T> {
    /** Find a single record by ID, returns null if not found */
    find(id: number): Promise<T | null>;

    /** Search records matching domain with optional pagination/sorting */
    search(domain: OdooDomain, options?: SearchOptions): Promise<T[]>;

    /** Count records matching domain */
    searchCount(domain: OdooDomain): Promise<number>;

    /** Create a new record, returns the new record ID */
    create(data: Partial<T>): Promise<number>;

    /** Update an existing record */
    update(id: number, data: Partial<T>): Promise<boolean>;

    /** Delete a record */
    delete(id: number): Promise<boolean>;
}

/**
 * Paginated result wrapper for list screens.
 */
export interface PaginatedResult<T> {
    records: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
