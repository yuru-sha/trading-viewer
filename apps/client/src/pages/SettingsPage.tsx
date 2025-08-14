import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useError } from '../contexts/ErrorContext'

interface PasswordChangeForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface ProfileForm {
  firstName: string
  lastName: string
}

const SettingsPage: React.FC = () => {
  const { user, changePassword, updateProfile } = useAuth()
  const { showError, showSuccess } = useError()
  
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
  })
  
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match')
      return
    }
    
    if (passwordForm.newPassword.length < 8) {
      showError('New password must be at least 8 characters long')
      return
    }
    
    setIsChangingPassword(true)
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      showSuccess('Password changed successfully. Please log in again.')
      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      console.error('Password change failed:', error)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsUpdatingProfile(true)
    try {
      await updateProfile({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
      })
      showSuccess('Profile updated successfully')
    } catch (error) {
      console.error('Profile update failed:', error)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Profile Information
              </h2>
              
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your first name"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your last name"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Password Change */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Change Password
              </h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new password (min. 8 characters)"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm new password"
                  />
                  {passwordForm.newPassword && passwordForm.confirmPassword && 
                   passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isChangingPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-md shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    You will be logged out after changing your password
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Account Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Role:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100 capitalize">
                  {user?.role}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email Verified:</span>
                <span className={`ml-2 ${user?.isEmailVerified ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {user?.isEmailVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Account Created:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">User ID:</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-mono text-xs">
                  {user?.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}

export default SettingsPage