#!/usr/bin/env node
/**
 * scaffold-module.mjs
 *
 * Usage:  node scripts/scaffold-module.mjs <module-name> [DisplayName]
 * Example: node scripts/scaffold-module.mjs sales "Sales Orders"
 *
 * Creates apps/portal/src/modules/<module-name>/ with the full boilerplate structure.
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// ── Args ──────────────────────────────────────────────────────────────────────
const [, , rawName, rawDisplay] = process.argv;

if (!rawName) {
    console.error('Usage: node scripts/scaffold-module.mjs <module-name> [Display Name]');
    process.exit(1);
}

const slug = rawName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const display = rawDisplay ?? slug.replace(/(^|-)\w/g, s => s.replace('-', '').toUpperCase());
const camel = slug.replace(/-(\w)/g, (_, c) => c.toUpperCase());       // salesOrders
const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);           // SalesOrders

const root = resolve(process.cwd(), 'apps/portal/src/modules', slug);

if (existsSync(root)) {
    console.error(`❌  apps/portal/src/modules/${slug} already exists.`);
    process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const dir = (...parts) => mkdirSync(join(root, ...parts), { recursive: true });
const file = (path, content) => writeFileSync(join(root, path), content, 'utf8');

// ── Directory tree ────────────────────────────────────────────────────────────
dir('screens');
dir('widgets');

// ── src/types.ts ──────────────────────────────────────────────────────────────
file('types.ts', `// Domain types — clean camelCase, no Odoo field names here

export interface ${pascal}Record {
    id: number;
    name: string;
    // TODO: add your domain fields
}
`);

// ── src/mappings.ts ───────────────────────────────────────────────────────────
file('mappings.ts', `import type { FieldMap } from '@odoo-portal/odoo-client';

// Maps camelCase domain fields → Odoo snake_case field names.
// Change only this file to adapt to a custom Odoo installation.
export const ${camel}FieldMap: FieldMap = {
    id:   'id',
    name: 'name',
    // TODO: add your field mappings
};
`);

// ── src/repository.ts ─────────────────────────────────────────────────────────
file('repository.ts', `import type { OdooClient } from '@odoo-portal/odoo-client';
import { mapFromOdoo, getOdooFields } from '@odoo-portal/odoo-client';
import { ${camel}FieldMap } from './mappings.js';
import type { ${pascal}Record } from './types.js';

// TODO: replace with the actual Odoo model name
const MODEL = '${slug.replace(/-/g, '.')}.record';

export class ${pascal}Repository {
    constructor(private client: OdooClient) {}

    async list(limit = 40): Promise<${pascal}Record[]> {
        const raw = await this.client.searchRead(
            MODEL,
            [],
            getOdooFields(${camel}FieldMap),
            { limit, order: 'id desc' },
        );
        return raw.map(r => mapFromOdoo<${pascal}Record>(r, ${camel}FieldMap));
    }
}
`);

// ── src/hooks.ts ──────────────────────────────────────────────────────────────
file('hooks.ts', `import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@odoo-portal/core';
import { ${pascal}Repository } from './repository.js';

export function use${pascal}Records() {
    const { client } = useAuth();
    return useQuery({
        queryKey: ['${slug}', 'list'],
        queryFn: () => new ${pascal}Repository(client!).list(),
        enabled: !!client,
    });
}
`);

// ── src/screens/MainScreen.tsx ────────────────────────────────────────────────
file('screens/MainScreen.tsx', `import React from 'react';
import { View, Text, ActivityIndicator, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { use${pascal}Records } from '../hooks.js';

export default function ${pascal}MainScreen() {
    const { data: records, isLoading } = use${pascal}Records();

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            <Stack.Screen options={{ title: '${display}' }} />
            <FlatList
                data={records ?? []}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View className="bg-white mx-4 my-2 p-4 rounded-xl border border-slate-200">
                        <Text className="font-semibold text-slate-900">{item.name}</Text>
                    </View>
                )}
                contentContainerStyle={{ paddingVertical: 16 }}
            />
        </View>
    );
}
`);

// ── src/widgets/${pascal}ModuleCard.tsx ───────────────────────────────────────
file(`widgets/${pascal}ModuleCard.tsx`, `import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import type { PortalModule } from '@odoo-portal/core';

interface Props { module: PortalModule }

export default function ${pascal}ModuleCard({ module }: Props) {
    return (
        <TouchableOpacity
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm active:opacity-80"
            onPress={() => router.push('/${slug}')}
        >
            <Text className="text-3xl mb-3">{module.icon}</Text>
            <Text className="text-base font-bold text-slate-900">{module.name}</Text>
            <Text className="text-xs text-slate-400 mt-1">Open module →</Text>
        </TouchableOpacity>
    );
}
`);

// ── src/module.ts ─────────────────────────────────────────────────────────────
file('module.ts', `import type { ModuleRegistration } from '@odoo-portal/core';

export const ${camel}Module: ModuleRegistration = {
    module: {
        id: '${slug}',
        name: '${display}',
        icon: '📦',                             // TODO: pick an emoji or icon
        requiredModels: [],                      // TODO: e.g. ['${slug.replace(/-/g, '.')}.record']
        requiredGroups: [],                      // TODO: e.g. ['base.group_user']
        routes: [
            { path: '/${slug}', title: '${display}', showInNav: true },
        ],
    },
    widgets: {
        ModuleCard: () => import('./widgets/${pascal}ModuleCard.js').then(m => m.default),
    },
    loadScreens: async () => {
        const { default: Main } = await import('./screens/MainScreen.js');
        return { Main };
    },
};
`);

// ── Done ──────────────────────────────────────────────────────────────────────
console.log(`
✅  Module scaffolded: apps/portal/src/modules/${slug}/

Next steps:
  1. Edit types.ts      — define your domain types
  2. Edit mappings.ts   — map to real Odoo field names
  3. Edit repository.ts — set MODEL and add queries
  4. Run \`pnpm generate-modules\` to add it to the barrel
  5. Register in apps/portal/app/_layout.tsx:
       import { ${camel}Module } from '../src/modules';
       ModuleRegistry.register(${camel}Module);
  6. Add Expo route file:
       apps/portal/app/(app)/${slug}.tsx
       → export { ${pascal}MainScreen as default } from '../../src/modules/${slug}/screens/MainScreen';
`);
