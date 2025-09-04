import type {
  User,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  ChangePasswordData,
} from '@/presentation/context/AuthContext'

export interface AuthResponse {
  user: User
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

export interface IAuthService {
  // Authentication operations
  login(credentials: LoginCredentials): Promise<AuthResponse>
  register(data: RegisterData): Promise<AuthResponse>
  logout(): Promise<void>
  refreshTokens(): Promise<AuthResponse>

  // User profile operations
  getCurrentUser(): Promise<User>
  updateProfile(data: UpdateProfileData): Promise<User>
  changePassword(data: ChangePasswordData): Promise<void>
  deleteAccount(): Promise<void>

  // CSRF token management
  getCSRFToken(): Promise<string>
  ensureCSRFToken(): Promise<void>

  // Utility methods
  checkAuthStatus(): Promise<{ isAuthenticated: boolean; user?: User }>

  // Admin operations
  getAuthStats(): Promise<{
    totalUsers: number
    verifiedUsers: number
    unverifiedUsers: number
    adminUsers: number
    regularUsers: number
  }>

  // Development helpers
  seedTestUsers(): Promise<{ totalUsers: number }>
  getTestUsers(): Promise<{ users: User[] }>
}
