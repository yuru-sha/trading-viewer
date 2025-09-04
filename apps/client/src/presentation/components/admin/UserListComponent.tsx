import React from 'react'

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

interface Pagination {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface UserListComponentProps {
  users: User[]
  loading: boolean
  pagination: Pagination
  selectedUsers: string[]
  actionLoading: string | null
  currentUserId: string | undefined
  onUserSelect: (userId: string) => void
  onSelectAll: () => void
  onUserAction: (
    userId: string,
    action: 'activate' | 'deactivate' | 'makeAdmin' | 'makeUser' | 'unlock'
  ) => void
  onViewDetails: (userId: string) => void
  onViewActivity: (userId: string) => void
  onViewSecurity: (userId: string) => void
  onViewPermissions: (userId: string) => void
  onDeleteUser: (user: User) => void
  onPageChange: (page: number) => void
  formatDate: (dateString: string) => string
  isUserLocked: (user: User) => boolean
}

const UserListComponent: React.FC<UserListComponentProps> = ({
  users,
  loading,
  pagination,
  selectedUsers,
  actionLoading,
  currentUserId,
  onUserSelect,
  onSelectAll,
  onUserAction,
  onViewDetails,
  onViewActivity,
  onViewSecurity,
  onViewPermissions,
  onDeleteUser,
  onPageChange,
  formatDate,
  isUserLocked,
}) => {
  return (
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
                    type='checkbox'
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={onSelectAll}
                    className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
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
                      type='checkbox'
                      checked={selectedUsers.includes(userData.id)}
                      onChange={() => onUserSelect(userData.id)}
                      className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
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
                          {userData.name || userData.email}
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
                        onClick={() => onViewDetails(userData.id)}
                        className='px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800'
                      >
                        View
                      </button>

                      {/* Activity */}
                      <button
                        onClick={() => onViewActivity(userData.id)}
                        className='px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800'
                      >
                        Activity
                      </button>

                      {/* Security */}
                      <button
                        onClick={() => onViewSecurity(userData.id)}
                        className='px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:hover:bg-orange-800'
                      >
                        Security
                      </button>

                      {/* Permissions */}
                      <button
                        onClick={() => onViewPermissions(userData.id)}
                        className='px-2 py-1 rounded text-xs font-medium bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900 dark:text-teal-200 dark:hover:bg-teal-800'
                      >
                        Permissions
                      </button>

                      {/* Status Toggle */}
                      {userData.id !== currentUserId && (
                        <button
                          onClick={() =>
                            onUserAction(userData.id, userData.isActive ? 'deactivate' : 'activate')
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
                      {userData.id !== currentUserId && (
                        <button
                          onClick={() => onDeleteUser(userData)}
                          className='px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                        >
                          Delete
                        </button>
                      )}

                      {/* Unlock */}
                      {isUserLocked(userData) && (
                        <button
                          onClick={() => onUserAction(userData.id, 'unlock')}
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
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className='px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            >
              Previous
            </button>
            <span className='px-3 py-1 text-gray-700 dark:text-gray-300'>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className='px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserListComponent
