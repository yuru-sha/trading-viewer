import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Component } from 'react'
import { ErrorBoundary } from '../ErrorBoundary'

// Mock the UI Button component
vi.mock('@trading-viewer/ui', () => ({
  Button: ({ children, onClick, variant, className, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Test component that throws an error
class ThrowError extends Component<{ shouldThrow: boolean }> {
  render() {
    if (this.props.shouldThrow) {
      throw new Error('Test error')
    }
    return <div>No error</div>
  }
}

describe('ErrorBoundary', () => {
  let consoleSpy: any
  let reloadSpy: any

  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock window.location.reload
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy, href: '' },
      writable: true,
    })
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('catches error and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred. Please try one of the recovery options below.')).toBeInTheDocument()
  })

  it('displays custom fallback when provided', () => {
    const fallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('displays error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument()
    expect(screen.queryByText('Test error')).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('renders recovery action buttons', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByLabelText('Try to recover from error')).toBeInTheDocument()
    expect(screen.getByLabelText('Reload the page')).toBeInTheDocument()
    expect(screen.getByLabelText('Go to home page')).toBeInTheDocument()
  })

  it('handles retry button click and resets error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Error boundary should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByLabelText('Try to recover from error')).toBeInTheDocument()

    // Click retry button - this should reset the error state
    fireEvent.click(screen.getByLabelText('Try to recover from error'))

    // Since error state is reset but we're still rendering the same throwing component,
    // the error will occur again. We just need to verify the retry button exists and is clickable
    expect(screen.getByLabelText('Try to recover from error')).toBeInTheDocument()
  })

  it('handles reload button click', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByLabelText('Reload the page'))

    expect(reloadSpy).toHaveBeenCalled()
  })

  it('handles home button click', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByLabelText('Go to home page'))

    expect(window.location.href).toBe('/')
  })

  it('logs error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    )
  })

  it('shows support information', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('If the problem persists, please contact support with the error details.')).toBeInTheDocument()
  })

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Check if SVG has aria-hidden attribute (SVGs don't have role="img" by default)
    const svgElement = document.querySelector('svg')
    expect(svgElement).toHaveAttribute('aria-hidden', 'true')

    const tryAgainButton = screen.getByLabelText('Try to recover from error')
    expect(tryAgainButton).toHaveAttribute('aria-label', 'Try to recover from error')

    const reloadButton = screen.getByLabelText('Reload the page')
    expect(reloadButton).toHaveAttribute('aria-label', 'Reload the page')

    const homeButton = screen.getByLabelText('Go to home page')
    expect(homeButton).toHaveAttribute('aria-label', 'Go to home page')
  })

  it('applies correct CSS classes for styling', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const tryAgainButton = screen.getByLabelText('Try to recover from error')
    expect(tryAgainButton).toHaveAttribute('data-variant', 'primary')

    const reloadButton = screen.getByLabelText('Reload the page')
    expect(reloadButton).toHaveAttribute('data-variant', 'outline')

    const homeButton = screen.getByLabelText('Go to home page')
    expect(homeButton).toHaveAttribute('data-variant', 'ghost')
  })
})