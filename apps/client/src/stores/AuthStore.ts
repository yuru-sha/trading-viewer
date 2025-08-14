// Auth state management store using Zustand pattern

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { authService } from '../services/AuthService'
import type { User, LoginCredentials, RegisterData, UpdateProfileData, ChangePasswordData } from '../contexts/AuthContext'

export interface AuthState {
  // State
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: UpdateProfileData) => Promise<void>
  changePassword: (data: ChangePasswordData) => Promise<void>
  deleteAccount: () => Promise<void>
  checkAuthStatus: () => Promise<void>
  clearError: () => void
  reset: () => void
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
}

export const useAuthStore = create<AuthState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authService.login(credentials)
          
          // Ensure CSRF token is available
          await authService.ensureCSRFToken()
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          
          // User data is now persisted via httpOnly cookies on the server
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          })
          throw error
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authService.register(data)
          
          // Ensure CSRF token is available
          await authService.ensureCSRFToken()
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          
          // User data is now persisted via httpOnly cookies on the server
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        
        try {
          await authService.logout()
        } catch (error) {
          console.warn('Logout API call failed:', error)
        } finally {
          // Always clear local state regardless of API call result
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      updateProfile: async (data: UpdateProfileData) => {
        const currentUser = get().user
        if (!currentUser) {
          throw new Error('No authenticated user')
        }

        set({ isLoading: true, error: null })
        
        try {
          const updatedUser = await authService.updateProfile(data)
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          })
          
          // User state is now managed via server session
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Profile update failed',
          })
          throw error
        }
      },

      changePassword: async (data: ChangePasswordData) => {
        set({ isLoading: true, error: null })
        
        try {
          await authService.changePassword(data)
          
          // Password change forces logout
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Password change failed',
          })
          throw error
        }
      },

      deleteAccount: async () => {
        set({ isLoading: true, error: null })
        
        try {
          await authService.deleteAccount()
          
          // Account deletion forces logout
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Account deletion failed',
          })
          throw error
        }
      },

      checkAuthStatus: async () => {
        set({ isLoading: true })
        
        try {
          const { isAuthenticated, user } = await authService.checkAuthStatus()
          
          if (isAuthenticated && user) {
            // Ensure CSRF token is available
            await authService.ensureCSRFToken()
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
            
            // User authenticated via httpOnly cookies
          } else {
            // Clear any stale data
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            })
          }
        } catch (error) {
          // Clear any stale data on error
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      reset: () => {
        set(initialState)
      },
    })),
    {
      name: 'auth-store',
    }
  )
)

// Initialize auth state on app startup
export const initializeAuth = async () => {
  const { checkAuthStatus } = useAuthStore.getState()
  
  // Directly verify with server - auth state is managed via httpOnly cookies
  await checkAuthStatus()
}

// Subscribe to auth changes for analytics/logging
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated, prevIsAuthenticated) => {
    if (isAuthenticated !== prevIsAuthenticated) {
      console.log(`Auth state changed: ${prevIsAuthenticated} -> ${isAuthenticated}`)
      
      // Could integrate with analytics here
      // analytics.track('auth_state_changed', { isAuthenticated })
    }
  }
)