/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/domain': path.resolve(__dirname, './src/domain'),
      '@/application': path.resolve(__dirname, './src/application'),
      '@/infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@/presentation': path.resolve(__dirname, './src/presentation'),
      '@/components': path.resolve(__dirname, './src/presentation/components'),
      '@/hooks': path.resolve(__dirname, './src/presentation/hooks'),
      '@/pages': path.resolve(__dirname, './src/presentation/pages'),
      '@/context': path.resolve(__dirname, './src/presentation/context'),
      '@/controllers': path.resolve(__dirname, './src/controllers'),
      '@/services': path.resolve(__dirname, './src/infrastructure/services'),
      '@/utils': path.resolve(__dirname, './src/infrastructure/utils'),
      '@/lib': path.resolve(__dirname, './src/infrastructure/adapters'),
      '@/data': path.resolve(__dirname, './src/infrastructure/data'),
      '@/commands': path.resolve(__dirname, './src/application/commands'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'e2e',
      'test-results',
      'playwright-report',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        'src/vite-env.d.ts',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/__tests__/**',
        '**/types/**',
      ],
      thresholds: {
        global: {
          branches: 20,
          functions: 25,
          lines: 25,
          statements: 25,
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: id => {
          // Core React libraries (critical for app bootstrap)
          if (id.includes('react/') || id.includes('react-dom/') || id.includes('scheduler/')) {
            return 'react-core'
          }
          if (id.includes('react-router')) {
            return 'react-router'
          }

          // ECharts 関連の詳細な分割 - サイズベースで最適化
          if (id.includes('echarts/core') || id.includes('echarts-gl')) {
            return 'charts-core'
          }
          if (id.includes('echarts/charts')) {
            return 'charts-types' // candlestick, line, bar charts
          }
          if (id.includes('echarts/components')) {
            return 'charts-components' // tooltip, legend, axis components
          }
          if (id.includes('echarts/renderers') || id.includes('echarts/features')) {
            return 'charts-features'
          }
          if (id.includes('echarts') && !id.includes('node_modules/@trading-viewer')) {
            return 'charts' // Main echarts bundle
          }

          // TanStack Query
          if (id.includes('@tanstack/react-query')) {
            return 'query'
          }

          // トレーディングビューワー固有のパッケージ
          if (id.includes('@trading-viewer/ui')) {
            return 'ui'
          }
          if (id.includes('@trading-viewer/shared')) {
            return 'shared'
          }

          // 大きな外部ライブラリを個別チャンクに分割
          if (id.includes('lucide-react')) {
            return 'icons'
          }
          if (id.includes('date-fns')) {
            return 'date-utils'
          }

          // Development 用ライブラリを分離（プロダクションでは除外）
          if (
            id.includes('@testing-library') ||
            id.includes('vitest') ||
            id.includes('playwright')
          ) {
            return 'dev-tools'
          }

          // Chart 関連コンポーネント - リファクタリング後の構造に対応
          if (
            id.includes('/src/components/chart/') ||
            id.includes('/src/hooks/chart-types/') ||
            id.includes('/src/hooks/indicators/') ||
            id.includes('/src/hooks/layout/') ||
            id.includes('/src/utils/calculations/')
          ) {
            return 'chart-components'
          }

          // Drawing 関連
          if (id.includes('/src/hooks/drawing/') || id.includes('drawing')) {
            return 'drawing-tools'
          }

          // 管理者機能 - 遅延読み込み用に専用チャンク
          if (
            id.includes('/src/components/admin/') ||
            id.includes('/src/pages/Admin') ||
            id.includes('AdminUsersPage')
          ) {
            return 'admin'
          }

          // ページ別チャンク分割（遅延読み込み最適化）
          if (id.includes('/src/pages/ChartsPage') || id.includes('ChartsPage')) {
            return 'page-charts'
          }
          if (id.includes('/src/pages/MarketPage') || id.includes('MarketPage')) {
            return 'page-market'
          }
          if (id.includes('/src/pages/AlertsPage') || id.includes('AlertsPage')) {
            return 'page-alerts'
          }

          // その他の大きなライブラリ
          if (id.includes('node_modules/') && !id.includes('@trading-viewer/')) {
            const chunks = id.split('/')
            const packageName = chunks[chunks.findIndex(part => part === 'node_modules') + 1]
            if (['react', 'react-dom', 'echarts'].some(name => packageName.startsWith(name))) {
              return // 既に処理済み
            }
            // 大きなパッケージを個別チャンクに
            return `vendor-${packageName.replace('@', '').replace('/', '-')}`
          }
        },
        // チャンクサイズを最適化
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // チャンク分割の最適化設定
    chunkSizeWarningLimit: 800,
    // より細かい分割設定
    minify: 'esbuild', // terser の代わりに esbuild を使用（より高速）
    target: 'es2020',
    sourcemap: false, // プロダクション用ビルドでソースマップを無効化

    // Tree-shaking の最適化
    treeshake: {
      preset: 'smallest',
      moduleSideEffects: false,
    },

    // 圧縮最適化設定
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // 4KB 未満のアセットはインライン化
  },
})
