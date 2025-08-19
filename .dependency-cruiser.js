/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // Prevent apps from depending on each other
    {
      name: 'no-app-to-app',
      severity: 'error',
      from: { path: '^apps/client' },
      to: { path: '^apps/server' },
    },
    {
      name: 'no-server-to-client',
      severity: 'error',
      from: { path: '^apps/server' },
      to: { path: '^apps/client' },
    },

    // Client app should only depend on shared and ui packages
    {
      name: 'client-forbidden-packages',
      severity: 'error',
      from: { path: '^apps/client' },
      to: {
        path: '^packages',
        pathNot: '^packages/(shared|ui)',
      },
    },

    // Server app should only depend on shared package
    {
      name: 'server-forbidden-packages',
      severity: 'error',
      from: { path: '^apps/server' },
      to: {
        path: '^packages',
        pathNot: '^packages/shared',
      },
    },

    // UI package should only depend on shared (allow internal dependencies)
    {
      name: 'ui-forbidden-packages',
      severity: 'error',
      from: { path: '^packages/ui' },
      to: {
        path: '^packages',
        pathNot: '^packages/(shared|ui)',
      },
    },

    // Prevent circular dependencies
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },

    // Prevent orphans
    {
      name: 'no-orphans',
      severity: 'warn',
      from: { orphan: true },
      to: {},
    },
  ],

  options: {
    // What to exclude from the analysis
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-bundled'],
    },

    // Exclude patterns
    exclude: [
      'node_modules',
      '\\.test\\.(js|ts|tsx)$',
      '\\.spec\\.(js|ts|tsx)$',
      '__tests__',
      '__mocks__',
      'dist',
      'build',
      '\\.git',
      // Configuration files that are expected to be orphans
      '\\.config\\.(js|ts)$',
      '\\.eslintrc\\.(js|cjs)$',
      'vitest\\.config\\.ts$',
      'tsup\\.config\\.ts$',
      'playwright\\.config\\.ts$',
      'postcss\\.config\\.js$',
    ],

    // Module systems to use
    moduleSystems: ['amd', 'cjs', 'es6', 'tsd'],

    // TypeScript settings
    tsConfig: {
      fileName: './tsconfig.base.json',
    },

    // How to resolve modules
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types'],
    },

    // Report settings
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
}
