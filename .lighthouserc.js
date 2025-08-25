module.exports = {
  ci: {
    collect: {
      // 追加のテスト対象 URL
      url: [
        'http://localhost:3000',
        'http://localhost:3000/search',
        'http://localhost:3000/market',
        'http://localhost:3000/charts',
        'http://localhost:3000/watchlist',
      ],
      startServerCommand: 'pnpm --filter @trading-viewer/client dev',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      // Chrome 設定追加
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-dev-shm-usage',
        // モバイル測定も含める
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.75 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': ['warn', { minScore: 0.5 }],

        // Core Web Vitals - より厳しい基準
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        interactive: ['warn', { maxNumericValue: 3800 }],

        // Bundle size とリソース最適化
        'unused-javascript': ['warn', { maxNumericValue: 15000 }],
        'render-blocking-resources': ['warn', { maxNumericValue: 500 }],
        'unminified-javascript': ['error', { maxNumericValue: 0 }],
        'unminified-css': ['error', { maxNumericValue: 0 }],
        'unused-css-rules': ['warn', { maxNumericValue: 20000 }],

        // 画像最適化
        'modern-image-formats': ['warn', { maxNumericValue: 85 }],
        'offscreen-images': ['warn', { maxNumericValue: 85 }],
        'properly-size-images': ['warn', { maxNumericValue: 85 }],
        'efficient-animated-content': ['warn', { maxNumericValue: 85 }],

        // キャッシュとネットワーク
        'uses-long-cache-ttl': ['warn', { maxNumericValue: 85 }],
        'server-response-time': ['warn', { maxNumericValue: 600 }],
        'uses-text-compression': ['warn', { maxNumericValue: 85 }],

        // アクセシビリティ - 追加項目
        'color-contrast': 'error',
        'heading-order': 'error',
        'aria-allowed-attr': 'error',
        'button-name': 'error',
        'image-alt': 'error',
        label: 'error',
        'valid-lang': 'error',
        'landmark-one-main': 'warn',
        'page-has-heading-one': 'warn',

        // SEO - 追加項目
        'meta-description': 'warn',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        'robots-txt': 'warn',

        // チャート関連の特別な監視項目
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        'legacy-javascript': ['warn', { maxNumericValue: 5000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
    },
  },
}
