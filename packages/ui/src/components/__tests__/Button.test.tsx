import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-blue-600') // primary variant
    expect(button).toHaveClass('px-4', 'py-2') // md size
  })

  it('renders with custom variant', () => {
    render(<Button variant='danger'>Delete</Button>)

    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass('bg-red-600')
  })

  it('renders with custom size', () => {
    render(<Button size='lg'>Large Button</Button>)

    const button = screen.getByRole('button', { name: 'Large Button' })
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg')
  })

  it('shows loading state', () => {
    render(<Button loading>Loading...</Button>)

    const button = screen.getByRole('button', { name: 'Loading...' })
    expect(button).toBeDisabled()
    expect(button.querySelector('svg')).toBeInTheDocument() // spinner
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)

    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toBeDisabled()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Disabled' })
    fireEvent.click(button)

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Button className='custom-class'>Custom</Button>)

    const button = screen.getByRole('button', { name: 'Custom' })
    expect(button).toHaveClass('custom-class')
  })

  it('passes through HTML attributes', () => {
    render(
      <Button data-testid='test-button' type='submit'>
        Submit
      </Button>
    )

    const button = screen.getByTestId('test-button')
    expect(button).toHaveAttribute('type', 'submit')
  })
})
