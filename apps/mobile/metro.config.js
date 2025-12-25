// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Limit Metro to only watch the mobile app directory and shared package
// This prevents watching the entire monorepo and reduces file watchers
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const sharedPackage = path.resolve(monorepoRoot, 'packages/shared');

config.watchFolders = [projectRoot, sharedPackage];

// Ignore patterns to reduce file watching
config.resolver = {
  ...config.resolver,
  blockList: [
    // Ignore other apps in the monorepo
    /apps\/web\/.*/,
  ],
};

// Configure Metro to ignore more files
config.resolver.sourceExts = [...config.resolver.sourceExts];

// Reduce the number of files Metro watches by ignoring node_modules in other workspaces
config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: true,
  },
  ignored: [
    // Ignore node_modules in other workspaces
    path.resolve(monorepoRoot, 'apps/web/node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
    // Ignore build outputs
    '**/dist/**',
    '**/.next/**',
    '**/build/**',
  ],
};

module.exports = config;

