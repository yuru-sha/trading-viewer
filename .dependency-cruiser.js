/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // Prevent apps from depending on each other
    {
      name: 'no-app-to-app-dependencies',
      comment: 'Apps should not depend on each other directly',
      severity: 'error',
      from: { path: '^apps/[^/]+/' },
      to: { path: '^apps/(?!\\1)[^/]+/' },
    },

    // Client app dependency rules
    {
      name: 'client-package-dependencies',
      comment: 'Client app should only depend on packages/shared and packages/ui',
      severity: 'error',
      from: { path: '^apps/client/' },
      to: {
        path: '^packages/',
        pathNot: '^packages/(shared|ui)/',
      },
    },

    // Server app dependency rules
    {
      name: 'server-package-dependencies',
      comment: 'Server app should only depend on packages/shared',
      severity: 'error',
      from: { path: '^apps/server/' },
      to: {
        path: '^packages/',
        pathNot: '^packages/shared/',
      },
    },

    // UI package dependency rules
    {
      name: 'ui-package-dependencies',
      comment: 'UI package should only depend on packages/shared and React ecosystem',
      severity: 'error',
      from: { path: '^packages/ui/' },
      to: {
        path: '^packages/',
        pathNot: '^packages/shared/',
      },
    },

    // Prevent circular dependencies
    {
      name: 'no-circular',
      comment: 'Circular dependencies are not allowed',
      severity: 'error',
      from: {},
      to: { circular: true },
    },

    // Prevent orphans (files that are not used anywhere)
    {
      name: 'no-orphans',
      comment: 'Orphaned files should be eliminated',
      severity: 'warn',
      from: { orphan: true },
      to: {},
    },

    // Architecture layer violations
    {
      name: 'no-infrastructure-to-domain',
      comment: 'Infrastructure layer should not depend on domain layer in server',
      severity: 'error',
      from: { path: '^apps/server/src/infrastructure/' },
      to: { path: '^apps/server/src/domain/' },
    },

    // Prevent direct database access from components
    {
      name: 'no-component-to-db',
      comment: 'UI components should not access database directly',
      severity: 'error',
      from: { path: '^apps/client/src/components/' },
      to: { path: 'prisma|@prisma' },
    },

    // Limit dependency complexity
    {
      name: 'dependency-depth-limit',
      comment: 'Files should not have too many dependencies (max 15)',
      severity: 'warn',
      from: {},
      to: {},
      rule: { maxDepth: 15 },
    },
  ],

  allowed: [
    // Allow standard Node.js and npm modules
    {
      from: {},
      to: { dependencyTypes: ['npm', 'core', 'builtin'] },
    },

    // Allow test files to import from anywhere in their own app
    {
      from: { path: '\\.(test|spec)\\.(js|ts|tsx)$' },
      to: {},
    },

    // Allow type-only imports
    {
      from: {},
      to: { dependencyTypes: ['type-only'] },
    },
  ],

  options: {
    // Enhanced module resolution
    doNotFollow: {
      path: 'node_modules|dist|build|\\.git',
    },

    // Include TypeScript and JavaScript files
    includeOnly: '\\.(js|jsx|ts|tsx)$',

    // Exclude test files from main dependency analysis
    exclude: {
      path: '\\.(test|spec)\\.(js|ts|tsx)$|__tests__|__mocks__',
    },

    // Module resolution settings
    moduleSystems: ['amd', 'cjs', 'es6', 'tsd'],

    // Prefix for metrics
    prefix: '',

    // Performance settings
    preserveSymlinks: false,
    
    // Report options
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
        theme: {
          graph: {
            bgcolor: 'transparent',
            splines: 'ortho',
          },
          modules: [
            {
              criteria: { source: '^apps/client' },
              attributes: { fillcolor: '#90EE90' },
            },
            {
              criteria: { source: '^apps/server' },
              attributes: { fillcolor: '#FFB6C1' },
            },
            {
              criteria: { source: '^packages/shared' },
              attributes: { fillcolor: '#87CEEB' },
            },
            {
              criteria: { source: '^packages/ui' },
              attributes: { fillcolor: '#DDA0DD' },
            },
          ],
          dependencies: [
            {
              criteria: { resolved: '\\.(js|jsx|ts|tsx)$' },
              attributes: { color: 'blue' },
            },
            {
              criteria: { violation: true },
              attributes: { color: 'red', penwidth: 2 },
            },
          ],
        },
      },
    },
  },

  // Metrics and thresholds
  metrics: {
    instability: {
      from: {},
      to: {},
      threshold: 0.3,
    },
  },
}