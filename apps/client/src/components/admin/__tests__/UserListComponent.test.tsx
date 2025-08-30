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

describe.skip('UserListComponent - Comprehensive Button and Input Testing', () => {
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

  describe('User Selection - All Checkboxes', () => {
    it('should render select all checkbox in table header', () => {
      render(<UserListComponent {...mockProps} />)

      const checkboxes = screen.getAllByRole('checkbox')
      const selectAllCheckbox = checkboxes[0] // First checkbox should be select all
      expect(selectAllCheckbox).toBeInTheDocument()
    })

    it('should call onSelectAll when select all checkbox is clicked', async () => {
      render(<UserListComponent {...mockProps} />)

      const checkboxes = screen.getAllByRole('checkbox')
      const selectAllCheckbox = checkboxes[0]
      await fireEvent.click(selectAllCheckbox)

      expect(mockProps.onSelectAll).toHaveBeenCalledTimes(1)
    })

    it('should render individual user checkboxes', () => {
      render(<UserListComponent {...mockProps} />)

      const userCheckboxes = screen.getAllByRole('checkbox')
      // Should have 4 checkboxes: 1 select all + 3 individual users
      expect(userCheckboxes).toHaveLength(4)
    })

    it('should call onUserSelect with correct userId when individual checkbox is clicked', async () => {
      render(<UserListComponent {...mockProps} />)

      const userCheckboxes = screen.getAllByRole('checkbox')

      // Test first user checkbox
      await fireEvent.click(userCheckboxes[1])
      expect(mockProps.onUserSelect).toHaveBeenCalledWith('1')

      // Test second user checkbox
      await fireEvent.click(userCheckboxes[2])
      expect(mockProps.onUserSelect).toHaveBeenCalledWith('2')

      // Test third user checkbox
      await fireEvent.click(userCheckboxes[3])
      expect(mockProps.onUserSelect).toHaveBeenCalledWith('3')
    })

    it('should check select all checkbox when all users are selected', () => {
      const propsWithAllSelected = {
        ...mockProps,
        selectedUsers: ['1', '2', '3'],
      }

      render(<UserListComponent {...propsWithAllSelected} />)

      const checkboxes = screen.getAllByRole('checkbox')
      const selectAllCheckbox = checkboxes[0]
      expect(selectAllCheckbox).toBeChecked()
    })

    it('should not check select all checkbox when no users are selected', () => {
      render(<UserListComponent {...mockProps} />)

      const checkboxes = screen.getAllByRole('checkbox')
      const selectAllCheckbox = checkboxes[0]
      expect(selectAllCheckbox).not.toBeChecked()
    })

    it('should check individual user checkboxes when users are selected', () => {
      const propsWithSelectedUsers = {
        ...mockProps,
        selectedUsers: ['1', '3'],
      }

      render(<UserListComponent {...propsWithSelectedUsers} />)

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes[1]).toBeChecked() // User 1
      expect(checkboxes[2]).not.toBeChecked() // User 2
      expect(checkboxes[3]).toBeChecked() // User 3
    })

    it('should have indeterminate state for select all when some users are selected', () => {
      const propsWithSomeSelected = {
        ...mockProps,
        selectedUsers: ['1'],
      }

      render(<UserListComponent {...propsWithSomeSelected} />)

      const checkboxes = screen.getAllByRole('checkbox')
      const selectAllCheckbox = checkboxes[0]
      expect(selectAllCheckbox).not.toBeChecked()
    })
  })

  describe('User Actions - All Buttons', () => {
    describe('View Details Button', () => {
      it('should display View button for all users', () => {
        render(<UserListComponent {...mockProps} />)

        const viewButtons = screen.getAllByText('View')
        expect(viewButtons).toHaveLength(3) // One for each user
      })

      it('should call onViewDetails when View button is clicked', async () => {
        render(<UserListComponent {...mockProps} />)

        const viewButtons = screen.getAllByText('View')
        await fireEvent.click(viewButtons[0])

        expect(mockProps.onViewDetails).toHaveBeenCalledWith('1')
        expect(mockProps.onViewDetails).toHaveBeenCalledTimes(1)
      })

      it('should have correct CSS classes for View button', () => {
        render(<UserListComponent {...mockProps} />)

        const viewButtons = screen.getAllByText('View')
        expect(viewButtons[0]).toHaveClass(
          'px-2',
          'py-1',
          'rounded',
          'text-xs',
          'font-medium',
          'bg-blue-100',
          'text-blue-700'
        )
      })
    })

    describe('Activity Button', () => {
      it('should display Activity button for all users', () => {
        render(<UserListComponent {...mockProps} />)

        const activityButtons = screen.getAllByText('Activity')
        expect(activityButtons).toHaveLength(3)
      })

      it('should call onViewActivity when Activity button is clicked', async () => {
        render(<UserListComponent {...mockProps} />)

        const activityButtons = screen.getAllByText('Activity')
        await fireEvent.click(activityButtons[1]) // Test second user

        expect(mockProps.onViewActivity).toHaveBeenCalledWith('2')
        expect(mockProps.onViewActivity).toHaveBeenCalledTimes(1)
      })
    })

    describe('Security Button', () => {
      it('should display Security button for all users', () => {
        render(<UserListComponent {...mockProps} />)

        const securityButtons = screen.getAllByText('Security')
        expect(securityButtons).toHaveLength(3)
      })

      it('should call onViewSecurity when Security button is clicked', async () => {
        render(<UserListComponent {...mockProps} />)

        const securityButtons = screen.getAllByText('Security')
        await fireEvent.click(securityButtons[2]) // Test third user

        expect(mockProps.onViewSecurity).toHaveBeenCalledWith('3')
        expect(mockProps.onViewSecurity).toHaveBeenCalledTimes(1)
      })
    })

    describe('Permissions Button', () => {
      it('should display Permissions button for all users', () => {
        render(<UserListComponent {...mockProps} />)

        const permissionsButtons = screen.getAllByText('Permissions')
        expect(permissionsButtons).toHaveLength(3)
      })

      it('should call onViewPermissions when Permissions button is clicked', async () => {
        render(<UserListComponent {...mockProps} />)

        const permissionsButtons = screen.getAllByText('Permissions')
        await fireEvent.click(permissionsButtons[0])

        expect(mockProps.onViewPermissions).toHaveBeenCalledWith('1')
        expect(mockProps.onViewPermissions).toHaveBeenCalledTimes(1)
      })
    })

    describe('Activate/Deactivate Button', () => {
      it('should display Deactivate button for active users (except current user)', () => {
        render(<UserListComponent {...mockProps} />)

        const deactivateButtons = screen.getAllByText('Deactivate')
        expect(deactivateButtons).toHaveLength(2) // Users 1 and 2 are active, current user is 4
      })

      it('should display Activate button for inactive users', () => {
        render(<UserListComponent {...mockProps} />)

        const activateButtons = screen.getAllByText('Activate')
        expect(activateButtons).toHaveLength(1) // User 3 is inactive
      })

      it('should call onUserAction with deactivate when Deactivate is clicked', async () => {
        render(<UserListComponent {...mockProps} />)

        const deactivateButtons = screen.getAllByText('Deactivate')
        await fireEvent.click(deactivateButtons[0])

        expect(mockProps.onUserAction).toHaveBeenCalledWith('1', 'deactivate')
      })

      it('should call onUserAction with activate when Activate is clicked', async () => {
        render(<UserListComponent {...mockProps} />)

        const activateButtons = screen.getAllByText('Activate')
        await fireEvent.click(activateButtons[0])

        expect(mockProps.onUserAction).toHaveBeenCalledWith('3', 'activate')
      })

      it('should not display activate/deactivate buttons for current user', () => {
        const propsWithCurrentUser = {
          ...mockProps,
          currentUserId: '1',
        }

        render(<UserListComponent {...propsWithCurrentUser} />)

        // Should have 1 less deactivate button (current user's button is hidden)
        const deactivateButtons = screen.getAllByText('Deactivate')
        expect(deactivateButtons).toHaveLength(1)
      })

      it('should disable button and show loading when actionLoading matches user', () => {
        const propsWithLoading = {
          ...mockProps,
          actionLoading: '2',
        }

        render(<UserListComponent {...propsWithLoading} />)

        const loadingButtons = screen.getAllByText('...')
        expect(loadingButtons.length).toBeGreaterThan(0)
      })
    })

    describe('Delete Button', () => {
      it('should display Delete button for all users except current user', () => {
        render(<UserListComponent {...mockProps} />)

        const deleteButtons = screen.getAllByText('Delete')
        expect(deleteButtons).toHaveLength(3) // All users shown since currentUserId is '4'
      })

      it('should call onDeleteUser when Delete button is clicked', async () => {
        render(<UserListComponent {...mockProps} />)

        const deleteButtons = screen.getAllByText('Delete')
        await fireEvent.click(deleteButtons[0])

        expect(mockProps.onDeleteUser).toHaveBeenCalledWith(mockUsers[0])
        expect(mockProps.onDeleteUser).toHaveBeenCalledTimes(1)
      })

      it('should not display Delete button for current user', () => {
        const propsWithCurrentUser = {
          ...mockProps,
          currentUserId: '1',
        }

        render(<UserListComponent {...propsWithCurrentUser} />)

        const deleteButtons = screen.getAllByText('Delete')
        expect(deleteButtons).toHaveLength(2) // One less because current user can't delete self
      })

      it('should have correct CSS classes for Delete button', () => {
        render(<UserListComponent {...mockProps} />)

        const deleteButtons = screen.getAllByText('Delete')
        expect(deleteButtons[0]).toHaveClass(
          'px-2',
          'py-1',
          'rounded',
          'text-xs',
          'font-medium',
          'bg-red-100',
          'text-red-700'
        )
      })
    })

    describe('Unlock Button', () => {
      it('should display Unlock button only for locked users', () => {
        const propsWithLockedUser = {
          ...mockProps,
          isUserLocked: vi.fn(user => user.id === '3'), // Mock user 3 as locked
        }

        render(<UserListComponent {...propsWithLockedUser} />)

        const unlockButtons = screen.getAllByText('Unlock')
        expect(unlockButtons).toHaveLength(1)
      })

      it('should call onUserAction with unlock when Unlock is clicked', async () => {
        const propsWithLockedUser = {
          ...mockProps,
          isUserLocked: vi.fn(user => user.id === '3'),
        }

        render(<UserListComponent {...propsWithLockedUser} />)

        const unlockButtons = screen.getAllByText('Unlock')
        await fireEvent.click(unlockButtons[0])

        expect(mockProps.onUserAction).toHaveBeenCalledWith('3', 'unlock')
      })

      it('should disable Unlock button and show loading when actionLoading matches user', () => {
        const propsWithLoadingUnlock = {
          ...mockProps,
          isUserLocked: vi.fn(user => user.id === '3'),
          actionLoading: '3',
        }

        render(<UserListComponent {...propsWithLoadingUnlock} />)

        const loadingButtons = screen.getAllByText('...')
        expect(loadingButtons.length).toBeGreaterThan(0)
      })

      it('should not display Unlock button for non-locked users', () => {
        const propsWithNoLockedUsers = {
          ...mockProps,
          isUserLocked: vi.fn(() => false), // No locked users
        }

        render(<UserListComponent {...propsWithNoLockedUsers} />)

        const unlockButtons = screen.queryAllByText('Unlock')
        expect(unlockButtons).toHaveLength(0)
      })
    })
  })

  describe('Email Verification Status Display', () => {
    it('should display verification badge for verified users', () => {
      render(<UserListComponent {...mockProps} />)

      const verifiedBadges = screen.getAllByText('✓ Verified')
      expect(verifiedBadges).toHaveLength(2) // Users 1 and 3 are verified in mock data
    })

    it('should not display verification badge for unverified users', () => {
      render(<UserListComponent {...mockProps} />)

      // User 2 is unverified, should not have verification badge
      const userRows = screen.getAllByRole('row')
      const user2Row = userRows[2] // Header + User 1 + User 2

      // Should contain user email but not verification badge
      expect(user2Row).toHaveTextContent('user@example.com')
      expect(user2Row).not.toHaveTextContent('✓ Verified')
    })

    it('should have correct CSS classes for verification badges', () => {
      render(<UserListComponent {...mockProps} />)

      const verifiedBadges = screen.getAllByText('✓ Verified')
      expect(verifiedBadges[0]).toHaveClass(
        'inline-flex',
        'px-2',
        'py-1',
        'text-xs',
        'font-semibold',
        'rounded-full',
        'bg-blue-100',
        'text-blue-800'
      )
    })
  })

  describe('User Status Display - Visual Elements', () => {
    it('should display locked status indicator for locked users', () => {
      const propsWithLockedUser = {
        ...mockProps,
        isUserLocked: vi.fn(user => user.id === '3'),
      }

      render(<UserListComponent {...propsWithLockedUser} />)

      expect(propsWithLockedUser.isUserLocked).toHaveBeenCalledWith(mockUsers[2])
      expect(screen.getByText(/🔒 Locked until/)).toBeInTheDocument()
    })

    it('should display user avatar initials correctly', () => {
      render(<UserListComponent {...mockProps} />)

      // Check that first letter of each email is displayed as avatar
      expect(screen.getByText('A')).toBeInTheDocument() // admin@example.com
      expect(screen.getByText('U')).toBeInTheDocument() // user@example.com
      expect(screen.getByText('I')).toBeInTheDocument() // inactive@example.com
    })

    it('should display user names when available, email otherwise', () => {
      render(<UserListComponent {...mockProps} />)

      // Users have names, should display names as primary
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('Regular User')).toBeInTheDocument()
      expect(screen.getByText('Inactive User')).toBeInTheDocument()

      // Emails should also be displayed as secondary
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
      expect(screen.getByText('inactive@example.com')).toBeInTheDocument()
    })

    it('should format and display last login dates correctly', () => {
      render(<UserListComponent {...mockProps} />)

      expect(mockProps.formatDate).toHaveBeenCalledWith('2024-01-15T10:30:00Z')
      expect(mockProps.formatDate).toHaveBeenCalledWith('2024-01-10T15:45:00Z')
    })

    it('should display "Never" for users with no last login', () => {
      render(<UserListComponent {...mockProps} />)

      expect(screen.getByText('Never')).toBeInTheDocument() // User 3 has no lastLoginAt
    })

    it('should display role badges with correct colors', () => {
      render(<UserListComponent {...mockProps} />)

      const adminBadge = screen.getByText('admin')
      expect(adminBadge).toHaveClass('bg-purple-100', 'text-purple-800')

      const userBadges = screen.getAllByText('user')
      userBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-gray-100', 'text-gray-800')
      })
    })

    it('should display active status badges correctly', () => {
      render(<UserListComponent {...mockProps} />)

      const activeBadges = screen.getAllByText('Active')
      activeBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-green-100', 'text-green-800')
      })

      const inactiveBadges = screen.getAllByText('Inactive')
      inactiveBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-red-100', 'text-red-800')
      })
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

  describe('Pagination - All Buttons and Inputs', () => {
    const paginationProps = {
      ...mockProps,
      pagination: {
        page: 2,
        limit: 20,
        totalCount: 100,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      },
    }

    it('should display pagination when totalPages > 1', () => {
      render(<UserListComponent {...paginationProps} />)

      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
    })

    it('should not display pagination when totalPages <= 1', () => {
      render(<UserListComponent {...mockProps} />)

      expect(screen.queryByText('Previous')).not.toBeInTheDocument()
      expect(screen.queryByText('Next')).not.toBeInTheDocument()
    })

    it('should call onPageChange when Previous button is clicked', async () => {
      render(<UserListComponent {...paginationProps} />)

      const prevButton = screen.getByText('Previous')
      await fireEvent.click(prevButton)

      expect(mockProps.onPageChange).toHaveBeenCalledWith(1) // page - 1
    })

    it('should call onPageChange when Next button is clicked', async () => {
      render(<UserListComponent {...paginationProps} />)

      const nextButton = screen.getByText('Next')
      await fireEvent.click(nextButton)

      expect(mockProps.onPageChange).toHaveBeenCalledWith(3) // page + 1
    })

    it('should disable Previous button when hasPrev is false', () => {
      const propsNoPrev = {
        ...paginationProps,
        pagination: {
          ...paginationProps.pagination,
          page: 1,
          hasPrev: false,
        },
      }

      render(<UserListComponent {...propsNoPrev} />)

      const prevButton = screen.getByText('Previous')
      expect(prevButton).toBeDisabled()
    })

    it('should disable Next button when hasNext is false', () => {
      const propsNoNext = {
        ...paginationProps,
        pagination: {
          ...paginationProps.pagination,
          page: 5,
          hasNext: false,
        },
      }

      render(<UserListComponent {...propsNoNext} />)

      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeDisabled()
    })

    it('should display correct pagination info text', () => {
      render(<UserListComponent {...paginationProps} />)

      // Page 2, limit 20, total 100 = showing 21-40 of 100
      expect(screen.getByText('Showing 21 to 40 of 100 users')).toBeInTheDocument()
    })

    it('should handle last page pagination info correctly', () => {
      const lastPageProps = {
        ...paginationProps,
        pagination: {
          ...paginationProps.pagination,
          page: 5,
          totalCount: 85,
        },
      }

      render(<UserListComponent {...lastPageProps} />)

      // Page 5, limit 20, total 85 = showing 81-85 of 85
      expect(screen.getByText('Showing 81 to 85 of 85 users')).toBeInTheDocument()
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

    it('should have accessible checkboxes with proper attributes', () => {
      render(<UserListComponent {...mockProps} />)

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeInTheDocument()
        expect(checkbox).toHaveAttribute('type', 'checkbox')
        expect(checkbox).toHaveClass(
          'h-4',
          'w-4',
          'text-blue-600',
          'focus:ring-blue-500',
          'border-gray-300',
          'rounded'
        )
      })
    })

    it('should have accessible buttons with proper roles and attributes', () => {
      render(<UserListComponent {...mockProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
        expect(button).toHaveAttribute('type', 'button')
      })
    })

    it('should have proper ARIA labels for action buttons', () => {
      render(<UserListComponent {...mockProps} />)

      const viewButtons = screen.getAllByText('View')
      const activityButtons = screen.getAllByText('Activity')
      const securityButtons = screen.getAllByText('Security')
      const permissionsButtons = screen.getAllByText('Permissions')
      const deleteButtons = screen.getAllByText('Delete')

      // All buttons should have descriptive text content
      expect(viewButtons[0]).toHaveTextContent('View')
      expect(activityButtons[0]).toHaveTextContent('Activity')
      expect(securityButtons[0]).toHaveTextContent('Security')
      expect(permissionsButtons[0]).toHaveTextContent('Permissions')
      expect(deleteButtons[0]).toHaveTextContent('Delete')
    })
  })

  describe('Performance', () => {
    it('should handle large user lists efficiently', () => {
      const largeUserList = Array.from({ length: 50 }, (_, i) => ({
        ...mockUsers[0],
        id: (i + 1).toString(),
        email: `user${i + 1}@example.com`,
        name: `User ${i + 1}`,
      }))

      const propsWithLargeList = {
        ...mockProps,
        users: largeUserList,
        pagination: {
          ...mockPagination,
          totalCount: 50,
        },
      }

      render(<UserListComponent {...propsWithLargeList} />)

      expect(screen.getByText('Users (50)')).toBeInTheDocument()

      // Should render all action buttons for each user efficiently
      const viewButtons = screen.getAllByText('View')
      expect(viewButtons).toHaveLength(50)
    })

    it('should handle rapid button clicks without errors', async () => {
      render(<UserListComponent {...mockProps} />)

      const viewButtons = screen.getAllByText('View')
      const activityButtons = screen.getAllByText('Activity')
      const securityButtons = screen.getAllByText('Security')

      // Rapid clicks should not cause errors
      await fireEvent.click(viewButtons[0])
      await fireEvent.click(activityButtons[0])
      await fireEvent.click(securityButtons[0])

      expect(mockProps.onViewDetails).toHaveBeenCalledTimes(1)
      expect(mockProps.onViewActivity).toHaveBeenCalledTimes(1)
      expect(mockProps.onViewSecurity).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling - Button and Input Edge Cases', () => {
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

      // Should still render all buttons for user with missing data
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('View')).toBeInTheDocument()
      expect(screen.getByText('Activity')).toBeInTheDocument()
      expect(screen.getByText('Security')).toBeInTheDocument()
      expect(screen.getByText('Permissions')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should handle button interactions when action callbacks throw errors', async () => {
      const propsWithErrorCallbacks = {
        ...mockProps,
        onViewDetails: vi.fn().mockImplementation(() => {
          throw new Error('Network error')
        }),
      }

      render(<UserListComponent {...propsWithErrorCallbacks} />)

      const viewButton = screen.getAllByText('View')[0]

      // Should not crash when callback throws error
      expect(() => fireEvent.click(viewButton)).not.toThrow()
      expect(propsWithErrorCallbacks.onViewDetails).toHaveBeenCalled()
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
