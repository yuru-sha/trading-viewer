import { test, expect } from '@playwright/test'

test.describe('Basic Application Tests', () => {
  test('should load application successfully', async ({ page }) => {
    await page.goto('/')

    // Check that the page loads
    await expect(page).toHaveTitle(/TradingViewer/i)

    // Check that the page renders content
    await expect(page.locator('body')).toBeVisible()
  })
})
