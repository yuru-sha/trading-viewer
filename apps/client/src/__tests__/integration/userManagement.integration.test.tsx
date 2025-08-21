import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from '../test-utils'
import { QueryClient } from '@tanstack/react-query'

// Mock the user management page components
const MockUserManagementPage = () => {
  const [filters, setFilters] = React.useState({
    search: '',
    role: '',
    status: '',
  })
  const [users, setUsers] = React.useState([
    {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin' as const,
      isEmailVerified: true,
      isActive: true,
      failedLoginCount: 0,
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
      lastLoginAt: undefined,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-16T00:00:00Z',
    },
  ])
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    // Simulate API call
    setLoading(true)
    setTimeout(() => {
      let filteredUsers = [
        {
          id: '1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin' as const,
          isEmailVerified: true,
          isActive: true,
          failedLoginCount: 0,
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
          lastLoginAt: undefined,
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-16T00:00:00Z',
        },
      ]

      // Apply filters
      if (value) {
        if (key === 'search') {
          filteredUsers = filteredUsers.filter(
            user =>
              user.email.toLowerCase().includes(value.toLowerCase()) ||
              (user.name && user.name.toLowerCase().includes(value.toLowerCase()))
          )
        } else if (key === 'role') {
          filteredUsers = filteredUsers.filter(user => user.role === value)
        } else if (key === 'status') {
          filteredUsers = filteredUsers.filter(user =>
            value === 'active' ? user.isActive : !user.isActive
          )
        }
      }

      setUsers(filteredUsers)
      setLoading(false)
    }, 100)
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    setSelectedUsers(prev => (prev.length === users.length ? [] : users.map(user => user.id)))
  }

  const filteredUsersDisplay = React.useMemo(() => {
    let result = users
    if (filters.search) {
      result = result.filter(
        user =>
          user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
          (user.name && user.name.toLowerCase().includes(filters.search.toLowerCase()))
      )
    }
    if (filters.role) {
      result = result.filter(user => user.role === filters.role)
    }
    if (filters.status) {
      result = result.filter(user => (filters.status === 'active' ? user.isActive : !user.isActive))
    }
    return result
  }, [users, filters])

  return (
    <div data-testid='user-management-page' className='p-6'>
      <h1 className='text-2xl font-bold mb-6'>User Management</h1>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6'>
        <h2 className='text-lg font-semibold mb-4'>Filters</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <label htmlFor='search-filter' className='block text-sm font-medium mb-1'>
              Search
            </label>
            <input
              id='search-filter'
              type='text'
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              placeholder='Search by email or name...'
              className='w-full px-3 py-2 border border-gray-300 rounded-md'
            />
          </div>
          <div>
            <label htmlFor='role-filter' className='block text-sm font-medium mb-1'>
              Role
            </label>
            <select
              id='role-filter'
              value={filters.role}
              onChange={e => handleFilterChange('role', e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md'
            >
              <option value=''>All Roles</option>
              <option value='admin'>Admin</option>
              <option value='user'>User</option>
            </select>
          </div>
          <div>
            <label htmlFor='status-filter' className='block text-sm font-medium mb-1'>
              Status
            </label>
            <select
              id='status-filter'
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md'
            >
              <option value=''>All Status</option>
              <option value='active'>Active</option>
              <option value='inactive'>Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden'>
        <div className='px-6 py-4 border-b border-gray-200'>
          <h2 className='text-lg font-semibold'>Users ({filteredUsersDisplay.length})</h2>
        </div>

        {loading ? (
          <div className='p-6 text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
            <p className='text-gray-500 mt-2'>Loading users...</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left'>
                    <input
                      type='checkbox'
                      checked={
                        selectedUsers.length === filteredUsersDisplay.length &&
                        filteredUsersDisplay.length > 0
                      }
                      onChange={handleSelectAll}
                      aria-label='Select all users'
                    />
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                    User
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                    Role
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {filteredUsersDisplay.map(user => (
                  <tr key={user.id} data-testid={`user-row-${user.id}`}>
                    <td className='px-6 py-4'>
                      <input
                        type='checkbox'
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                        aria-label={`Select user ${user.email}`}
                      />
                    </td>
                    <td className='px-6 py-4'>
                      <div>
                        <div className='text-sm font-medium text-gray-900'>
                          {user.name || 'No Name'}
                        </div>
                        <div className='text-sm text-gray-500'>{user.email}</div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <button
                        className='text-blue-600 hover:text-blue-900 text-sm'
                        data-testid={`view-user-${user.id}`}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className='mt-6 bg-blue-50 p-4 rounded-lg'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-blue-800'>{selectedUsers.length} user(s) selected</span>
            <div className='space-x-2'>
              <button
                className='bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700'
                data-testid='bulk-activate'
              >
                Activate
              </button>
              <button
                className='bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700'
                data-testid='bulk-deactivate'
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

describe('User Management Integration Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('Page Rendering', () => {
    it('should render the user management page with all components', () => {
      render(<MockUserManagementPage />, { queryClient })

      expect(screen.getByText('User Management')).toBeInTheDocument()
      expect(screen.getByText('Filters')).toBeInTheDocument()
      expect(screen.getByText('Users (3)')).toBeInTheDocument()
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should display all users initially', () => {
      render(<MockUserManagementPage />, { queryClient })

      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
      expect(screen.getByText('inactive@example.com')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter users by email search', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: 'admin' } })

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
        expect(screen.getByText('admin@example.com')).toBeInTheDocument()
        expect(screen.queryByText('user@example.com')).not.toBeInTheDocument()
      })
    })

    it('should filter users by name search', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: 'Regular' } })

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
        expect(screen.getByText('user@example.com')).toBeInTheDocument()
        expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument()
      })
    })

    it('should handle case-insensitive search', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: 'ADMIN' } })

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
        expect(screen.getByText('admin@example.com')).toBeInTheDocument()
      })
    })

    it('should show no results for non-matching search', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      await waitFor(() => {
        expect(screen.getByText('Users (0)')).toBeInTheDocument()
      })
    })

    it('should clear search results when search is cleared', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')

      // Search first
      await fireEvent.change(searchInput, { target: { value: 'admin' } })
      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
      })

      // Clear search
      await fireEvent.change(searchInput, { target: { value: '' } })
      await waitFor(() => {
        expect(screen.getByText('Users (3)')).toBeInTheDocument()
      })
    })
  })

  describe('Role Filtering', () => {
    it('should filter users by admin role', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const roleSelect = screen.getByLabelText('Role')
      await fireEvent.change(roleSelect, { target: { value: 'admin' } })

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
        expect(screen.getByText('admin@example.com')).toBeInTheDocument()
        expect(screen.queryByText('user@example.com')).not.toBeInTheDocument()
      })
    })

    it('should filter users by user role', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const roleSelect = screen.getByLabelText('Role')
      await fireEvent.change(roleSelect, { target: { value: 'user' } })

      await waitFor(() => {
        expect(screen.getByText('Users (2)')).toBeInTheDocument()
        expect(screen.getByText('user@example.com')).toBeInTheDocument()
        expect(screen.getByText('inactive@example.com')).toBeInTheDocument()
        expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument()
      })
    })

    it('should show all users when role filter is cleared', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const roleSelect = screen.getByLabelText('Role')

      // Filter first
      await fireEvent.change(roleSelect, { target: { value: 'admin' } })
      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
      })

      // Clear filter
      await fireEvent.change(roleSelect, { target: { value: '' } })
      await waitFor(() => {
        expect(screen.getByText('Users (3)')).toBeInTheDocument()
      })
    })
  })

  describe('Status Filtering', () => {
    it('should filter users by active status', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const statusSelect = screen.getByLabelText('Status')
      await fireEvent.change(statusSelect, { target: { value: 'active' } })

      await waitFor(() => {
        expect(screen.getByText('Users (2)')).toBeInTheDocument()
        expect(screen.getByText('admin@example.com')).toBeInTheDocument()
        expect(screen.getByText('user@example.com')).toBeInTheDocument()
        expect(screen.queryByText('inactive@example.com')).not.toBeInTheDocument()
      })
    })

    it('should filter users by inactive status', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const statusSelect = screen.getByLabelText('Status')
      await fireEvent.change(statusSelect, { target: { value: 'inactive' } })

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
        expect(screen.getByText('inactive@example.com')).toBeInTheDocument()
        expect(screen.queryByText('admin@example.com')).not.toBeInTheDocument()
      })
    })
  })

  describe('Combined Filtering', () => {
    it('should apply multiple filters simultaneously', async () => {
      render(<MockUserManagementPage />, { queryClient })

      // Apply role filter first
      const roleSelect = screen.getByLabelText('Role')
      await fireEvent.change(roleSelect, { target: { value: 'user' } })

      await waitFor(() => {
        expect(screen.getByText('Users (2)')).toBeInTheDocument()
      })

      // Then apply status filter
      const statusSelect = screen.getByLabelText('Status')
      await fireEvent.change(statusSelect, { target: { value: 'active' } })

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
        expect(screen.getByText('user@example.com')).toBeInTheDocument()
        expect(screen.queryByText('inactive@example.com')).not.toBeInTheDocument()
      })
    })

    it('should combine search with role filter', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')
      const roleSelect = screen.getByLabelText('Role')

      await fireEvent.change(searchInput, { target: { value: 'user' } })
      await fireEvent.change(roleSelect, { target: { value: 'user' } })

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
        expect(screen.getByText('user@example.com')).toBeInTheDocument()
      })
    })
  })

  describe('User Selection', () => {
    it('should select individual users', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const firstUserCheckbox = screen.getByLabelText('Select user admin@example.com')
      await fireEvent.click(firstUserCheckbox)

      expect(firstUserCheckbox).toBeChecked()
      expect(screen.getByText('1 user(s) selected')).toBeInTheDocument()
    })

    it('should select all users', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const selectAllCheckbox = screen.getByLabelText('Select all users')
      await fireEvent.click(selectAllCheckbox)

      expect(selectAllCheckbox).toBeChecked()
      expect(screen.getByText('3 user(s) selected')).toBeInTheDocument()
    })

    it('should deselect all users when select all is clicked again', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const selectAllCheckbox = screen.getByLabelText('Select all users')

      // Select all
      await fireEvent.click(selectAllCheckbox)
      expect(screen.getByText('3 user(s) selected')).toBeInTheDocument()

      // Deselect all
      await fireEvent.click(selectAllCheckbox)
      expect(screen.queryByText('user(s) selected')).not.toBeInTheDocument()
    })

    it('should show bulk actions when users are selected', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const firstUserCheckbox = screen.getByLabelText('Select user admin@example.com')
      await fireEvent.click(firstUserCheckbox)

      expect(screen.getByTestId('bulk-activate')).toBeInTheDocument()
      expect(screen.getByTestId('bulk-deactivate')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading spinner when filtering', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: 'test' } })

      // Should briefly show loading
      expect(screen.getByText('Loading users...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<MockUserManagementPage />, { queryClient })

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBeGreaterThan(0)

      const rows = screen.getAllByRole('row')
      expect(rows.length).toBe(4) // 1 header + 3 users
    })

    it('should have accessible form labels', () => {
      render(<MockUserManagementPage />, { queryClient })

      expect(screen.getByLabelText('Search')).toBeInTheDocument()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
    })

    it('should have accessible checkboxes', () => {
      render(<MockUserManagementPage />, { queryClient })

      expect(screen.getByLabelText('Select all users')).toBeInTheDocument()
      expect(screen.getByLabelText('Select user admin@example.com')).toBeInTheDocument()
      expect(screen.getByLabelText('Select user user@example.com')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle special characters in search gracefully', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: '!@#$%^&*()' } })

      await waitFor(() => {
        expect(screen.getByText('Users (0)')).toBeInTheDocument()
      })
    })

    it('should handle unicode characters in search', async () => {
      render(<MockUserManagementPage />, { queryClient })

      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: '田中太郎' } })

      await waitFor(() => {
        expect(screen.getByText('Users (0)')).toBeInTheDocument()
      })
    })
  })

  describe('User Experience', () => {
    it('should maintain filter state across interactions', async () => {
      render(<MockUserManagementPage />, { queryClient })

      // Set a search filter
      const searchInput = screen.getByLabelText('Search')
      await fireEvent.change(searchInput, { target: { value: 'admin' } })

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument()
      })

      // Select a user
      const userCheckbox = screen.getByLabelText('Select user admin@example.com')
      await fireEvent.click(userCheckbox)

      // Filter should still be applied
      expect(searchInput).toHaveValue('admin')
      expect(screen.getByText('Users (1)')).toBeInTheDocument()
    })

    it('should provide visual feedback for user status', () => {
      render(<MockUserManagementPage />, { queryClient })

      // Check for status badges
      const activeBadges = screen.getAllByText('Active')
      const inactiveBadges = screen.getAllByText('Inactive')
      const adminBadges = screen.getAllByText('Admin')
      const userBadges = screen.getAllByText('User')

      expect(activeBadges.length).toBe(2)
      expect(inactiveBadges.length).toBe(1)
      expect(adminBadges.length).toBe(1)
      expect(userBadges.length).toBe(2)
    })
  })
})
