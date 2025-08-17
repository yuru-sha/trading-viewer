import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useError } from '../contexts/ErrorContext'
import { apiService } from '../services/base/ApiService'
import BulkUserActions from '../components/admin/BulkUserActions'
import UserActionsComponent from '../components/admin/UserActionsComponent'
import UserFiltersComponent from '../components/admin/UserFiltersComponent'
import UserListComponent from '../components/admin/UserListComponent'
import UserModalComponent from '../components/admin/UserModalComponent'
import { UserFilters } from '../components/admin/AdvancedUserFilters'

interface User {
  id: string
  email: string
  name?: string
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
  const [modalStates, setModalStates] = useState({
    userDetailModal: {
      isOpen: false,
      userId: null as string | null,
    },
    createUserModal: false,
    deleteUserModal: {
      isOpen: false,
      user: null as User | null,
    },
    userActivityModal: {
      isOpen: false,
      userId: null as string | null,
    },
    securityModal: {
      isOpen: false,
      userId: null as string | null,
    },
    jsonModal: false,
    permissionsModal: {
      isOpen: false,
      userId: null as string | null,
    },
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
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
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

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  // Modal handlers
  const handleViewDetails = (userId: string) => {
    setModalStates(prev => ({
      ...prev,
      userDetailModal: { isOpen: true, userId },
    }))
  }

  const handleViewActivity = (userId: string) => {
    setModalStates(prev => ({
      ...prev,
      userActivityModal: { isOpen: true, userId },
    }))
  }

  const handleViewSecurity = (userId: string) => {
    setModalStates(prev => ({
      ...prev,
      securityModal: { isOpen: true, userId },
    }))
  }

  const handleViewPermissions = (userId: string) => {
    setModalStates(prev => ({
      ...prev,
      permissionsModal: { isOpen: true, userId },
    }))
  }

  const handleDeleteUser = (user: User) => {
    setModalStates(prev => ({
      ...prev,
      deleteUserModal: { isOpen: true, user },
    }))
  }

  const handleCreateUser = () => {
    setModalStates(prev => ({
      ...prev,
      createUserModal: true,
    }))
  }

  const handleImportExport = () => {
    setModalStates(prev => ({
      ...prev,
      jsonModal: true,
    }))
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-7xl mx-auto'>
        <UserActionsComponent
          stats={stats}
          onCreateUser={handleCreateUser}
          onImportExport={handleImportExport}
        />

        <BulkUserActions
          selectedUsers={selectedUsers}
          onClearSelection={handleClearSelection}
          onRefresh={refreshData}
        />

        <UserFiltersComponent
          filters={filters}
          advancedFiltersOpen={advancedFiltersOpen}
          onFilterChange={handleFilterChange}
          onToggleAdvancedFilters={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
          onApplyAdvancedFilters={handleApplyAdvancedFilters}
          onClearAdvancedFilters={handleClearAdvancedFilters}
        />

        <UserListComponent
          users={users}
          loading={loading}
          pagination={pagination}
          selectedUsers={selectedUsers}
          actionLoading={actionLoading}
          currentUserId={user?.id}
          onUserSelect={handleUserSelect}
          onSelectAll={handleSelectAll}
          onUserAction={handleUserAction}
          onViewDetails={handleViewDetails}
          onViewActivity={handleViewActivity}
          onViewSecurity={handleViewSecurity}
          onViewPermissions={handleViewPermissions}
          onDeleteUser={handleDeleteUser}
          onPageChange={handlePageChange}
          formatDate={formatDate}
          isUserLocked={isUserLocked}
        />

        <UserModalComponent
          modalStates={modalStates}
          onCloseUserDetail={() =>
            setModalStates(prev => ({
              ...prev,
              userDetailModal: { isOpen: false, userId: null },
            }))
          }
          onCloseCreateUser={() =>
            setModalStates(prev => ({
              ...prev,
              createUserModal: false,
            }))
          }
          onCloseDeleteUser={() =>
            setModalStates(prev => ({
              ...prev,
              deleteUserModal: { isOpen: false, user: null },
            }))
          }
          onCloseUserActivity={() =>
            setModalStates(prev => ({
              ...prev,
              userActivityModal: { isOpen: false, userId: null },
            }))
          }
          onCloseSecurity={() =>
            setModalStates(prev => ({
              ...prev,
              securityModal: { isOpen: false, userId: null },
            }))
          }
          onCloseJson={() =>
            setModalStates(prev => ({
              ...prev,
              jsonModal: false,
            }))
          }
          onClosePermissions={() =>
            setModalStates(prev => ({
              ...prev,
              permissionsModal: { isOpen: false, userId: null },
            }))
          }
          onRefreshData={refreshData}
        />
      </div>
    </div>
  )
}

export default AdminUsersPage
