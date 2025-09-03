const { chromium } = require('@playwright/test')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Listen to console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Browser Error: ${msg.text()}`)
    }
  })

  page.on('pageerror', error => {
    console.log(`Page Error: ${error.message}`)
  })

  try {
    console.log('Opening http://localhost:3000/charts')
    await page.goto('http://localhost:3000/charts')
    console.log('Page loaded, waiting for elements...')

    // Wait and log what we find
    await page.waitForTimeout(5000)

    const hasChartContainer = await page.locator('[data-testid="chart-container"]').count()
    const hasUseCallbackError = await page.evaluate(() => {
      return window.console.error.toString().includes('useCallback')
    })

    console.log('Chart container found:', hasChartContainer > 0)
    console.log('Page title:', await page.title())

    // Check for React error boundaries
    const errorBoundary = await page.locator('.react-error-boundary, [data-error-boundary]').count()
    console.log('Error boundary elements:', errorBoundary)

    await page.screenshot({ path: 'debug-chart.png', fullPage: true })
    console.log('Screenshot saved as debug-chart.png')
  } catch (error) {
    console.log('Script error:', error.message)
  }

  // Keep browser open for 30 seconds to inspect
  console.log('Keeping browser open for inspection...')
  await page.waitForTimeout(30000)

  await browser.close()
})()
