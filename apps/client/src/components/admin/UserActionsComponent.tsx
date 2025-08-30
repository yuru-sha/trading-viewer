import React from 'react'
import { Button } from '@trading-viewer/ui'
import Icon from '../Icon'

interface UserStats {
  totalUsers: number
  verifiedUsers: number
  unverifiedUsers: number
  adminUsers: number
  regularUsers: number
  activeUsers: number
  inactiveUsers: number
}

interface UserActionsComponentProps {
  stats: UserStats | null
  onCreateUser: () => void
  onImportExport: () => void
}

const UserActionsComponent: React.FC<UserActionsComponentProps> = ({
  stats,
  onCreateUser,
  onImportExport,
}) => {
  return (
    <>
      {/* Header Actions */}
      <div className='flex items-center justify-between mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>User Management</h1>
        <div className='flex items-center space-x-3'>
          <Button onClick={onCreateUser} className='bg-green-600 hover:bg-green-700'>
            <Icon name='add' className='w-4 h-4 mr-2' />
            Create User
          </Button>
          <Button onClick={onImportExport} variant='secondary'>
            Import/Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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
    </>
  )
}

export default UserActionsComponent
