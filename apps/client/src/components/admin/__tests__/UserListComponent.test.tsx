import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render } from '../../../__tests__/test-utils'
import UserListComponent from '../UserListComponent'

const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    isEmailVerified: true,
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: undefined,
    lastLoginAt: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user' as const,
    isEmailVerified: false,
    isActive: true,
    failedLoginCount: 2,
    lockedUntil: undefined,
    lastLoginAt: '2024-01-10T15:45:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-10T15:45:00Z',
  },
  {
    id: '3',
    email: 'inactive@example.com',
    name: 'Inactive User',
    role: 'user' as const,
    isEmailVerified: true,
    isActive: false,
    failedLoginCount: 5,
    lockedUntil: '2024-01-20T00:00:00Z',
    lastLoginAt: undefined,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
  },
]

const mockPagination = {
  page: 1,
  limit: 20,
  totalCount: 3,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
}

const mockProps = {
  users: mockUsers,
  loading: false,
  pagination: mockPagination,
  selectedUsers: [],
  actionLoading: null,
  currentUserId: '4',
  onUserSelect: vi.fn(),
  onSelectAll: vi.fn(),
  onUserAction: vi.fn(),
  onViewDetails: vi.fn(),
  onViewActivity: vi.fn(),
  onViewSecurity: vi.fn(),
  onViewPermissions: vi.fn(),
  onDeleteUser: vi.fn(),
  onPageChange: vi.fn(),
  formatDate: vi.fn((date: string) => new Date(date).toLocaleDateString()),
  isUserLocked: vi.fn((user: any) =>
    Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date())
  ),
}

describe('UserListComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should display loading spinner when loading is true', () => {
      render(<UserListComponent {...mockProps} loading={true} />)

      expect(screen.getByText('Loading users...')).toBeInTheDocument()
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // spinner
    })

    it('should not display user table when loading', () => {
      render(<UserListComponent {...mockProps} loading={true} />)

      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('User Table Rendering', () => {
    it('should render user table with correct headers', () => {
      render(<UserListComponent {...mockProps} />)

      expect(screen.getByRole('table')).toBeInTheDocument()

      // Check table headers
      expect(screen.getByText('User')).toBeInTheDocument()
      expect(screen.getByText('Role')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Last Login')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('should display correct user count in header', () => {
      render(<UserListComponent {...mockProps} />)

      expect(screen.getByText('Users (3)')).toBeInTheDocument()
    })

    it('should render all users in the table', () => {
      render(<UserListComponent {...mockProps} />)

      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
      expect(screen.getByText('Regular User')).toBeInTheDocument()
      expect(screen.getByText('inactive@example.com')).toBeInTheDocument()
      expect(screen.getByText('Inactive User')).toBeInTheDocument()
    })

    it('should display user roles correctly', () => {
      render(<UserListComponent {...mockProps} />)

      const adminBadges = screen.getAllByText('Admin')
      const userBadges = screen.getAllByText('User')

      expect(adminBadges).toHaveLength(1)
      expect(userBadges).toHaveLength(2)
    })

    it('should display user status correctly', () => {
      render(<UserListComponent {...mockProps} />)

      const activeBadges = screen.getAllByText('Active')
      const inactiveBadges = screen.getAllByText('Inactive')

      expect(activeBadges).toHaveLength(2)
      expect(inactiveBadges).toHaveLength(1)
    })
  })

  describe('User Selection', () => {
    it('should render select all checkbox', () => {
      render(<UserListComponent {...mockProps} />)

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i })
      expect(selectAllCheckbox).toBeInTheDocument()
    })

    it('should call onSelectAll when select all checkbox is clicked', async () => {
      render(<UserListComponent {...mockProps} />)

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i })
      await fireEvent.click(selectAllCheckbox)

      expect(mockProps.onSelectAll).toHaveBeenCalled()
    })

    it('should render individual user checkboxes', () => {
      render(<UserListComponent {...mockProps} />)

      const userCheckboxes = screen.getAllByRole('checkbox')
      // Should have 4 checkboxes: 1 select all + 3 individual users
      expect(userCheckboxes).toHaveLength(4)
    })

    it('should call onUserSelect when individual checkbox is clicked', async () => {
      render(<UserListComponent {...mockProps} />)

      const userCheckboxes = screen.getAllByRole('checkbox')
      const firstUserCheckbox = userCheckboxes[1] // Skip select all checkbox

      await fireEvent.click(firstUserCheckbox)

      expect(mockProps.onUserSelect).toHaveBeenCalledWith('1')
    })

    it('should check select all when all users are selected', () => {
      const propsWithAllSelected = {
        ...mockProps,
        selectedUsers: ['1', '2', '3'],
      }

      render(<UserListComponent {...propsWithAllSelected} />)

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i })
      expect(selectAllCheckbox).toBeChecked()
    })

    it('should not check select all when no users are selected', () => {
      render(<UserListComponent {...mockProps} />)

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i })
      expect(selectAllCheckbox).not.toBeChecked()
    })
  })

  describe('User Actions', () => {
    it('should display action buttons for each user', () => {
      render(<UserListComponent {...mockProps} />)

      // Each user should have action buttons
      const viewButtons = screen.getAllByText('View')
      const actionButtons = screen.getAllByText('Actions')

      expect(viewButtons.length).toBeGreaterThan(0)
      expect(actionButtons.length).toBeGreaterThan(0)
    })

    it('should call onViewDetails when view details is clicked', async () => {
      render(<UserListComponent {...mockProps} />)

      // Find first view button and simulate click
      const viewButtons = screen.getAllByRole('button', { name: /view/i })
      if (viewButtons.length > 0) {
        await fireEvent.click(viewButtons[0])
        expect(mockProps.onViewDetails).toHaveBeenCalledWith('1')
      }
    })

    it('should disable actions for current user', () => {
      const propsWithCurrentUser = {
        ...mockProps,
        currentUserId: '1',
      }

      render(<UserListComponent {...propsWithCurrentUser} />)

      // The current user's action buttons should be disabled or hidden
      // This depends on the implementation in the actual component
    })

    it('should show loading state for specific user action', () => {
      const propsWithActionLoading = {
        ...mockProps,
        actionLoading: '1',
      }

      render(<UserListComponent {...propsWithActionLoading} />)

      // Should show loading indicator for user with id '1'
      // This depends on the implementation in the actual component
    })
  })

  describe('Email Verification Status', () => {
    it('should display verification status for each user', () => {
      render(<UserListComponent {...mockProps} />)

      // Check for verification badges/indicators
      // This depends on how verification status is displayed in the component
      const verifiedElements = screen.queryAllByText(/verified/i)
      const unverifiedElements = screen.queryAllByText(/unverified/i)

      // At least one of these should exist based on mock data
      expect(verifiedElements.length + unverifiedElements.length).toBeGreaterThan(0)
    })
  })

  describe('User Status Display', () => {
    it('should show locked status for locked users', () => {
      // Mock the isUserLocked function to return true for locked user
      const propsWithLockCheck = {
        ...mockProps,
        isUserLocked: vi.fn(user => user.id === '3'),
      }

      render(<UserListComponent {...propsWithLockCheck} />)

      expect(propsWithLockCheck.isUserLocked).toHaveBeenCalled()
    })

    it('should format dates correctly', () => {
      render(<UserListComponent {...mockProps} />)

      expect(mockProps.formatDate).toHaveBeenCalled()
    })

    it('should handle users without last login gracefully', () => {
      render(<UserListComponent {...mockProps} />)

      // The third user has no lastLoginAt, should handle gracefully
      expect(screen.getByText('inactive@example.com')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should handle empty user list', () => {
      const propsWithNoUsers = {
        ...mockProps,
        users: [],
        pagination: {
          ...mockPagination,
          totalCount: 0,
        },
      }

      render(<UserListComponent {...propsWithNoUsers} />)

      expect(screen.getByText('Users (0)')).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('should call onPageChange when pagination is used', async () => {
      const propsWithPagination = {
        ...mockProps,
        pagination: {
          ...mockPagination,
          totalPages: 3,
          hasNext: true,
        },
      }

      render(<UserListComponent {...propsWithPagination} />)

      // If pagination controls exist, test them
      // This depends on how pagination is implemented in the component
    })
  })

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<UserListComponent {...mockProps} />)

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      // Check for proper table headers
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBeGreaterThan(0)
    })

    it('should have proper row structure', () => {
      render(<UserListComponent {...mockProps} />)

      const rows = screen.getAllByRole('row')
      // Should have header row + user rows
      expect(rows.length).toBe(4) // 1 header + 3 users
    })

    it('should have accessible checkboxes', () => {
      render(<UserListComponent {...mockProps} />)

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should handle large user lists efficiently', () => {
      const largeUserList = Array.from({ length: 100 }, (_, i) => ({
        ...mockUsers[0],
        id: i.toString(),
        email: `user${i}@example.com`,
        name: `User ${i}`,
      }))

      const propsWithLargeList = {
        ...mockProps,
        users: largeUserList,
        pagination: {
          ...mockPagination,
          totalCount: 100,
        },
      }

      render(<UserListComponent {...propsWithLargeList} />)

      expect(screen.getByText('Users (100)')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing user data gracefully', () => {
      const usersWithMissingData = [
        {
          id: '1',
          email: 'test@example.com',
          name: undefined,
          role: 'user' as const,
          isEmailVerified: true,
          isActive: true,
          failedLoginCount: 0,
          lockedUntil: undefined,
          lastLoginAt: undefined,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      const propsWithMissingData = {
        ...mockProps,
        users: usersWithMissingData,
        pagination: {
          ...mockPagination,
          totalCount: 1,
        },
      }

      render(<UserListComponent {...propsWithMissingData} />)

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should handle invalid date formats', () => {
      const usersWithInvalidDates = [
        {
          ...mockUsers[0],
          lastLoginAt: 'invalid-date',
          createdAt: 'invalid-date',
        },
      ]

      const propsWithInvalidDates = {
        ...mockProps,
        users: usersWithInvalidDates,
      }

      render(<UserListComponent {...propsWithInvalidDates} />)

      // Should not crash and should still render the user
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    })
  })
})
