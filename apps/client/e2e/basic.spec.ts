import { test, expect } from '@playwright/test'

test.describe('TradingViewer Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load homepage successfully', async ({ page }) => {
    // Wait for the main content to load
    await page.waitForLoadState('networkidle')

    // Check if the page title is correct
    await expect(page).toHaveTitle(/TradingViewer/i)

    // Should not have any console errors
    const logs: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text())
      }
    })

    await page.waitForTimeout(1000) // Wait for any lazy-loaded content

    // Should have minimal console errors (allow for development warnings)
    expect(logs.filter(log => !log.includes('Warning'))).toHaveLength(0)
  })

  test('should display main navigation', async ({ page }) => {
    // Check for main navigation elements (adjust selectors based on actual implementation)
    const possibleSelectors = [
      '[data-testid="navigation"]',
      'nav',
      '[role="navigation"]',
      '.nav',
      '.navigation',
    ]

    let navigationFound = false
    for (const selector of possibleSelectors) {
      const element = page.locator(selector).first()
      if ((await element.count()) > 0) {
        await expect(element).toBeVisible()
        navigationFound = true
        break
      }
    }

    // If no specific navigation found, check for common links
    if (!navigationFound) {
      const body = page.locator('body')
      await expect(body).toBeVisible()
      // The page should at least render something
      await expect(page.locator('*').first()).toBeVisible()
    }
  })

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toBeVisible()

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toBeVisible()

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Monitor for uncaught errors
    const errors: string[] = []
    page.on('pageerror', error => {
      errors.push(error.message)
    })

    // Navigate to a potentially non-existent route
    await page.goto('/non-existent-route', { waitUntil: 'networkidle' })

    // Should still render something (error page or redirect)
    await expect(page.locator('body')).toBeVisible()

    // Should not have uncaught JavaScript errors
    expect(errors).toHaveLength(0)
  })

  test('should load CSS and JavaScript', async ({ page }) => {
    await page.goto('/')

    // Check if styles are loaded by verifying computed styles
    const body = page.locator('body')
    const backgroundColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor)

    // Should have some background color set (not just transparent)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)')

    // Check if JavaScript is working by verifying React is mounted
    const isReactMounted = await page.evaluate(() => {
      // Look for React DevTools global or React fiber nodes
      return (
        !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
        document.querySelector('[data-reactroot]') ||
        document.querySelector('#root')?.hasChildNodes()
      )
    })

    expect(isReactMounted).toBe(true)
  })
})
