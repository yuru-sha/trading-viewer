import React from 'react'
import UserDetailModal from './UserDetailModal'
import CreateUserModal from './CreateUserModal'
import DeleteUserModal from './DeleteUserModal'
import UserActivityModal from './UserActivityModal'
import SecurityManagementModal from './SecurityManagementModal'
import JSONImportExportModal from './JSONImportExportModal'
import UserPermissionsModal from './UserPermissionsModal'

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

interface ModalStates {
  userDetailModal: {
    isOpen: boolean
    userId: string | null
  }
  createUserModal: boolean
  deleteUserModal: {
    isOpen: boolean
    user: User | null
  }
  userActivityModal: {
    isOpen: boolean
    userId: string | null
  }
  securityModal: {
    isOpen: boolean
    userId: string | null
  }
  jsonModal: boolean
  permissionsModal: {
    isOpen: boolean
    userId: string | null
  }
}

interface UserModalComponentProps {
  modalStates: ModalStates
  onCloseUserDetail: () => void
  onCloseCreateUser: () => void
  onCloseDeleteUser: () => void
  onCloseUserActivity: () => void
  onCloseSecurity: () => void
  onCloseJson: () => void
  onClosePermissions: () => void
  onRefreshData: () => void
}

const UserModalComponent: React.FC<UserModalComponentProps> = ({
  modalStates,
  onCloseUserDetail,
  onCloseCreateUser,
  onCloseDeleteUser,
  onCloseUserActivity,
  onCloseSecurity,
  onCloseJson,
  onClosePermissions,
  onRefreshData,
}) => {
  return (
    <>
      <UserDetailModal
        isOpen={modalStates.userDetailModal.isOpen}
        onClose={onCloseUserDetail}
        userId={modalStates.userDetailModal.userId}
        onUserUpdate={onRefreshData}
      />

      <CreateUserModal
        isOpen={modalStates.createUserModal}
        onClose={onCloseCreateUser}
        onUserCreated={onRefreshData}
      />

      <DeleteUserModal
        isOpen={modalStates.deleteUserModal.isOpen}
        onClose={onCloseDeleteUser}
        user={modalStates.deleteUserModal.user}
        onUserDeleted={onRefreshData}
      />

      <UserActivityModal
        isOpen={modalStates.userActivityModal.isOpen}
        onClose={onCloseUserActivity}
        userId={modalStates.userActivityModal.userId}
      />

      <SecurityManagementModal
        isOpen={modalStates.securityModal.isOpen}
        onClose={onCloseSecurity}
        userId={modalStates.securityModal.userId}
      />

      <JSONImportExportModal
        isOpen={modalStates.jsonModal}
        onClose={onCloseJson}
        onImportComplete={onRefreshData}
      />

      <UserPermissionsModal
        isOpen={modalStates.permissionsModal.isOpen}
        onClose={onClosePermissions}
        userId={modalStates.permissionsModal.userId}
      />
    </>
  )
}

export default UserModalComponent
