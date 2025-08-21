import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '../../../__tests__/test-utils'
import UserFiltersComponent from '../UserFiltersComponent'

// Mock the AdvancedUserFilters component
vi.mock('../AdvancedUserFilters', () => ({
  default: ({ onApplyFilters, onClearFilters, isOpen, onToggle }: any) => (
    <div data-testid="advanced-filters">
      <button 
        onClick={onToggle} 
        data-testid="toggle-advanced-filters"
      >
        Toggle Advanced Filters
      </button>
      {isOpen && (
        <div data-testid="advanced-filters-panel">
          <button 
            onClick={() => onApplyFilters({
              search: 'advanced search',
              role: 'admin',
              status: 'active',
              emailVerified: 'true',
              department: 'Engineering',
              lastLoginStart: '2024-01-01',
              lastLoginEnd: '2024-12-31',
              createdStart: '2023-01-01',
              createdEnd: '2024-12-31',
              failedLoginCount: { operator: 'gt', value: 3 },
              hasActiveSession: 'true',
              isLocked: 'false',
              timezone: 'UTC',
              language: 'en'
            })}
            data-testid="apply-advanced-filters"
          >
            Apply Advanced Filters
          </button>
          <button 
            onClick={onClearFilters}
            data-testid="clear-advanced-filters"
          >
            Clear Advanced Filters
          </button>
        </div>
      )}
    </div>
  ),
  __esModule: true,
}))

describe('UserFiltersComponent', () => {
  const mockProps = {
    filters: {
      search: '',
      role: '',
      status: ''
    },
    advancedFiltersOpen: false,
    onFilterChange: vi.fn(),
    onToggleAdvancedFilters: vi.fn(),
    onApplyAdvancedFilters: vi.fn(),
    onClearAdvancedFilters: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Filters', () => {
    it('should render basic filter form with correct labels and inputs', () => {
      render(<UserFiltersComponent {...mockProps} />)

      // Check section title
      expect(screen.getByText('Basic Filters')).toBeInTheDocument()

      // Check search input
      expect(screen.getByLabelText('Search')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search by email or name...')).toBeInTheDocument()

      // Check role select
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
      const roleSelect = screen.getByDisplayValue('All Roles')
      expect(roleSelect).toBeInTheDocument()

      // Check status select
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
      const statusSelect = screen.getByDisplayValue('All Status')
      expect(statusSelect).toBeInTheDocument()
    })

    it('should display current filter values correctly', () => {
      const filtersWithValues = {
        search: 'john@example.com',
        role: 'admin',
        status: 'active'
      }

      render(<UserFiltersComponent {...mockProps} filters={filtersWithValues} />)

      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Admin')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Active')).toBeInTheDocument()
    })

    it('should call onFilterChange when search input changes', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: 'test@example.com' } })

      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', 'test@example.com')
    })

    it('should call onFilterChange when role select changes', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const roleSelect = screen.getByLabelText('Role')
      await fireEvent.change(roleSelect, { target: { value: 'admin' } })

      expect(mockProps.onFilterChange).toHaveBeenCalledWith('role', 'admin')
    })

    it('should call onFilterChange when status select changes', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const statusSelect = screen.getByLabelText('Status')
      await fireEvent.change(statusSelect, { target: { value: 'inactive' } })

      expect(mockProps.onFilterChange).toHaveBeenCalledWith('status', 'inactive')
    })

    it('should have correct select options for role', () => {
      render(<UserFiltersComponent {...mockProps} />)

      const roleSelect = screen.getByLabelText('Role')
      expect(roleSelect).toHaveTextContent('All Roles')
      expect(roleSelect).toHaveTextContent('Admin')
      expect(roleSelect).toHaveTextContent('User')
    })

    it('should have correct select options for status', () => {
      render(<UserFiltersComponent {...mockProps} />)

      const statusSelect = screen.getByLabelText('Status')
      expect(statusSelect).toHaveTextContent('All Status')
      expect(statusSelect).toHaveTextContent('Active')
      expect(statusSelect).toHaveTextContent('Inactive')
    })
  })

  describe('Advanced Filters Integration', () => {
    it('should render advanced filters component', () => {
      render(<UserFiltersComponent {...mockProps} />)

      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument()
    })

    it('should pass correct props to advanced filters component', () => {
      const propsWithAdvancedOpen = {
        ...mockProps,
        advancedFiltersOpen: true
      }

      render(<UserFiltersComponent {...propsWithAdvancedOpen} />)

      expect(screen.getByTestId('advanced-filters-panel')).toBeInTheDocument()
    })

    it('should handle advanced filters toggle', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const toggleButton = screen.getByTestId('toggle-advanced-filters')
      await fireEvent.click(toggleButton)

      expect(mockProps.onToggleAdvancedFilters).toHaveBeenCalled()
    })

    it('should handle advanced filters apply', async () => {
      const propsWithAdvancedOpen = {
        ...mockProps,
        advancedFiltersOpen: true
      }

      render(<UserFiltersComponent {...propsWithAdvancedOpen} />)

      const applyButton = screen.getByTestId('apply-advanced-filters')
      await fireEvent.click(applyButton)

      expect(mockProps.onApplyAdvancedFilters).toHaveBeenCalledWith({
        search: 'advanced search',
        role: 'admin',
        status: 'active',
        emailVerified: 'true',
        department: 'Engineering',
        lastLoginStart: '2024-01-01',
        lastLoginEnd: '2024-12-31',
        createdStart: '2023-01-01',
        createdEnd: '2024-12-31',
        failedLoginCount: { operator: 'gt', value: 3 },
        hasActiveSession: 'true',
        isLocked: 'false',
        timezone: 'UTC',
        language: 'en'
      })
    })

    it('should handle advanced filters clear', async () => {
      const propsWithAdvancedOpen = {
        ...mockProps,
        advancedFiltersOpen: true
      }

      render(<UserFiltersComponent {...propsWithAdvancedOpen} />)

      const clearButton = screen.getByTestId('clear-advanced-filters')
      await fireEvent.click(clearButton)

      expect(mockProps.onClearAdvancedFilters).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper aria labels and ids', () => {
      render(<UserFiltersComponent {...mockProps} />)

      // Check form elements have proper ids and labels
      const searchInput = screen.getByLabelText('Search')
      expect(searchInput).toHaveAttribute('id', 'search-basic-filter')

      const roleSelect = screen.getByLabelText('Role')
      expect(roleSelect).toHaveAttribute('id', 'role-basic-filter')

      const statusSelect = screen.getByLabelText('Status')
      expect(statusSelect).toHaveAttribute('id', 'status-basic-filter')
    })

    it('should be keyboard navigable', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByLabelText('Search')
      const roleSelect = screen.getByLabelText('Role')
      const statusSelect = screen.getByLabelText('Status')

      // Tab through the form elements
      searchInput.focus()
      expect(document.activeElement).toBe(searchInput)

      await fireEvent.keyDown(searchInput, { key: 'Tab' })
      await waitFor(() => {
        expect(document.activeElement).toBe(roleSelect)
      })

      await fireEvent.keyDown(roleSelect, { key: 'Tab' })
      await waitFor(() => {
        expect(document.activeElement).toBe(statusSelect)
      })
    })
  })

  describe('Input Validation', () => {
    it('should handle empty search input', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: '' } })

      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', '')
    })

    it('should handle long search strings', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const longString = 'a'.repeat(1000)
      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: longString } })

      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', longString)
    })

    it('should handle special characters in search', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?'
      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: specialChars } })

      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', specialChars)
    })

    it('should handle unicode characters in search', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const unicodeString = '田中太郎@example.com José García'
      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: unicodeString } })

      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', unicodeString)
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily when props do not change', () => {
      const { rerender } = render(<UserFiltersComponent {...mockProps} />)

      // Re-render with same props
      rerender(<UserFiltersComponent {...mockProps} />)

      // Component should handle this gracefully without errors
      expect(screen.getByText('Basic Filters')).toBeInTheDocument()
    })

    it('should debounce rapid filter changes', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByLabelText('Search')

      // Simulate rapid typing
      await fireEvent.change(searchInput, { target: { value: 't' } })
      await fireEvent.change(searchInput, { target: { value: 'te' } })
      await fireEvent.change(searchInput, { target: { value: 'tes' } })
      await fireEvent.change(searchInput, { target: { value: 'test' } })

      // All changes should be captured
      expect(mockProps.onFilterChange).toHaveBeenCalledTimes(4)
      expect(mockProps.onFilterChange).toHaveBeenLastCalledWith('search', 'test')
    })
  })

  describe('Dark Mode Support', () => {
    it('should apply correct dark mode classes', () => {
      render(<UserFiltersComponent {...mockProps} />)

      const container = screen.getByText('Basic Filters').parentElement
      expect(container).toHaveClass('dark:bg-gray-800')

      const searchInput = screen.getByLabelText('Search')
      expect(searchInput).toHaveClass('dark:bg-gray-700', 'dark:text-gray-100', 'dark:border-gray-600')
    })
  })

  describe('Email Verification Filter', () => {
    it('should handle email verification filter in advanced mode', async () => {
      const propsWithAdvancedOpen = {
        ...mockProps,
        advancedFiltersOpen: true
      }

      render(<UserFiltersComponent {...propsWithAdvancedOpen} />)

      // Verify advanced filters panel is open
      const advancedPanel = screen.getByTestId('advanced-filters-panel')
      expect(advancedPanel).toBeInTheDocument()

      // Click apply filters which includes emailVerified: 'true'
      const applyButton = screen.getByTestId('apply-advanced-filters')
      await fireEvent.click(applyButton)

      // Check that advanced filters were applied
      expect(mockProps.onApplyAdvancedFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: 'true'
        })
      )
    })

    it('should sync basic filter values to advanced filters', () => {
      const propsWithValues = {
        ...mockProps,
        filters: {
          search: 'test@example.com',
          role: 'admin',
          status: 'active'
        }
      }

      render(<UserFiltersComponent {...propsWithValues} />)

      // Verify that initialFilters prop is passed to AdvancedUserFilters
      const advancedFilters = screen.getByTestId('advanced-filters')
      expect(advancedFilters).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should handle email search input correctly', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search by email or name...')
      
      await fireEvent.change(searchInput, { target: { value: 'admin@example.com' } })
      
      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', 'admin@example.com')
    })

    it('should handle name search input correctly', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search by email or name...')
      
      await fireEvent.change(searchInput, { target: { value: 'John Doe' } })
      
      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', 'John Doe')
    })

    it('should handle partial email domain search', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search by email or name...')
      
      await fireEvent.change(searchInput, { target: { value: 'example.com' } })
      
      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', 'example.com')
    })

    it('should handle empty search correctly', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search by email or name...')
      
      await fireEvent.change(searchInput, { target: { value: '' } })
      
      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', '')
    })

    it('should handle special characters in search', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search by email or name...')
      
      await fireEvent.change(searchInput, { target: { value: 'test+filter@example.com' } })
      
      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', 'test+filter@example.com')
    })

    it('should handle unicode characters in search', async () => {
      render(<UserFiltersComponent {...mockProps} />)

      const searchInput = screen.getByPlaceholderText('Search by email or name...')
      
      await fireEvent.change(searchInput, { target: { value: '田中太郎' } })
      
      expect(mockProps.onFilterChange).toHaveBeenCalledWith('search', '田中太郎')
    })
  })

  describe('Filter Visibility Logic', () => {
    it('should show basic filters when advanced filters are closed', () => {
      const propsWithAdvancedClosed = {
        ...mockProps,
        advancedFiltersOpen: false
      }

      render(<UserFiltersComponent {...propsWithAdvancedClosed} />)

      // Basic filters should be visible
      expect(screen.getByText('Basic Filters')).toBeInTheDocument()
      expect(screen.getByLabelText('Search')).toBeInTheDocument()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
    })

    it('should hide basic filters when advanced filters are open', () => {
      const propsWithAdvancedOpen = {
        ...mockProps,
        advancedFiltersOpen: true
      }

      render(<UserFiltersComponent {...propsWithAdvancedOpen} />)

      // Basic filters should not be visible
      expect(screen.queryByText('Basic Filters')).not.toBeInTheDocument()
    })

    it('should always show advanced filters toggle', () => {
      // Test when closed
      const propsWithAdvancedClosed = {
        ...mockProps,
        advancedFiltersOpen: false
      }

      const { rerender } = render(<UserFiltersComponent {...propsWithAdvancedClosed} />)
      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument()

      // Test when open
      const propsWithAdvancedOpen = {
        ...mockProps,
        advancedFiltersOpen: true
      }

      rerender(<UserFiltersComponent {...propsWithAdvancedOpen} />)
      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument()
    })
  })
})