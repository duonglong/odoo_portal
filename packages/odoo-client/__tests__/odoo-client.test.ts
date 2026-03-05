import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OdooClient } from '../src/odoo-client.js';
import { AuthenticationError, SessionExpiredError } from '../src/errors.js';
import type { InMemorySessionStorage } from '../src/session-storage.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const createSuccessResponse = (result: unknown) => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, result }),
});

const createErrorResponse = (error: { code: number; message: string; data: { name: string; debug: string; message: string; arguments: unknown[]; context: Record<string, unknown> } }) => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: () => Promise.resolve({ jsonrpc: '2.0', id: 1, error }),
});

describe('OdooClient', () => {
    let client: OdooClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new OdooClient({
            url: 'https://test.odoo.com',
            database: 'test_db',
        });
    });

    describe('authenticate', () => {
        it('authenticates successfully and stores session', async () => {
            mockFetch.mockResolvedValueOnce(createSuccessResponse({
                uid: 2,
                session_id: 'abc123',
                username: 'user@test.com',
                name: 'Test User',
                partner_id: 10,
                company_id: 1,
                user_context: { lang: 'en_US', tz: 'UTC' },
                server_version: '19.0',
            }));

            const session = await client.authenticate({
                login: 'user@test.com',
                password: 'api-key-123',
            });

            expect(session.uid).toBe(2);
            expect(session.username).toBe('user@test.com');
            expect(session.serverVersion).toBe('19.0');
            expect(session.isAuthenticated).toBe(true);
            expect(client.isAuthenticated()).toBe(true);
        });

        it('throws AuthenticationError on invalid credentials', async () => {
            mockFetch.mockResolvedValueOnce(createSuccessResponse({
                uid: false,
                session_id: '',
                username: '',
                name: '',
                partner_id: 0,
                company_id: 0,
                user_context: {},
                server_version: '19.0',
            }));

            await expect(
                client.authenticate({ login: 'bad', password: 'wrong' }),
            ).rejects.toThrow(AuthenticationError);
        });
    });

    describe('CRUD operations', () => {
        beforeEach(async () => {
            // Authenticate first
            mockFetch.mockResolvedValueOnce(createSuccessResponse({
                uid: 2,
                session_id: 'abc123',
                username: 'user@test.com',
                name: 'Test User',
                partner_id: 10,
                company_id: 1,
                user_context: { lang: 'en_US' },
                server_version: '19.0',
            }));
            await client.authenticate({ login: 'user@test.com', password: 'pass' });
        });

        it('searchRead calls Odoo with correct parameters', async () => {
            const mockRecords = [
                { id: 1, name: 'SO001', amount_total: 100 },
                { id: 2, name: 'SO002', amount_total: 200 },
            ];
            mockFetch.mockResolvedValueOnce(createSuccessResponse(mockRecords));

            const result = await client.searchRead(
                'sale.order',
                [['state', '=', 'sale']],
                ['name', 'amount_total'],
                { limit: 10, order: 'name asc' },
            );

            expect(result).toEqual(mockRecords);
            expect(mockFetch).toHaveBeenLastCalledWith(
                'https://test.odoo.com/web/dataset/call_kw',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"method":"call"'),
                }),
            );
        });

        it('create returns the new record ID', async () => {
            mockFetch.mockResolvedValueOnce(createSuccessResponse(42));

            const id = await client.create('sale.order', { partner_id: 1 });

            expect(id).toBe(42);
        });

        it('write returns true on success', async () => {
            mockFetch.mockResolvedValueOnce(createSuccessResponse(true));

            const result = await client.write('sale.order', [1], { state: 'done' });

            expect(result).toBe(true);
        });

        it('unlink returns true on success', async () => {
            mockFetch.mockResolvedValueOnce(createSuccessResponse(true));

            const result = await client.unlink('sale.order', [1]);

            expect(result).toBe(true);
        });
    });

    describe('unauthenticated access', () => {
        it('throws SessionExpiredError when not authenticated', async () => {
            await expect(
                client.searchRead('sale.order', [], ['name']),
            ).rejects.toThrow(SessionExpiredError);
        });
    });

    describe('listDatabases', () => {
        it('returns list of databases', async () => {
            mockFetch.mockResolvedValueOnce(
                createSuccessResponse(['db1', 'db2', 'db3']),
            );

            const dbs = await client.listDatabases();

            expect(dbs).toEqual(['db1', 'db2', 'db3']);
        });
    });
});
