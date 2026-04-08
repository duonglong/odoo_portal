#!/usr/bin/env node
/**
 * scaffold-module.mjs
 *
 * Usage:  node scripts/scaffold-module.mjs <module-name> [DisplayName]
 * Example: node scripts/scaffold-module.mjs sales "Sales Orders"
 *
 * Creates modules/<module-name>/ with the full boilerplate structure.
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
const pkg = `@odoo-portal/${slug}`;

const root = resolve(process.cwd(), 'modules', slug);

if (existsSync(root)) {
    console.error(`❌  modules/${slug} already exists.`);
    process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const dir = (...parts) => mkdirSync(join(root, ...parts), { recursive: true });
const file = (path, content) => writeFileSync(join(root, path), content, 'utf8');

// ── Directory tree ────────────────────────────────────────────────────────────
dir('src', 'screens');
dir('src', 'widgets');

// ── package.json ──────────────────────────────────────────────────────────────
file('package.json', JSON.stringify({
    name: pkg,
    version: '0.1.0',
    private: true,
    type: 'module',
    main: './src/index.ts',
    types: './src/index.ts',
    exports: { '.': './src/index.ts' },
    scripts: {
        typecheck: 'tsc --noEmit',
        clean: 'rm -rf dist',
    },
    dependencies: {
        '@expo/vector-icons': '^15.1.1',
        '@odoo-portal/core': 'workspace:*',
        '@odoo-portal/odoo-client': 'workspace:*',
        '@tanstack/react-query': '^5.67.0',
    },
    peerDependencies: {
        'expo-router': '*',
        react: '>=18.0.0',
        'react-native': '>=0.73.0',
    },
    devDependencies: {
        '@types/react': '^19.0.0',
        'expo-router': '~4.0.0',
        nativewind: '^4.1.0',
        react: '^19.0.0',
        'react-native': '0.76.7',
        tailwindcss: '^3.4.0',
        typescript: '^5.7.0',
    },
}, null, 4));

// ── tsconfig.json ─────────────────────────────────────────────────────────────
file('tsconfig.json', `{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "rootDir": "src",
        "outDir": "dist",
        "jsx": "react-jsx"
    },
    "include": [
        "src",
        "nativewind-env.d.ts"
    ]
}
`);

// ── nativewind-env.d.ts ───────────────────────────────────────────────────────
file('nativewind-env.d.ts', `/// <reference types="nativewind/types" />\n`);

// ── src/types.ts ──────────────────────────────────────────────────────────────
file('src/types.ts', `// Domain types — clean camelCase, no Odoo field names here

export interface ${pascal}Record {
    id: number;
    name: string;
    // TODO: add your domain fields
}
`);

// ── src/mappings.ts ───────────────────────────────────────────────────────────
file('src/mappings.ts', `import type { FieldMap } from '@odoo-portal/odoo-client';

// Maps camelCase domain fields → Odoo snake_case field names.
// Change only this file to adapt to a custom Odoo installation.
export const ${camel}FieldMap: FieldMap = {
    id:   'id',
    name: 'name',
    // TODO: add your field mappings
};
`);

// ── src/repository.ts ─────────────────────────────────────────────────────────
file('src/repository.ts', `import type { OdooClient } from '@odoo-portal/odoo-client';
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
file('src/hooks.ts', `import { useQuery } from '@tanstack/react-query';
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
file('src/screens/MainScreen.tsx', `import React from 'react';
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
file(`src/widgets/${pascal}ModuleCard.tsx`, `import React from 'react';
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
file('src/module.ts', `import type { ModuleRegistration } from '@odoo-portal/core';

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

// ── src/index.ts ──────────────────────────────────────────────────────────────
file('src/index.ts', `// Module registration
export { ${camel}Module } from './module.js';

// Domain types
export type { ${pascal}Record } from './types.js';

// Mappings (useful for field-map extensions)
export { ${camel}FieldMap } from './mappings.js';

// Repository (for sub-modules and custom use cases)
export { ${pascal}Repository } from './repository.js';

// Hooks
export { use${pascal}Records } from './hooks.js';

// Screens
export { default as ${pascal}MainScreen } from './screens/MainScreen.js';

// Dashboard Widgets
export { default as ${pascal}ModuleCard } from './widgets/${pascal}ModuleCard.js';
`);

// ── Done ──────────────────────────────────────────────────────────────────────
console.log(`
✅  Module scaffolded: modules/${slug}/

Next steps:
  1. Run \`pnpm install\` to link the workspace package
  2. Edit modules/${slug}/src/types.ts      — define your domain types
  3. Edit modules/${slug}/src/mappings.ts   — map to real Odoo field names
  4. Edit modules/${slug}/src/repository.ts — set MODEL and add queries
  5. Register in apps/portal/app/_layout.tsx:
       import { ${camel}Module } from '${pkg}';
       ModuleRegistry.register(${camel}Module);
  6. Add Expo route file:
       apps/portal/app/(app)/${slug}.tsx
       → export { ${pascal}MainScreen as default } from '${pkg}';
  7. Add to apps/portal/package.json dependencies:
       "${pkg}": "workspace:*"
`);
