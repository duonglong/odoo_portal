const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// Root of the monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all monorepo packages so Metro picks up changes
config.watchFolders = [monorepoRoot];

// Let Metro resolve packages from the monorepo root node_modules
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
];

// Resolve .js → .ts/.tsx so ESM-style imports (from './foo.js') work
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs'];
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Rewrite .js extension to let Metro find the .ts/.tsx source
    if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
        const withoutExt = moduleName.slice(0, -3);
        return context.resolveRequest(context, withoutExt, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
    input: './global.css',
});
