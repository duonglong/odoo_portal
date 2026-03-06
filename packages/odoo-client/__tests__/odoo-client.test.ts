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
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers(),
                json: () => Promise.resolve({
                    token: 'jwt-token',
                    session: {
                        uid: 2,
                        username: 'user@test.com',
                        name: 'Test User',
                        partnerId: 10,
                        companyId: 1,
                        userContext: { lang: 'en_US', tz: 'UTC' },
                        serverVersion: '19.0',
                    }
                })
            });

            const session = await client.authenticate({
                login: 'user@test.com',
                password: 'api-key-123',
            });

            expect(mockFetch).toHaveBeenLastCalledWith(
                'https://test.odoo.com/auth/login',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"login":"user@test.com"'),
                }),
            );

            expect(session.uid).toBe(2);
            expect(session.username).toBe('user@test.com');
            expect(session.serverVersion).toBe('19.0');
            expect(session.isAuthenticated).toBe(true);
            expect(session.proxyJwt).toBe('jwt-token');
            expect(client.isAuthenticated()).toBe(true);
        });

        it('throws Error on invalid credentials', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: new Headers(),
                json: () => Promise.resolve({ error: 'Wrong login/password' })
            });

            await expect(
                client.authenticate({ login: 'bad', password: 'wrong' }),
            ).rejects.toThrow('Wrong login/password');
        });
    });

    describe('CRUD operations', () => {
        beforeEach(async () => {
            // Authenticate first
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers(),
                json: () => Promise.resolve({
                    token: 'jwt-token',
                    session: {
                        uid: 2,
                        username: 'user@test.com',
                        name: 'Test User',
                        partnerId: 10,
                        companyId: 1,
                        userContext: { lang: 'en_US' },
                        serverVersion: '19.0',
                    }
                })
            });
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
                'https://test.odoo.com/proxy/jsonrpc',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"method":"search_read"'),
                }),
            );
        });

    });

    describe('unauthenticated access', () => {
        it('throws SessionExpiredError when not authenticated', async () => {
            await expect(
                client.searchRead('sale.order', [], ['name']),
            ).rejects.toThrow(SessionExpiredError);
        });
    });
});
