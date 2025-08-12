module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/search'],
      startServerCommand: 'pnpm --filter @trading-viewer/client dev',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': ['warn', { minScore: 0.5 }],

        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],

        // Bundle size checks
        'unused-javascript': ['warn', { maxNumericValue: 20000 }],
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],

        // Network performance
        'server-response-time': ['warn', { maxNumericValue: 600 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],

        // Accessibility requirements
        'color-contrast': 'error',
        'heading-order': 'error',
        'aria-allowed-attr': 'error',
        'button-name': 'error',
        'image-alt': 'error',

        // SEO requirements
        'meta-description': 'warn',
        'document-title': 'error',
        'html-has-lang': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
