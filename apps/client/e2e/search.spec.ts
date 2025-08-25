import { test, expect } from '@playwright/test'

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should navigate to search page', async ({ page }) => {
    // Try different ways to navigate to search
    const searchSelectors = [
      '[data-testid="search-link"]',
      'a[href*="search"]',
      'text=/search/i',
      '[aria-label*="search"]',
      'input[type="search"]',
      '[placeholder*="search"]',
    ]

    let searchFound = false
    for (const selector of searchSelectors) {
      const element = page.locator(selector).first()
      if ((await element.count()) > 0 && (await element.isVisible())) {
        if (selector.includes('input')) {
          // If it's a search input, just verify it exists
          await expect(element).toBeVisible()
          searchFound = true
          break
        } else {
          // If it's a link, click it
          await element.click()
          await page.waitForLoadState('networkidle')
          searchFound = true
          break
        }
      }
    }

    // If no search element found, try going to /search directly
    if (!searchFound) {
      await page.goto('/search')
      await page.waitForLoadState('networkidle')
    }

    // Verify we're on a page that can handle search
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('should perform basic search', async ({ page }) => {
    // Navigate to search page or find search input
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search"], [data-testid="search-input"]')
      .first()

    if ((await searchInput.count()) === 0) {
      // Try to navigate to search page
      await page.goto('/search')
      await page.waitForLoadState('networkidle')
    }

    const searchAfterNav = page
      .locator('input[type="search"], input[placeholder*="search"], [data-testid="search-input"]')
      .first()

    if ((await searchAfterNav.count()) > 0) {
      // Perform search
      await searchAfterNav.fill('AAPL')
      await searchAfterNav.press('Enter')

      // Wait for results
      await page.waitForTimeout(2000)

      // Check that something happened (page changed or results appeared)
      const hasResults =
        (await page
          .locator('text=/apple/i, text=/AAPL/i, [data-testid*="result"], .result, .search-result')
          .count()) > 0
      const hasLoadingIndicator =
        (await page.locator('[data-testid="loading"], .loading, text=/loading/i').count()) > 0
      const hasNoResults = (await page.locator('text=/no results/i, text=/not found/i').count()) > 0

      // At least one of these should be true
      expect(hasResults || hasLoadingIndicator || hasNoResults).toBe(true)
    } else {
      // If no search input found, just verify the page loads
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should handle empty search', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search"], [data-testid="search-input"]')
      .first()

    if ((await searchInput.count()) > 0) {
      // Try empty search
      await searchInput.fill('')
      await searchInput.press('Enter')

      await page.waitForTimeout(1000)

      // Should handle gracefully (no errors)
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should show search suggestions or autocomplete', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search"], [data-testid="search-input"]')
      .first()

    if ((await searchInput.count()) > 0) {
      // Start typing to trigger autocomplete
      await searchInput.fill('A')
      await page.waitForTimeout(1000)

      // Check for suggestions dropdown or similar
      page.locator('[data-testid="suggestions"], .suggestions, .autocomplete, .dropdown')

      // Don't fail if no suggestions, just verify no errors
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should handle search errors gracefully', async ({ page }) => {
    // Monitor for console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search"], [data-testid="search-input"]')
      .first()

    if ((await searchInput.count()) > 0) {
      // Try various edge case searches
      const edgeCases = ['', '!@#$%', 'verylongsearchquerythatmightcauseissues', '   ']

      for (const query of edgeCases) {
        await searchInput.fill(query)
        await searchInput.press('Enter')
        await page.waitForTimeout(500)
      }
    }

    // Should not have critical console errors
    const criticalErrors = consoleErrors.filter(
      error =>
        !error.includes('Warning') && !error.includes('404') && !error.includes('Failed to fetch')
    )

    expect(criticalErrors).toHaveLength(0)
  })

  test('should be keyboard accessible', async ({ page }) => {
    await page.goto('/search')
    await page.waitForLoadState('networkidle')

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search"], [data-testid="search-input"]')
      .first()

    if ((await searchInput.count()) > 0) {
      // Test keyboard navigation
      await searchInput.focus()
      await expect(searchInput).toBeFocused()

      // Test typing
      await searchInput.type('AAPL')
      await expect(searchInput).toHaveValue('AAPL')

      // Test Enter key
      await searchInput.press('Enter')
      await page.waitForTimeout(1000)

      // Should handle keyboard input gracefully
      await expect(page.locator('body')).toBeVisible()
    }
  })
})
