import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Button, Input, Loading } from '@trading-viewer/ui'
import { useError } from '@/presentation/context/ErrorContext'
import { apiService } from '@/infrastructure/api/ApiService'
import { log } from '@/infrastructure/services/LoggerService'

interface UserPermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
  isSystem: boolean
}

interface UserGroup {
  id: string
  name: string
  description: string
  permissions: Permission[]
  userCount: number
  isDefault: boolean
  createdAt: string
}

interface UserPermissions {
  directPermissions: Permission[]
  groupPermissions: Permission[]
  effectivePermissions: Permission[]
  groups: UserGroup[]
}

interface NewGroupData {
  name: string
  description: string
  permissions: string[]
}

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({ isOpen, onClose, userId }) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'groups' | 'create-group'>(
    'permissions'
  )
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [allGroups, setAllGroups] = useState<UserGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [newGroup, setNewGroup] = useState<NewGroupData>({
    name: '',
    description: '',
    permissions: [],
  })
  const { showError, showSuccess } = useError()

  const tabs = [
    { id: 'permissions', label: 'User Permissions', icon: '🔑' },
    { id: 'groups', label: 'User Groups', icon: '👥' },
    { id: 'create-group', label: 'Create Group', icon: '➕' },
  ]

  const permissionCategories = [
    'User Management',
    'Content Management',
    'System Administration',
    'Analytics',
    'Settings',
    'API Access',
  ]

  const fetchUserPermissions = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const response = await apiService.get<{ success: boolean; data: UserPermissions }>(
        `/auth/users/${userId}/permissions`
      )

      if (response.success) {
        setUserPermissions(response.data)
        setSelectedPermissions(new Set(response.data.directPermissions.map(p => p.id)))
        setSelectedGroups(new Set(response.data.groups.map(g => g.id)))
      }
    } catch (error) {
      log.auth.error('Failed to fetch user permissions', error, {
        operation: 'fetch_user_permissions',
        userId,
      })
      showError('Failed to load user permissions')
    } finally {
      setLoading(false)
    }
  }, [showError, userId])

  const fetchAllPermissions = useCallback(async () => {
    try {
      const response = await apiService.get<{ success: boolean; data: Permission[] }>(
        '/auth/permissions'
      )
      if (response.success) {
        setAllPermissions(response.data)
      }
    } catch (error) {
      log.auth.error('Failed to fetch permissions', error, {
        operation: 'fetch_all_permissions',
      })
    }
  }, [])

  const fetchAllGroups = useCallback(async () => {
    try {
      const response = await apiService.get<{ success: boolean; data: UserGroup[] }>('/auth/groups')
      if (response.success) {
        setAllGroups(response.data)
      }
    } catch (error) {
      log.auth.error('Failed to fetch groups', error, {
        operation: 'fetch_all_groups',
      })
    }
  }, [])

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserPermissions()
      fetchAllPermissions()
      fetchAllGroups()
    }
  }, [isOpen, userId, fetchUserPermissions, fetchAllPermissions, fetchAllGroups])

  const handleSavePermissions = async () => {
    if (!userId) return

    try {
      setSaving(true)
      await apiService.put(`/auth/users/${userId}/permissions`, {
        permissionIds: Array.from(selectedPermissions),
        groupIds: Array.from(selectedGroups),
      })

      showSuccess('User permissions updated successfully')
      fetchUserPermissions()
    } catch (error) {
      log.auth.error('Failed to update permissions', error, {
        operation: 'update_user_permissions',
        userId,
        permissionCount: selectedPermissions.size,
        groupCount: selectedGroups.size,
      })
      showError('Failed to update user permissions')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      showError('Group name is required')
      return
    }

    try {
      setSaving(true)
      const response = await apiService.post<{ success: boolean; data: UserGroup }>(
        '/auth/groups',
        newGroup
      )

      if (response.success) {
        showSuccess('Group created successfully')
        setAllGroups(prev => [...prev, response.data])
        setNewGroup({ name: '', description: '', permissions: [] })
        setActiveTab('groups')
      }
    } catch (error: unknown) {
      log.auth.error('Failed to create group', error, {
        operation: 'create_user_group',
        groupName: newGroup.name,
        permissionCount: newGroup.permissions.length,
      })
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
      ) {
        showError(error.response.data.message)
      } else {
        showError('Failed to create group')
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId)
      } else {
        newSet.add(permissionId)
      }
      return newSet
    })
  }

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const handleNewGroupPermissionToggle = (permissionId: string) => {
    setNewGroup(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId],
    }))
  }

  const getPermissionsByCategory = (permissions: Permission[], category: string) => {
    return permissions.filter(p => p.category === category)
  }

  const isPermissionEffective = (permissionId: string) => {
    return userPermissions?.effectivePermissions.some(p => p.id === permissionId) || false
  }

  const getPermissionSource = (permissionId: string) => {
    const isDirect = userPermissions?.directPermissions.some(p => p.id === permissionId)
    const fromGroups = userPermissions?.groupPermissions.filter(p => p.id === permissionId)

    if (isDirect && fromGroups?.length) {
      return 'Direct + Groups'
    } else if (isDirect) {
      return 'Direct'
    } else if (fromGroups?.length) {
      return `Groups (${fromGroups.length})`
    }
    return ''
  }

  const renderPermissionsTab = () => (
    <div className='space-y-6'>
      {/* Direct Permissions */}
      <div>
        <div className='flex items-center justify-between mb-4'>
          <h4 className='text-md font-medium text-gray-900 dark:text-white'>Direct Permissions</h4>
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              {selectedPermissions.size} selected
            </span>
            <Button onClick={handleSavePermissions} disabled={saving} size='sm'>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className='space-y-4'>
          {permissionCategories.map(category => {
            const categoryPermissions = getPermissionsByCategory(allPermissions, category)
            if (categoryPermissions.length === 0) return null

            return (
              <div
                key={category}
                className='border border-gray-200 dark:border-gray-700 rounded-lg'
              >
                <div className='px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
                  <h5 className='text-sm font-medium text-gray-900 dark:text-white'>{category}</h5>
                </div>
                <div className='p-4 space-y-3'>
                  {categoryPermissions.map(permission => (
                    <div key={permission.id} className='flex items-start space-x-3'>
                      <input
                        type='checkbox'
                        id={`perm-${permission.id}`}
                        checked={selectedPermissions.has(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        disabled={permission.isSystem}
                        className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                      />
                      <div className='flex-1 min-w-0'>
                        <label
                          htmlFor={`perm-${permission.id}`}
                          className='text-sm font-medium text-gray-900 dark:text-white cursor-pointer'
                        >
                          {permission.name}
                          {permission.isSystem && (
                            <span className='ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'>
                              System
                            </span>
                          )}
                        </label>
                        <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                          {permission.description}
                        </p>
                        {isPermissionEffective(permission.id) && (
                          <div className='flex items-center space-x-2 mt-1'>
                            <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                              Active
                            </span>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                              Source: {getPermissionSource(permission.id)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderGroupsTab = () => (
    <div className='space-y-6'>
      {/* User Groups */}
      <div>
        <div className='flex items-center justify-between mb-4'>
          <h4 className='text-md font-medium text-gray-900 dark:text-white'>User Groups</h4>
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              {selectedGroups.size} groups assigned
            </span>
            <Button onClick={handleSavePermissions} disabled={saving} size='sm'>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className='space-y-3'>
          {allGroups.map(group => (
            <div
              key={group.id}
              className='border border-gray-200 dark:border-gray-700 rounded-lg p-4'
            >
              <div className='flex items-start space-x-3'>
                <input
                  type='checkbox'
                  id={`group-${group.id}`}
                  checked={selectedGroups.has(group.id)}
                  onChange={() => handleGroupToggle(group.id)}
                  className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                />
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center space-x-2'>
                    <label
                      htmlFor={`group-${group.id}`}
                      className='text-sm font-medium text-gray-900 dark:text-white cursor-pointer'
                    >
                      {group.name}
                    </label>
                    {group.isDefault && (
                      <span className='inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                        Default
                      </span>
                    )}
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {group.userCount} users
                    </span>
                  </div>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                    {group.description}
                  </p>
                  <div className='mt-2'>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                      Permissions ({group.permissions.length}):
                    </p>
                    <div className='flex flex-wrap gap-1'>
                      {group.permissions.slice(0, 5).map(permission => (
                        <span
                          key={permission.id}
                          className='inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        >
                          {permission.name}
                        </span>
                      ))}
                      {group.permissions.length > 5 && (
                        <span className='inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'>
                          +{group.permissions.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderCreateGroupTab = () => (
    <div className='space-y-6'>
      {/* Group Details */}
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-white mb-4'>Create New Group</h4>
        <div className='space-y-4'>
          <div>
            <label
              htmlFor='group-name'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Group Name *
            </label>
            <Input
              id='group-name'
              value={newGroup.name}
              onChange={e => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
              placeholder='Enter group name'
            />
          </div>
          <div>
            <label
              htmlFor='group-description'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Description
            </label>
            <Input
              id='group-description'
              value={newGroup.description}
              onChange={e => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
              placeholder='Enter group description'
            />
          </div>
        </div>
      </div>

      {/* Group Permissions */}
      <div>
        <h4 className='text-md font-medium text-gray-900 dark:text-white mb-4'>
          Group Permissions ({newGroup.permissions.length} selected)
        </h4>
        <div className='space-y-4'>
          {permissionCategories.map(category => {
            const categoryPermissions = getPermissionsByCategory(allPermissions, category)
            if (categoryPermissions.length === 0) return null

            return (
              <div
                key={category}
                className='border border-gray-200 dark:border-gray-700 rounded-lg'
              >
                <div className='px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
                  <h5 className='text-sm font-medium text-gray-900 dark:text-white'>{category}</h5>
                </div>
                <div className='p-4 space-y-3'>
                  {categoryPermissions.map(permission => (
                    <div key={permission.id} className='flex items-start space-x-3'>
                      <input
                        type='checkbox'
                        id={`new-perm-${permission.id}`}
                        checked={newGroup.permissions.includes(permission.id)}
                        onChange={() => handleNewGroupPermissionToggle(permission.id)}
                        disabled={permission.isSystem}
                        className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                      />
                      <div className='flex-1 min-w-0'>
                        <label
                          htmlFor={`new-perm-${permission.id}`}
                          className='text-sm font-medium text-gray-900 dark:text-white cursor-pointer'
                        >
                          {permission.name}
                          {permission.isSystem && (
                            <span className='ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'>
                              System
                            </span>
                          )}
                        </label>
                        <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create Button */}
      <div className='flex justify-end'>
        <Button onClick={handleCreateGroup} disabled={saving || !newGroup.name.trim()}>
          {saving ? 'Creating...' : 'Create Group'}
        </Button>
      </div>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title='User Permissions & Groups'>
      <div className='max-w-4xl'>
        {/* Tabs */}
        <div className='border-b border-gray-200 dark:border-gray-700 mb-6'>
          <nav className='-mb-px flex space-x-8'>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'permissions' | 'groups' | 'create-group')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className='max-h-96 overflow-y-auto'>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Loading />
              <span className='ml-2'>Loading permissions...</span>
            </div>
          ) : (
            <div>
              {activeTab === 'permissions' && renderPermissionsTab()}
              {activeTab === 'groups' && renderGroupsTab()}
              {activeTab === 'create-group' && renderCreateGroupTab()}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default UserPermissionsModal
