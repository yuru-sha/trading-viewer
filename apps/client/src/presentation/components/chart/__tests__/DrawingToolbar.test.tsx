import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { DrawingToolbar } from '@/presentation/components/DrawingToolbar'
import type { DrawingToolType, DrawingMode, DrawingStyle } from '@trading-viewer/shared'

describe.skip('DrawingToolbar', () => {
  const mockProps = {
    activeToolType: null as DrawingToolType | null,
    drawingMode: 'drawing' as DrawingMode,
    defaultStyle: {
      color: '#2563eb',
      thickness: 2,
      opacity: 1,
      dashPattern: [],
    } as DrawingStyle,
    snapToPrice: true,
    toolCount: 0,
    onToolSelect: vi.fn(),
    onModeChange: vi.fn(),
    onStyleChange: vi.fn(),
    onToggleSnap: vi.fn(),
    onClearAll: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all drawing tools', () => {
    render(<DrawingToolbar {...mockProps} />)

    expect(screen.getByRole('button', { name: /trend line/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /horizontal line/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vertical line/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fibonacci/i })).toBeInTheDocument()
  })

  it('should call onToolSelect when tool is clicked', () => {
    render(<DrawingToolbar {...mockProps} />)

    const trendlineButton = screen.getByRole('button', { name: /trend line/i })
    fireEvent.click(trendlineButton)

    expect(mockProps.onToolSelect).toHaveBeenCalledWith('trendline')
  })

  it('should highlight active tool', () => {
    render(<DrawingToolbar {...mockProps} activeToolType='trendline' />)

    const trendlineButton = screen.getByRole('button', { name: /trend line/i })
    expect(trendlineButton).toHaveClass('bg-blue-600')
  })

  it('should show style controls', () => {
    render(<DrawingToolbar {...mockProps} />)

    // Color options should be available
    expect(screen.getByRole('button', { name: /blue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /red/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /green/i })).toBeInTheDocument()
  })

  it('should call onStyleChange when color is selected', () => {
    render(<DrawingToolbar {...mockProps} />)

    const redColorButton = screen.getByRole('button', { name: /red/i })
    fireEvent.click(redColorButton)

    expect(mockProps.onStyleChange).toHaveBeenCalledWith({
      color: expect.any(String),
    })
  })

  it('should render with custom className', () => {
    const { container } = render(<DrawingToolbar {...mockProps} className='custom-toolbar' />)

    expect(container.firstChild).toHaveClass('custom-toolbar')
  })
})
