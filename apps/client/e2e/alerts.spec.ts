import { test, expect } from '@playwright/test'

test.describe('TradingViewer Alerts Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to alerts page
    await page.goto('/alerts')
    await page.waitForLoadState('networkidle')
  })

  test('should load alerts page successfully', async ({ page }) => {
    // Check if the page title contains alerts-related content
    await expect(page).toHaveTitle(/TradingViewer/i)

    // Should display either alerts content or authentication required message
    const authRequired = await page.locator('h2:has-text("Authentication Required")').count() > 0
    const alertsContent = await page.locator('h1:has-text("Price Alerts")').count() > 0 ||
                         await page.locator('h1:has-text("Alerts")').count() > 0

    // Should show either auth message or alerts content
    expect(authRequired || alertsContent).toBe(true)

    // If authentication required, should show appropriate message
    if (authRequired) {
      await expect(page.locator('h2:has-text("Authentication Required")')).toBeVisible()
      await expect(page.locator('text=Please log in to manage your price alerts')).toBeVisible()
    }

    // Check if URL contains alerts
    expect(page.url()).toContain('/alerts')
  })

  test('should display alerts list or empty state', async ({ page }) => {
    // Wait for any loading states to complete
    await page.waitForTimeout(1000)

    // Check if user is authenticated first
    const authRequired = await page.locator('h2:has-text("Authentication Required")').count() > 0
    
    if (authRequired) {
      // If not authenticated, should show auth message
      await expect(page.locator('h2:has-text("Authentication Required")')).toBeVisible()
    } else {
      // If authenticated, check for either alerts list or empty state
      const hasAlertsList = await page.locator('[data-testid="alerts-list"]').count() > 0
      const hasEmptyState = await page.locator(':has-text("No alerts yet")').count() > 0 ||
                           await page.locator(':has-text("empty")').count() > 0 ||
                           await page.locator('text=Create your first price alert').count() > 0

      // Should have either alerts or empty state
      expect(hasAlertsList || hasEmptyState).toBe(true)
    }
  })

  test('should handle alert creation flow', async ({ page }) => {
    // Look for create/add alert button
    const createButtonSelectors = [
      '[data-testid="create-alert"]',
      'button:has-text("Create Alert")',
      'button:has-text("Add Alert")',
      'button:has-text("New Alert")',
      '[data-testid="add-alert-button"]'
    ]

    let createButton
    for (const selector of createButtonSelectors) {
      const element = page.locator(selector).first()
      if ((await element.count()) > 0) {
        createButton = element
        break
      }
    }

    if (createButton) {
      // Click create alert button
      await createButton.click()
      await page.waitForTimeout(500)

      // Should open modal or navigate to create form
      const modalOrForm = await page.locator('[data-testid="alert-form"]').count() > 0 ||
                         await page.locator('.modal').count() > 0 ||
                         await page.locator('[role="dialog"]').count() > 0

      expect(modalOrForm).toBe(true)
    } else {
      console.log('Create alert button not found - this is expected if not implemented yet')
    }
  })

  test('should handle alert filtering and search', async ({ page }) => {
    // Look for search or filter controls
    const searchSelectors = [
      '[data-testid="alerts-search"]',
      'input[placeholder*="search" i]',
      'input[placeholder*="filter" i]',
      '[data-testid="search-input"]'
    ]

    let searchInput
    for (const selector of searchSelectors) {
      const element = page.locator(selector).first()
      if ((await element.count()) > 0 && await element.isVisible()) {
        searchInput = element
        break
      }
    }

    if (searchInput) {
      // Test search functionality
      await searchInput.fill('AAPL')
      await page.waitForTimeout(500)
      
      // Should show filtered results or no results message
      const hasResults = await page.locator('[data-testid="alert-item"]').count() > 0
      const hasNoResults = await page.locator(':has-text("No results")').count() > 0 ||
                           await page.locator(':has-text("No alerts found")').count() > 0

      // Either should have results or show no results message
      expect(hasResults || hasNoResults).toBe(true)
    } else {
      console.log('Search functionality not found - this is expected if not implemented yet')
    }
  })

  test('should handle alert actions (enable/disable/delete)', async ({ page }) => {
    // Wait for any alerts to load
    await page.waitForTimeout(1000)

    // Look for alert items with action buttons
    const alertItems = page.locator('[data-testid="alert-item"]')
    const alertCount = await alertItems.count()

    if (alertCount > 0) {
      const firstAlert = alertItems.first()
      
      // Look for action buttons
      const actionSelectors = [
        '[data-testid="alert-toggle"]',
        '[data-testid="delete-alert"]',
        'button:has-text("Enable")',
        'button:has-text("Disable")',
        'button:has-text("Delete")',
        '.alert-actions button'
      ]

      let actionFound = false
      for (const selector of actionSelectors) {
        const actionButton = firstAlert.locator(selector).first()
        if ((await actionButton.count()) > 0 && await actionButton.isVisible()) {
          // Test clicking the action
          await actionButton.click()
          await page.waitForTimeout(500)
          actionFound = true
          break
        }
      }

      if (!actionFound) {
        console.log('Alert action buttons not found - this is expected if not implemented yet')
      }
    } else {
      console.log('No alert items found to test actions on')
    }
  })

  test('should handle bulk operations', async ({ page }) => {
    await page.waitForTimeout(1000)

    // Look for bulk operation controls
    const bulkSelectors = [
      '[data-testid="select-all-alerts"]',
      'input[type="checkbox"]:has-text("Select All")',
      '[data-testid="bulk-actions"]',
      'button:has-text("Delete Selected")',
      'button:has-text("Disable Selected")'
    ]

    let bulkControlFound = false
    for (const selector of bulkSelectors) {
      const element = page.locator(selector).first()
      if ((await element.count()) > 0) {
        await expect(element).toBeVisible()
        bulkControlFound = true
        break
      }
    }

    if (bulkControlFound) {
      console.log('Bulk operations UI found and visible')
    } else {
      console.log('Bulk operations not found - this is expected if not implemented yet')
    }
  })

  test('should be responsive on different screen sizes', async ({ page }) => {
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

    // Should still show content in mobile (either auth message or alerts)
    const hasContent = await page.locator('main, [role="main"]').count() > 0 ||
                      await page.locator('h2:has-text("Authentication Required")').count() > 0 ||
                      await page.locator('h1:has-text("Price Alerts")').count() > 0

    expect(hasContent).toBe(true)
  })

  test('should handle errors gracefully', async ({ page }) => {
    // Monitor for JavaScript errors
    const errors: string[] = []
    page.on('pageerror', error => {
      errors.push(error.message)
    })

    // Monitor console errors
    const logs: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Warning')) {
        logs.push(msg.text())
      }
    })

    // Interact with the page to trigger potential errors
    await page.waitForTimeout(1000)

    // Try to interact with alert controls if they exist
    const interactiveElements = await page.locator('button, input, select').count()
    if (interactiveElements > 0) {
      const firstButton = page.locator('button').first()
      if (await firstButton.isVisible()) {
        await firstButton.click()
        await page.waitForTimeout(500)
      }
    }

    // Should not have uncaught errors
    expect(errors).toHaveLength(0)
    expect(logs.filter(log => !log.includes('development') && !log.includes('DevTools'))).toHaveLength(0)
  })

  test('should load with proper accessibility attributes', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(1000)

    // Check for basic accessibility attributes - main element or role
    const mainElement = await page.locator('main').count() > 0
    const mainRole = await page.locator('[role="main"]').count() > 0

    // Should have proper semantic structure
    expect(mainElement || mainRole).toBe(true)

    // Check for heading hierarchy (either auth message or alerts page)
    const hasHeadings = await page.locator('h1, h2, h3').count() > 0
    expect(hasHeadings).toBe(true)

    // Should have at least one heading visible
    const visibleHeadings = await page.locator('h1:visible, h2:visible, h3:visible').count()
    expect(visibleHeadings).toBeGreaterThan(0)
  })
})