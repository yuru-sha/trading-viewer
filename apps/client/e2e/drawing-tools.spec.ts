import { test, expect } from '@playwright/test'

test.describe('Drawing Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Wait for chart to load
    await expect(page.locator('[data-testid="chart-container"]')).toBeVisible()
    await page.waitForTimeout(2000)
  })

  test('should be able to select and use trendline tool', async ({ page }) => {
    // Click on trendline tool
    const trendlineButton = page.getByRole('button', { name: /trend line/i })
    await expect(trendlineButton).toBeVisible()
    await trendlineButton.click()

    // Verify tool is selected
    await expect(trendlineButton).toHaveClass(/bg-blue-100/)

    // Draw a trendline on the chart
    const chartCanvas = page.locator('canvas').first()
    await expect(chartCanvas).toBeVisible()

    // Draw line from top-left to bottom-right
    await chartCanvas.click({ position: { x: 200, y: 200 } })
    await chartCanvas.click({ position: { x: 400, y: 300 } })

    // Verify trendline appears in drawing objects panel
    const drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/trendline/i)).toBeVisible()
  })

  test('should be able to select and use horizontal line tool', async ({ page }) => {
    // Click on horizontal line tool
    const horizontalButton = page.getByRole('button', { name: /horizontal line/i })
    await expect(horizontalButton).toBeVisible()
    await horizontalButton.click()

    // Verify tool is selected
    await expect(horizontalButton).toHaveClass(/bg-blue-100/)

    // Draw a horizontal line on the chart
    const chartCanvas = page.locator('canvas').first()
    await chartCanvas.click({ position: { x: 300, y: 250 } })

    // Verify horizontal line appears in drawing objects
    const drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/horizontal/i)).toBeVisible()
  })

  test('should be able to select and use vertical line tool', async ({ page }) => {
    // Click on vertical line tool
    const verticalButton = page.getByRole('button', { name: /vertical line/i })
    await expect(verticalButton).toBeVisible()
    await verticalButton.click()

    // Verify tool is selected
    await expect(verticalButton).toHaveClass(/bg-blue-100/)

    // Draw a vertical line on the chart
    const chartCanvas = page.locator('canvas').first()
    await chartCanvas.click({ position: { x: 350, y: 200 } })

    // Verify vertical line appears in drawing objects
    const drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/vertical/i)).toBeVisible()
  })

  test('should be able to select and use fibonacci tool', async ({ page }) => {
    // Click on fibonacci tool
    const fibonacciButton = page.getByRole('button', { name: /fibonacci/i })
    await expect(fibonacciButton).toBeVisible()
    await fibonacciButton.click()

    // Verify tool is selected
    await expect(fibonacciButton).toHaveClass(/bg-blue-100/)

    // Draw fibonacci retracement
    const chartCanvas = page.locator('canvas').first()
    await chartCanvas.click({ position: { x: 200, y: 150 } })
    await chartCanvas.click({ position: { x: 400, y: 350 } })

    // Verify fibonacci appears in drawing objects
    const drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/fibonacci/i)).toBeVisible()
  })

  test('should be able to switch between drawing and editing modes', async ({ page }) => {
    // Start in drawing mode (default)
    const drawingModeButton = page.getByRole('button', { name: /drawing mode/i })
    const editingModeButton = page.getByRole('button', { name: /editing mode/i })
    
    await expect(drawingModeButton).toHaveClass(/bg-blue-100/)

    // Switch to editing mode
    await editingModeButton.click()
    await expect(editingModeButton).toHaveClass(/bg-blue-100/)
    await expect(drawingModeButton).not.toHaveClass(/bg-blue-100/)

    // Switch back to drawing mode
    await drawingModeButton.click()
    await expect(drawingModeButton).toHaveClass(/bg-blue-100/)
    await expect(editingModeButton).not.toHaveClass(/bg-blue-100/)
  })

  test('should be able to change drawing style', async ({ page }) => {
    // Open color picker
    const colorButton = page.getByRole('button', { name: /line color/i })
    await colorButton.click()

    // Select red color
    const redOption = page.getByRole('button', { name: /red/i })
    await redOption.click()

    // Change line thickness
    const thicknessSelect = page.getByRole('combobox', { name: /line thickness/i })
    await thicknessSelect.selectOption('3')

    // Draw a line to verify style changes
    const trendlineButton = page.getByRole('button', { name: /trend line/i })
    await trendlineButton.click()

    const chartCanvas = page.locator('canvas').first()
    await chartCanvas.click({ position: { x: 200, y: 200 } })
    await chartCanvas.click({ position: { x: 400, y: 300 } })

    // Verify the line was drawn with new style (color should be visible)
    // This is a basic check - in a real test you might inspect the canvas content
    const drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/trendline/i)).toBeVisible()
  })

  test('should be able to toggle snap to price', async ({ page }) => {
    const snapButton = page.getByRole('button', { name: /snap to price/i })
    
    // Initially enabled (default)
    await expect(snapButton).toHaveClass(/bg-blue-100/)

    // Toggle off
    await snapButton.click()
    await expect(snapButton).not.toHaveClass(/bg-blue-100/)

    // Toggle back on
    await snapButton.click()
    await expect(snapButton).toHaveClass(/bg-blue-100/)
  })

  test('should be able to clear all drawings', async ({ page }) => {
    // Draw a few lines first
    const trendlineButton = page.getByRole('button', { name: /trend line/i })
    await trendlineButton.click()

    const chartCanvas = page.locator('canvas').first()
    
    // Draw first line
    await chartCanvas.click({ position: { x: 200, y: 200 } })
    await chartCanvas.click({ position: { x: 300, y: 250 } })

    // Draw second line
    await chartCanvas.click({ position: { x: 250, y: 180 } })
    await chartCanvas.click({ position: { x: 350, y: 280 } })

    // Verify drawings exist
    const drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/trendline/i).first()).toBeVisible()

    // Clear all drawings
    const clearButton = page.getByRole('button', { name: /clear all/i })
    await expect(clearButton).not.toBeDisabled()
    await clearButton.click()

    // Verify drawings are cleared
    await expect(drawingObjects.getByText(/trendline/i)).not.toBeVisible()
    await expect(clearButton).toBeDisabled()
  })

  test('should be able to select and edit existing drawings', async ({ page }) => {
    // Draw a trendline first
    const trendlineButton = page.getByRole('button', { name: /trend line/i })
    await trendlineButton.click()

    const chartCanvas = page.locator('canvas').first()
    await chartCanvas.click({ position: { x: 200, y: 200 } })
    await chartCanvas.click({ position: { x: 400, y: 300 } })

    // Switch to editing mode
    const editingModeButton = page.getByRole('button', { name: /editing mode/i })
    await editingModeButton.click()

    // Click on the drawn line to select it
    await chartCanvas.click({ position: { x: 300, y: 250 } })

    // Verify line is selected (this might show handles or highlight)
    // The exact verification depends on your UI implementation
    
    // Try to drag one of the endpoints
    await chartCanvas.hover({ position: { x: 200, y: 200 } })
    await page.mouse.down()
    await page.mouse.move(250, 180)
    await page.mouse.up()

    // Line should be moved/modified
    // This is a basic test - you might want to verify specific coordinates
  })

  test('should show right-click context menu on drawings', async ({ page }) => {
    // Draw a line first
    const trendlineButton = page.getByRole('button', { name: /trend line/i })
    await trendlineButton.click()

    const chartCanvas = page.locator('canvas').first()
    await chartCanvas.click({ position: { x: 200, y: 200 } })
    await chartCanvas.click({ position: { x: 400, y: 300 } })

    // Switch to editing mode
    const editingModeButton = page.getByRole('button', { name: /editing mode/i })
    await editingModeButton.click()

    // Right-click on the line
    await chartCanvas.click({ 
      position: { x: 300, y: 250 }, 
      button: 'right' 
    })

    // Verify context menu appears
    const contextMenu = page.locator('[data-testid="drawing-context-menu"]')
    await expect(contextMenu).toBeVisible()
    
    // Check menu options
    await expect(contextMenu.getByText(/delete/i)).toBeVisible()
    await expect(contextMenu.getByText(/duplicate/i)).toBeVisible()
    await expect(contextMenu.getByText(/bring to front/i)).toBeVisible()
  })

  test('should persist drawings when switching symbols', async ({ page }) => {
    // Draw a line on AAPL
    const trendlineButton = page.getByRole('button', { name: /trend line/i })
    await trendlineButton.click()

    const chartCanvas = page.locator('canvas').first()
    await chartCanvas.click({ position: { x: 200, y: 200 } })
    await chartCanvas.click({ position: { x: 400, y: 300 } })

    // Verify drawing exists
    let drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/trendline/i)).toBeVisible()

    // Switch to MSFT
    const symbolSearch = page.locator('[data-testid="symbol-search"]')
    await symbolSearch.fill('MSFT')
    await page.keyboard.press('Enter')

    // Wait for new chart to load
    await page.waitForTimeout(2000)

    // Drawing should be cleared for new symbol
    drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/trendline/i)).not.toBeVisible()

    // Switch back to AAPL
    await symbolSearch.fill('AAPL')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(2000)

    // Drawing should be restored
    await expect(drawingObjects.getByText(/trendline/i)).toBeVisible()
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test trendline shortcut (T key)
    await page.keyboard.press('t')
    
    const trendlineButton = page.getByRole('button', { name: /trend line/i })
    await expect(trendlineButton).toHaveClass(/bg-blue-100/)

    // Test horizontal line shortcut (H key)
    await page.keyboard.press('h')
    
    const horizontalButton = page.getByRole('button', { name: /horizontal line/i })
    await expect(horizontalButton).toHaveClass(/bg-blue-100/)

    // Test vertical line shortcut (V key)
    await page.keyboard.press('v')
    
    const verticalButton = page.getByRole('button', { name: /vertical line/i })
    await expect(verticalButton).toHaveClass(/bg-blue-100/)

    // Test escape to deselect
    await page.keyboard.press('Escape')
    
    await expect(trendlineButton).not.toHaveClass(/bg-blue-100/)
    await expect(horizontalButton).not.toHaveClass(/bg-blue-100/)
    await expect(verticalButton).not.toHaveClass(/bg-blue-100/)
  })

  test('should work on mobile/touch devices', async ({ page }) => {
    // Simulate mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Verify drawing tools are accessible in mobile layout
    const toolsButton = page.getByRole('button', { name: /drawing tools/i })
    await expect(toolsButton).toBeVisible()
    await toolsButton.click()

    // Select trendline
    const trendlineButton = page.getByRole('button', { name: /trend line/i })
    await trendlineButton.click()

    // Draw with touch events
    const chartCanvas = page.locator('canvas').first()
    await chartCanvas.tap({ position: { x: 100, y: 150 } })
    await chartCanvas.tap({ position: { x: 200, y: 200 } })

    // Verify drawing was created
    const drawingObjects = page.locator('[data-testid="drawing-objects"]')
    await expect(drawingObjects.getByText(/trendline/i)).toBeVisible()
  })
})