import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Icon } from '../Icon'

// Mock lucide-react icons using importOriginal approach
vi.mock('lucide-react', async importOriginal => {
  return {
    Search: ({ size, className, color }: any) => (
      <svg data-testid='search-icon' width={size} height={size} className={className} color={color}>
        <circle />
      </svg>
    ),
    Heart: ({ size, className, color }: any) => (
      <svg data-testid='heart-icon' width={size} height={size} className={className} color={color}>
        <path />
      </svg>
    ),
  }
})

// Mock shared constants
vi.mock('@trading-viewer/shared', () => ({
  COMMON_ICONS: {
    search: 'Search',
    heart: 'Heart',
  },
}))

// Mock utils
vi.mock('../utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

describe('Icon', () => {
  it('renders a valid lucide icon', () => {
    const { getByTestId } = render(<Icon name='Search' />)

    const icon = getByTestId('search-icon')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('width', '16') // default size
    expect(icon).toHaveAttribute('height', '16')
  })

  it('renders with custom size', () => {
    const { getByTestId } = render(<Icon name='Search' size={24} />)

    const icon = getByTestId('search-icon')
    expect(icon).toHaveAttribute('width', '24')
    expect(icon).toHaveAttribute('height', '24')
  })

  it('applies custom className', () => {
    const { getByTestId } = render(<Icon name='Search' className='custom-class' />)

    const icon = getByTestId('search-icon')
    expect(icon).toHaveClass('custom-class')
  })

  it('applies custom color', () => {
    const { getByTestId } = render(<Icon name='Search' color='red' />)

    const icon = getByTestId('search-icon')
    expect(icon).toHaveAttribute('color', 'red')
  })

  it('maps common icon names', () => {
    const { getByTestId } = render(<Icon name='search' />)

    const icon = getByTestId('search-icon')
    expect(icon).toBeInTheDocument()
  })

  it('renders different icon types', () => {
    const { getByTestId } = render(<Icon name='Heart' />)

    const icon = getByTestId('heart-icon')
    expect(icon).toBeInTheDocument()
  })
})
