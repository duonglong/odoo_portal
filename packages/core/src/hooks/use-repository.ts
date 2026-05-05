import { useMemo } from 'react';
import type { OdooClient } from '@odoo-portal/odoo-client';

export const useRepository = <T>(
    client: OdooClient | null,
    factory: (client: OdooClient) => T,
): T | null =>
    useMemo(() => (client ? factory(client) : null), [client, factory]);
