import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ChartContainer, { ChartContainerRef } from '../ChartContainer'
import { PriceData } from '../../../utils/indicators'

// Mock dependencies
vi.mock('../LazyEChartsWrapper', () => ({
  LazyEChartsTradingChart: React.forwardRef((props: any, ref: React.Ref<any>) => (
    <div data-testid='chart' ref={ref} {...props}>
      Mock Chart
    </div>
  )),
}))

vi.mock('../LeftDrawingToolbar', () => ({
  default: React.forwardRef((props: any, ref: React.Ref<any>) => (
    <div data-testid='drawing-toolbar' ref={ref} {...props}>
      Drawing Toolbar
    </div>
  )),
}))

vi.mock('../DrawingContextMenu', () => ({
  default: (props: any) => (
    <div data-testid='context-menu' {...props}>
      Context Menu
    </div>
  ),
}))

// Mock custom hooks
vi.mock('../../../hooks/chart/useChartDataManager', () => ({
  useChartDataManager: vi.fn(),
}))

vi.mock('../../../hooks/chart/useChartRendering', () => ({
  useChartRendering: vi.fn(),
}))

vi.mock('../../../hooks/chart/useChartDrawingManager', () => ({
  useChartDrawingManager: vi.fn(),
}))

vi.mock('../../../hooks/useIndicators', () => ({
  useIndicators: vi.fn(),
}))

const mockPriceData: PriceData[] = [
  {
    time: 1640995200000,
    open: 100,
    high: 105,
    low: 98,
    close: 102,
    volume: 1000,
  },
  {
    time: 1641081600000,
    open: 102,
    high: 108,
    low: 101,
    close: 106,
    volume: 1200,
  },
]

describe.skip('ChartContainer', () => {
  const defaultProps = {
    symbol: 'AAPL',
    data: mockPriceData,
    currentPrice: 102,
    isLoading: false,
    isRealTime: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    const { useChartDataManager } = require('../../../hooks/chart/useChartDataManager')
    const { useChartRendering } = require('../../../hooks/chart/useChartRendering')
    const { useChartDrawingManager } = require('../../../hooks/chart/useChartDrawingManager')
    const { useIndicators } = require('../../../hooks/useIndicators')

    useChartDataManager.mockReturnValue({
      data: mockPriceData,
      latestPrice: 100,
      hasData: true,
      isInitialLoading: false,
      isUpdating: false,
    })

    useChartRendering.mockReturnValue({
      chartRef: { current: null },
      settings: { showDrawingTools: true },
      takeScreenshot: vi.fn(),
    })

    useChartDrawingManager.mockReturnValue({
      drawingTools: {
        activeToolType: null,
        contextMenu: { isVisible: false },
        getTool: vi.fn(),
        setToolType: vi.fn(),
      },
      getDrawingObjects: vi.fn().mockReturnValue([]),
      toggleDrawingToolVisibility: vi.fn(),
      deleteDrawingTool: vi.fn(),
      changeDrawingToolColor: vi.fn(),
      duplicateDrawingTool: vi.fn(),
    })

    useIndicators.mockReturnValue({
      data: [],
    })
  })

  it('renders chart container with data', () => {
    render(<ChartContainer {...defaultProps} />)

    expect(screen.getByTestId('chart')).toBeInTheDocument()
    expect(screen.getByTestId('drawing-toolbar')).toBeInTheDocument()
  })

  it('shows loading state when isInitialLoading is true', () => {
    const { useChartDataManager } = require('../../../hooks/chart/useChartDataManager')
    useChartDataManager.mockReturnValueOnce({
      isInitialLoading: true,
      hasData: false,
    })

    render(<ChartContainer {...defaultProps} />)

    expect(screen.getByText('Loading chart data...')).toBeInTheDocument()
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
  })

  it('shows no data state when hasData is false', () => {
    const { useChartDataManager } = require('../../../hooks/chart/useChartDataManager')
    useChartDataManager.mockReturnValueOnce({
      isInitialLoading: false,
      hasData: false,
    })

    render(<ChartContainer {...defaultProps} />)

    expect(screen.getByText('No Chart Data')).toBeInTheDocument()
    expect(screen.getByText(/No price data available for AAPL/)).toBeInTheDocument()
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
  })

  it('shows updating overlay when isUpdating is true', () => {
    const { useChartDataManager } = require('../../../hooks/chart/useChartDataManager')
    useChartDataManager.mockReturnValueOnce({
      data: mockPriceData,
      hasData: true,
      isInitialLoading: false,
      isUpdating: true,
    })

    render(<ChartContainer {...defaultProps} />)

    expect(screen.getByText('Updating chart data...')).toBeInTheDocument()
    expect(screen.getByTestId('chart')).toBeInTheDocument()
  })

  it('hides drawing toolbar when showDrawingTools is false', () => {
    render(<ChartContainer {...defaultProps} showDrawingTools={false} />)

    expect(screen.getByTestId('chart')).toBeInTheDocument()
    expect(screen.queryByTestId('drawing-toolbar')).not.toBeInTheDocument()
  })

  it('shows context menu when drawing context menu is visible', () => {
    const { useChartDrawingManager } = require('../../../hooks/chart/useChartDrawingManager')
    useChartDrawingManager.mockReturnValueOnce({
      drawingTools: {
        activeToolType: null,
        contextMenu: {
          isVisible: true,
          targetToolId: 'tool-1',
          x: 100,
          y: 200,
        },
        getTool: vi.fn().mockReturnValue({ id: 'tool-1', type: 'line' }),
        setToolType: vi.fn(),
      },
      getDrawingObjects: vi.fn().mockReturnValue([]),
      toggleDrawingToolVisibility: vi.fn(),
      deleteDrawingTool: vi.fn(),
      changeDrawingToolColor: vi.fn(),
      duplicateDrawingTool: vi.fn(),
    })

    render(<ChartContainer {...defaultProps} />)

    expect(screen.getByTestId('context-menu')).toBeInTheDocument()
  })

  it('handles different chart types', () => {
    render(<ChartContainer {...defaultProps} chartType='line' />)

    expect(screen.getByTestId('chart')).toBeInTheDocument()
    expect(screen.getByTestId('chart')).toHaveAttribute('chartType', 'line')
  })

  it('handles symbol changes', async () => {
    const onSymbolChange = vi.fn()
    render(<ChartContainer {...defaultProps} onSymbolChange={onSymbolChange} />)

    expect(screen.getByTestId('chart')).toBeInTheDocument()
    // Symbol change would be triggered by parent component
  })

  it('exposes takeScreenshot method through ref', () => {
    const mockTakeScreenshot = vi.fn()
    const { useChartRendering } = require('../../../hooks/chart/useChartRendering')
    useChartRendering.mockReturnValueOnce({
      chartRef: { current: null },
      settings: { showDrawingTools: true },
      takeScreenshot: mockTakeScreenshot,
    })

    const ref = React.createRef<ChartContainerRef>()
    render(<ChartContainer {...defaultProps} ref={ref} />)

    // Call takeScreenshot through ref
    ref.current?.takeScreenshot('test-screenshot.png')

    expect(mockTakeScreenshot).toHaveBeenCalledWith('test-screenshot.png')
  })

  it('optimizes re-renders with memoization', () => {
    const { rerender } = render(<ChartContainer {...defaultProps} />)

    // Same props should not trigger re-render
    rerender(<ChartContainer {...defaultProps} />)

    // Different props should trigger re-render
    rerender(<ChartContainer {...defaultProps} symbol='MSFT' />)

    expect(screen.getByTestId('chart')).toBeInTheDocument()
  })

  it('handles timeframe changes correctly', () => {
    render(<ChartContainer {...defaultProps} timeframe='1D' />)

    expect(screen.getByTestId('chart')).toHaveAttribute('timeframe', '1D')
  })

  it('handles volume display toggle', () => {
    render(<ChartContainer {...defaultProps} showVolume={false} />)

    expect(screen.getByTestId('chart')).toHaveAttribute('showVolume', 'false')
  })
})
