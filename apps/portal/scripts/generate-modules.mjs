import { readdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modulesDir = join(__dirname, '../src/modules');
const outputFile = join(modulesDir, 'index.ts');

const slugs = readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(modulesDir, d.name, 'module.ts')))
    .map(d => d.name)
    .sort();

const lines = [
    '// AUTO-GENERATED — do not edit. Run `pnpm generate-modules` to update.',
    '',
    ...slugs.map(slug => `export { ${slug}Module } from './${slug}/module';`),
    '',
];

writeFileSync(outputFile, lines.join('\n'));
console.log(`Generated src/modules/index.ts (${slugs.length} modules: ${slugs.join(', ')})`);
