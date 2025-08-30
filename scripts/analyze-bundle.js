#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes the client bundle size and provides optimization recommendations
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const CLIENT_PATH = 'apps/client'
const DIST_PATH = join(CLIENT_PATH, 'dist')

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch (error) {
    console.error(`Error running command: ${command}`)
    console.error(error.message)
    return null
  }
}

function analyzeBundleSize() {
  console.log('📊 Bundle Size Analysis')
  console.log('=======================\n')

  // Check if dist exists
  if (!existsSync(DIST_PATH)) {
    console.log('❌ Build directory not found. Run "pnpm build" first.')
    return
  }

  // Get total bundle size
  const totalSize = runCommand(`du -sh ${DIST_PATH}`)
  console.log(`📦 Total Bundle Size: ${totalSize}`)

  // Analyze individual files
  const jsFiles = runCommand(`find ${DIST_PATH} -name "*.js" -type f`)
  const cssFiles = runCommand(`find ${DIST_PATH} -name "*.css" -type f`)

  if (jsFiles) {
    console.log('\n🔍 JavaScript Files:')
    jsFiles.split('\n').forEach(file => {
      const size = runCommand(`stat -f%z "${file}" 2>/dev/null || stat -c%s "${file}"`)
      if (size) {
        const fileName = file.replace(DIST_PATH + '/', '')
        console.log(`  ${fileName}: ${formatBytes(parseInt(size))}`)
      }
    })
  }

  if (cssFiles) {
    console.log('\n🎨 CSS Files:')
    cssFiles.split('\n').forEach(file => {
      const size = runCommand(`stat -f%z "${file}" 2>/dev/null || stat -c%s "${file}"`)
      if (size) {
        const fileName = file.replace(DIST_PATH + '/', '')
        console.log(`  ${fileName}: ${formatBytes(parseInt(size))}`)
      }
    })
  }

  // Package analysis
  console.log('\n📋 Bundle Analysis Recommendations:')
  console.log('=====================================')

  const recommendations = [
    '🔧 Code splitting: Implement route-based code splitting',
    '📦 Tree shaking: Ensure unused code is eliminated',
    '🗜️  Compression: Enable gzip/brotli compression',
    '📱 Lazy loading: Implement lazy loading for charts and heavy components',
    '🔄 Dynamic imports: Use dynamic imports for vendor libraries',
    '🎯 Bundle analysis: Use bundle analyzers for detailed inspection',
  ]

  recommendations.forEach(rec => console.log(`  ${rec}`))

  console.log('\n💡 Next Steps:')
  console.log('===============')
  console.log('1. Run: pnpm --filter @trading-viewer/client build --report')
  console.log('2. Analyze with: npx vite-bundle-analyzer')
  console.log('3. Consider implementing code splitting strategies')
}

function auditDependencies() {
  console.log('\n🔍 Dependency Audit')
  console.log('===================\n')

  // Check for duplicate dependencies
  const duplicates = runCommand('pnpm ls --depth=0 --json')
  if (duplicates) {
    try {
      const data = JSON.parse(duplicates)
      console.log('📊 Workspace Dependencies Overview:')
      if (data && data.length > 0) {
        data.forEach(pkg => {
          if (pkg.dependencies) {
            const depCount = Object.keys(pkg.dependencies).length
            console.log(`  ${pkg.name}: ${depCount} dependencies`)
          }
        })
      }
    } catch (e) {
      console.log('Could not parse dependency data')
    }
  }

  // Security audit
  console.log('\n🔒 Security Audit:')
  const auditResult = runCommand('pnpm audit --json')
  if (auditResult) {
    try {
      const audit = JSON.parse(auditResult)
      if (audit.metadata) {
        console.log(`  Vulnerabilities: ${audit.metadata.vulnerabilities.total}`)
        console.log(`  - High: ${audit.metadata.vulnerabilities.high}`)
        console.log(`  - Moderate: ${audit.metadata.vulnerabilities.moderate}`)
        console.log(`  - Low: ${audit.metadata.vulnerabilities.low}`)
      }
    } catch (e) {
      console.log('  No vulnerabilities found or audit data unavailable')
    }
  }
}

function main() {
  console.log('🚀 TradingViewer Bundle & Dependency Analysis\n')

  analyzeBundleSize()
  auditDependencies()

  console.log('\n✅ Analysis Complete!')
  console.log('\nFor detailed bundle analysis, consider:')
  console.log('- webpack-bundle-analyzer')
  console.log('- vite-bundle-analyzer')
  console.log('- source-map-explorer')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
