import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useError } from '../contexts/ErrorContext'
import { apiService } from '../services/base/ApiService'
import { Button } from '@trading-viewer/ui'
import Icon from '../components/Icon'
import UserDetailModal from '../components/admin/UserDetailModal'
import CreateUserModal from '../components/admin/CreateUserModal'
import DeleteUserModal from '../components/admin/DeleteUserModal'
import BulkUserActions from '../components/admin/BulkUserActions'
import UserActivityModal from '../components/admin/UserActivityModal'
import SecurityManagementModal from '../components/admin/SecurityManagementModal'
import CSVImportExportModal from '../components/admin/CSVImportExportModal'
import UserPermissionsModal from '../components/admin/UserPermissionsModal'
import AdvancedUserFilters, { UserFilters } from '../components/admin/AdvancedUserFilters'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'admin' | 'user'
  isEmailVerified: boolean
  isActive: boolean
  failedLoginCount: number
  lockedUntil?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

interface UserStats {
  totalUsers: number
  verifiedUsers: number
  unverifiedUsers: number
  adminUsers: number
  regularUsers: number
  activeUsers: number
  inactiveUsers: number
}

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

const AdminUsersPage: React.FC = () => {
  const { user } = useAuth()
  const { showError, showSuccess } = useError()

  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })

  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
  })

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<UserFilters | null>(null)

  // Modal states
  const [userDetailModal, setUserDetailModal] = useState<{ isOpen: boolean; userId: string | null }>({
    isOpen: false,
    userId: null,
  })
  const [createUserModal, setCreateUserModal] = useState(false)
  const [deleteUserModal, setDeleteUserModal] = useState<{ isOpen: boolean; user: any | null }>({
    isOpen: false,
    user: null,
  })
  const [userActivityModal, setUserActivityModal] = useState<{ isOpen: boolean; userId: string | null }>({
    isOpen: false,
    userId: null,
  })
  const [securityModal, setSecurityModal] = useState<{ isOpen: boolean; userId: string | null }>({
    isOpen: false,
    userId: null,
  })
  const [csvModal, setCsvModal] = useState(false)
  const [permissionsModal, setPermissionsModal] = useState<{ isOpen: boolean; userId: string | null }>({
    isOpen: false,
    userId: null,
  })

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>Access Denied</h1>
          <p className='text-gray-600 dark:text-gray-300'>
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    )
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
      })

      // Add advanced filters if they exist
      if (advancedFilters) {
        Object.entries(advancedFilters).forEach(([key, value]) => {
          if (value && value !== '') {
            if (key === 'failedLoginCount' && value.value !== null) {
              queryParams.append('failedLoginCount', `${value.operator}:${value.value}`)
            } else if (typeof value === 'string') {
              queryParams.append(key, value)
            }
          }
        })
      }

      const response = await apiService.get<{ success: boolean; data: UsersResponse }>(
        `/auth/users?${queryParams}`
      )

      if (response.success) {
        setUsers(response.data.users)
        setPagination(response.data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      showError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiService.get<{ success: boolean; data: UserStats }>('/auth/stats')
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [pagination.page, filters, advancedFilters])

  const handleUserAction = async (
    userId: string,
    action: 'activate' | 'deactivate' | 'makeAdmin' | 'makeUser' | 'unlock'
  ) => {
    if (actionLoading) return

    setActionLoading(userId)
    try {
      let endpoint: string
      let data: any

      switch (action) {
        case 'activate':
          endpoint = `/auth/users/${userId}/status`
          data = { isActive: true }
          break
        case 'deactivate':
          endpoint = `/auth/users/${userId}/status`
          data = { isActive: false }
          break
        case 'makeAdmin':
          endpoint = `/auth/users/${userId}/role`
          data = { role: 'admin' }
          break
        case 'makeUser':
          endpoint = `/auth/users/${userId}/role`
          data = { role: 'user' }
          break
        case 'unlock':
          endpoint = `/auth/users/${userId}/unlock`
          data = {}
          break
      }

      if (action === 'unlock') {
        await apiService.post(endpoint)
      } else {
        await apiService.put(endpoint, data)
      }

      showSuccess(`User ${action}d successfully`)
      fetchUsers()
      fetchStats()
    } catch (error) {
      console.error(`Failed to ${action} user:`, error)
      showError(`Failed to ${action} user`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isUserLocked = (user: User) => {
    return user.lockedUntil && new Date(user.lockedUntil) > new Date()
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u.id))
    }
  }

  const handleClearSelection = () => {
    setSelectedUsers([])
  }

  const handleApplyAdvancedFilters = (filters: UserFilters) => {
    setAdvancedFilters(filters)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleClearAdvancedFilters = () => {
    setAdvancedFilters(null)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const refreshData = () => {
    fetchUsers()
    fetchStats()
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-7xl mx-auto'>
        <div className="flex items-center justify-between mb-8">
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>User Management</h1>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setCreateUserModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Icon name='add' className='w-4 h-4 mr-2' />
              Create User
            </Button>
            <Button
              onClick={() => setCsvModal(true)}
              variant="secondary"
            >
              Import/Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
            <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md'>
              <div className='text-2xl font-bold text-blue-600'>{stats.totalUsers}</div>
              <div className='text-sm text-gray-500'>Total Users</div>
            </div>
            <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md'>
              <div className='text-2xl font-bold text-green-600'>{stats.activeUsers}</div>
              <div className='text-sm text-gray-500'>Active Users</div>
            </div>
            <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md'>
              <div className='text-2xl font-bold text-purple-600'>{stats.adminUsers}</div>
              <div className='text-sm text-gray-500'>Administrators</div>
            </div>
            <div className='bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md'>
              <div className='text-2xl font-bold text-orange-600'>{stats.verifiedUsers}</div>
              <div className='text-sm text-gray-500'>Verified Email</div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        <BulkUserActions
          selectedUsers={selectedUsers}
          onClearSelection={handleClearSelection}
          onRefresh={refreshData}
        />

        {/* Advanced Filters */}
        <AdvancedUserFilters
          onApplyFilters={handleApplyAdvancedFilters}
          onClearFilters={handleClearAdvancedFilters}
          isOpen={advancedFiltersOpen}
          onToggle={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
        />

        {/* Basic Filters */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>Basic Filters</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Search
              </label>
              <input
                type='text'
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                placeholder='Search by email or name...'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Role
              </label>
              <select
                value={filters.role}
                onChange={e => handleFilterChange('role', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              >
                <option value=''>All Roles</option>
                <option value='admin'>Admin</option>
                <option value='user'>User</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Status
              </label>
              <select
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              >
                <option value=''>All Status</option>
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden'>
          <div className='px-6 py-4 border-b border-gray-200 dark:border-gray-700'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
              Users ({pagination.totalCount})
            </h2>
          </div>

          {loading ? (
            <div className='p-6 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
              <p className='text-gray-500 mt-2'>Loading users...</p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      User
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      Role
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      Last Login
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700'>
                  {users.map(userData => (
                    <tr key={userData.id} className='hover:bg-gray-50 dark:hover:bg-gray-700'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(userData.id)}
                          onChange={() => handleUserSelect(userData.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='flex-shrink-0 h-10 w-10'>
                            <div className='h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center'>
                              <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                                {userData.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {userData.firstName && userData.lastName
                                ? `${userData.firstName} ${userData.lastName}`
                                : userData.email}
                            </div>
                            <div className='text-sm text-gray-500 dark:text-gray-400'>
                              {userData.email}
                            </div>
                            {isUserLocked(userData) && (
                              <div className='text-xs text-red-600 dark:text-red-400'>
                                🔒 Locked until {formatDate(userData.lockedUntil!)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            userData.role === 'admin'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {userData.role}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center space-x-2'>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userData.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {userData.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {userData.isEmailVerified && (
                            <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                        {userData.lastLoginAt ? formatDate(userData.lastLoginAt) : 'Never'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                        <div className='flex flex-wrap gap-1'>
                          {/* View Details */}
                          <button
                            onClick={() => setUserDetailModal({ isOpen: true, userId: userData.id })}
                            className='px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800'
                          >
                            View
                          </button>

                          {/* Activity */}
                          <button
                            onClick={() => setUserActivityModal({ isOpen: true, userId: userData.id })}
                            className='px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800'
                          >
                            Activity
                          </button>

                          {/* Security */}
                          <button
                            onClick={() => setSecurityModal({ isOpen: true, userId: userData.id })}
                            className='px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800'
                          >
                            Security
                          </button>

                          {/* Permissions */}
                          <button
                            onClick={() => setPermissionsModal({ isOpen: true, userId: userData.id })}
                            className='px-2 py-1 rounded text-xs font-medium bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-200 dark:hover:bg-teal-800'
                          >
                            Permissions
                          </button>

                          {/* Status Toggle */}
                          {userData.id !== user?.id && (
                            <button
                              onClick={() =>
                                handleUserAction(
                                  userData.id,
                                  userData.isActive ? 'deactivate' : 'activate'
                                )
                              }
                              disabled={actionLoading === userData.id}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                userData.isActive
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                              }`}
                            >
                              {actionLoading === userData.id
                                ? '...'
                                : userData.isActive
                                  ? 'Deactivate'
                                  : 'Activate'}
                            </button>
                          )}

                          {/* Delete */}
                          {userData.id !== user?.id && (
                            <button
                              onClick={() => setDeleteUserModal({ isOpen: true, user: userData })}
                              className='px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                            >
                              Delete
                            </button>
                          )}

                          {/* Unlock */}
                          {isUserLocked(userData) && (
                            <button
                              onClick={() => handleUserAction(userData.id, 'unlock')}
                              disabled={actionLoading === userData.id}
                              className='px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800'
                            >
                              {actionLoading === userData.id ? '...' : 'Unlock'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className='px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between'>
              <div className='text-sm text-gray-500 dark:text-gray-400'>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} users
              </div>
              <div className='flex space-x-2'>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev}
                  className='px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                >
                  Previous
                </button>
                <span className='px-3 py-1 text-gray-700 dark:text-gray-300'>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                  className='px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* All Modals */}
        <UserDetailModal
          isOpen={userDetailModal.isOpen}
          onClose={() => setUserDetailModal({ isOpen: false, userId: null })}
          userId={userDetailModal.userId}
          onUserUpdate={refreshData}
        />

        <CreateUserModal
          isOpen={createUserModal}
          onClose={() => setCreateUserModal(false)}
          onUserCreated={refreshData}
        />

        <DeleteUserModal
          isOpen={deleteUserModal.isOpen}
          onClose={() => setDeleteUserModal({ isOpen: false, user: null })}
          user={deleteUserModal.user}
          onUserDeleted={refreshData}
        />

        <UserActivityModal
          isOpen={userActivityModal.isOpen}
          onClose={() => setUserActivityModal({ isOpen: false, userId: null })}
          userId={userActivityModal.userId}
        />

        <SecurityManagementModal
          isOpen={securityModal.isOpen}
          onClose={() => setSecurityModal({ isOpen: false, userId: null })}
          userId={securityModal.userId}
        />

        <CSVImportExportModal
          isOpen={csvModal}
          onClose={() => setCsvModal(false)}
          onImportComplete={refreshData}
        />

        <UserPermissionsModal
          isOpen={permissionsModal.isOpen}
          onClose={() => setPermissionsModal({ isOpen: false, userId: null })}
          userId={permissionsModal.userId}
        />

      </div>
    </div>
  )
}

export default AdminUsersPage
