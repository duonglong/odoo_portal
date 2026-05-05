import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiTransport } from '../src/api-transport.js';
import { NetworkError, SessionExpiredError, AccessDeniedError, RpcError } from '../src/errors.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const PROXY_URL = 'http://localhost:3001';

function makeResponse(body: unknown, status = 200): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        headers: new Headers(),
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as unknown as Response;
}

describe('ApiTransport', () => {
    let transport: ApiTransport;

    beforeEach(() => {
        vi.clearAllMocks();
        transport = new ApiTransport(PROXY_URL);
        transport.setJwt('test-jwt-token');
    });

    describe('call()', () => {
        it('appends the jsonrpc endpoint to the proxy URL path', async () => {
            mockFetch.mockResolvedValueOnce(
                makeResponse({ jsonrpc: '2.0', id: 1, result: { records: [] } }),
            );

            await transport.call('hr.attendance', 'search_read');

            expect(mockFetch).toHaveBeenCalledWith(
                `${PROXY_URL}/proxy/jsonrpc`,
                expect.objectContaining({ method: 'POST' }),
            );
        });

        it('sends flat body to proxy including model and method', async () => {
            mockFetch.mockResolvedValueOnce(
                makeResponse({ jsonrpc: '2.0', id: 1, result: true }),
            );

            const args = [['id', '=', 1]];
            const kwargs = { limit: 1 };

            await transport.call('hr.attendance', 'search_read', args, kwargs);

            const callArgs = mockFetch.mock.calls[0]!;
            const requestBody = JSON.parse((callArgs[1] as RequestInit).body as string);
            expect(requestBody).toEqual({ model: 'hr.attendance', method: 'search_read', args, kwargs });
        });

        it('throws SessionExpiredError when no JWT is set', async () => {
            transport.setJwt(null);
            await expect(transport.call('hr.attendance', 'search_read')).rejects.toThrow(SessionExpiredError);
        });

        it('throws SessionExpiredError on HTTP 401', async () => {
            mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Unauthorized' }, 401));
            await expect(transport.call('hr.attendance', 'search_read')).rejects.toThrow(SessionExpiredError);
        });

        it('throws NetworkError on HTTP 5xx', async () => {
            mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Internal Server Error' }, 502));
            await expect(transport.call('hr.attendance', 'search_read')).rejects.toThrow(NetworkError);
        });

        it('throws NetworkError when fetch rejects (network down)', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
            await expect(transport.call('hr.attendance', 'search_read')).rejects.toThrow(NetworkError);
        });

        it('throws AccessDeniedError on Odoo access_denied RPC error', async () => {
            mockFetch.mockResolvedValueOnce(
                makeResponse({
                    jsonrpc: '2.0',
                    id: 1,
                    error: {
                        code: 200,
                        message: 'Odoo Server Error',
                        data: {
                            name: 'odoo.exceptions.AccessDenied',
                            message: 'Access Denied: no permission',
                            debug: '',
                            arguments: [],
                            context: {},
                        },
                    },
                }),
            );
            await expect(transport.call('hr.attendance', 'search_read')).rejects.toThrow(AccessDeniedError);
        });

        it('throws RpcError on generic Odoo RPC error', async () => {
            mockFetch.mockResolvedValueOnce(
                makeResponse({
                    jsonrpc: '2.0',
                    id: 1,
                    error: {
                        code: 200,
                        message: 'Odoo Server Error',
                        data: {
                            name: 'odoo.exceptions.ValidationError',
                            message: 'Value must be positive',
                            debug: '',
                            arguments: [],
                            context: {},
                        },
                    },
                }),
            );
            await expect(transport.call('hr.attendance', 'search_read')).rejects.toThrow(RpcError);
        });
    });

    describe('URL construction', () => {
        it('strips trailing slash from proxyUrl before appending jsonrpc', async () => {
            const transportWithSlash = new ApiTransport(`${PROXY_URL}/`);
            transportWithSlash.setJwt('token');
            mockFetch.mockResolvedValueOnce(makeResponse({ jsonrpc: '2.0', id: 1, result: [] }));

            await transportWithSlash.call('hr.attendance', 'search_read');

            expect(mockFetch).toHaveBeenCalledWith(
                `${PROXY_URL}/proxy/jsonrpc`,
                expect.anything(),
            );
        });
    });
});
