import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test('should match homepage screenshot', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for any animations to complete
    await page.waitForTimeout(1000)

    // Take screenshot for visual comparison
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
      threshold: 0.3, // 30% difference threshold
    })
  })

  test('should match search page layout', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('search-page.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('should handle responsive design', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('desktop-view.png', {
      animations: 'disabled',
    })

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('tablet-view.png', {
      animations: 'disabled',
    })

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    await expect(page).toHaveScreenshot('mobile-view.png', {
      animations: 'disabled',
    })
  })

  test('should capture chart component visuals', async ({ page }) => {
    // Navigate to a page with charts (if available)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for chart containers
    const chartSelectors = ['[data-testid="chart"]', '.chart-container', '.trading-chart', 'canvas']

    for (const selector of chartSelectors) {
      const element = page.locator(selector).first()
      if ((await element.count()) > 0 && (await element.isVisible())) {
        await expect(element).toHaveScreenshot(
          `chart-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
          {
            animations: 'disabled',
          }
        )
        break
      }
    }
  })

  test('should handle dark and light themes', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Test light theme (default)
    await expect(page).toHaveScreenshot('light-theme.png', {
      animations: 'disabled',
    })

    // Try to toggle to dark theme
    const themeToggle = page
      .locator('[data-testid="theme-toggle"], .theme-toggle, button[aria-label*="theme"]')
      .first()

    if ((await themeToggle.count()) > 0) {
      await themeToggle.click()
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot('dark-theme.png', {
        animations: 'disabled',
      })
    }
  })
})
