import { User, UserPreferences } from '@/domain/entities/User'
import { UserRepository } from '@/domain/repositories/UserRepository'

export class UserApplicationService {
  constructor(private userRepository: UserRepository) {}

  async createUser(request: {
    id: string
    email: string
    name: string
    role: 'user' | 'admin'
    preferences?: {
      theme?: 'light' | 'dark' | 'system'
      defaultTimeframe?: string
      defaultSymbol?: string
      language?: string
    }
  }) {
    // Check if user already exists
    const existingUser = await this.userRepository.findById(request.id)
    if (existingUser) {
      throw new Error(`User with ID ${request.id} already exists`)
    }

    // Create user entity
    const user = User.create({
      id: request.id,
      email: request.email,
      name: request.name,
      role: request.role === 'admin' ? 'admin' : 'user',
      isActive: true,
    })

    // Create user preferences
    const preferences = UserPreferences.create(request.preferences || {})

    // Save user and preferences
    await this.userRepository.save(user.toPrimitive())
    await this.userRepository.savePreferences(request.id, preferences.toPrimitive())

    return {
      success: true,
      user: user.toPrimitive(),
      preferences: preferences.toPrimitive(),
    }
  }

  async getUserById(userId: string) {
    const userData = await this.userRepository.findById(userId)
    if (!userData) {
      throw new Error(`User with ID ${userId} not found`)
    }

    const user = User.fromPrimitive(userData)
    const preferencesData = await this.userRepository.getPreferences(userId)

    let preferences = null
    if (preferencesData) {
      preferences = UserPreferences.fromPrimitive(preferencesData)
    }

    return {
      user: user.toPrimitive(),
      preferences: preferences?.toPrimitive() || null,
    }
  }

  async updateUser(request: { userId: string; name?: string; isActive?: boolean }) {
    const userData = await this.userRepository.findById(request.userId)
    if (!userData) {
      throw new Error(`User with ID ${request.userId} not found`)
    }

    const user = User.fromPrimitive(userData)

    // Update user properties
    if (request.name !== undefined) {
      user.updateName(request.name)
    }

    if (request.isActive !== undefined) {
      if (request.isActive) {
        user.activate()
      } else {
        user.deactivate()
      }
    }

    await this.userRepository.save(user.toPrimitive())

    return {
      success: true,
      user: user.toPrimitive(),
    }
  }

  async updateUserPreferences(request: {
    userId: string
    preferences: {
      theme?: 'light' | 'dark' | 'system'
      defaultTimeframe?: string
      defaultSymbol?: string
      language?: string
    }
  }) {
    // Verify user exists
    const userData = await this.userRepository.findById(request.userId)
    if (!userData) {
      throw new Error(`User with ID ${request.userId} not found`)
    }

    // Get current preferences or create new ones
    const currentPreferencesData = await this.userRepository.getPreferences(request.userId)
    let preferences = currentPreferencesData
      ? UserPreferences.fromPrimitive(currentPreferencesData)
      : UserPreferences.create({})

    // Update preferences immutably
    if (request.preferences.theme) {
      preferences = preferences.withTheme(request.preferences.theme)
    }

    if (request.preferences.defaultSymbol) {
      preferences = preferences.withDefaultSymbol(request.preferences.defaultSymbol)
    }

    if (request.preferences.defaultTimeframe) {
      preferences = preferences.withDefaultTimeframe(request.preferences.defaultTimeframe)
    }

    if (request.preferences.language) {
      preferences = preferences.withLanguage(request.preferences.language)
    }

    await this.userRepository.savePreferences(request.userId, preferences.toPrimitive())

    return {
      success: true,
      preferences: preferences.toPrimitive(),
    }
  }

  async deactivateUser(userId: string) {
    const userData = await this.userRepository.findById(userId)
    if (!userData) {
      throw new Error(`User with ID ${userId} not found`)
    }

    const user = User.fromPrimitive(userData)
    user.deactivate()

    await this.userRepository.save(user.toPrimitive())

    return {
      success: true,
      user: user.toPrimitive(),
    }
  }

  async activateUser(userId: string) {
    const userData = await this.userRepository.findById(userId)
    if (!userData) {
      throw new Error(`User with ID ${userId} not found`)
    }

    const user = User.fromPrimitive(userData)
    user.activate()

    await this.userRepository.save(user.toPrimitive())

    return {
      success: true,
      user: user.toPrimitive(),
    }
  }

  async getUsersByRole(role: 'user' | 'admin') {
    const users = await this.userRepository.findByRole(role)

    return users.map(userData => {
      const user = User.fromPrimitive(userData)
      return user.toPrimitive()
    })
  }

  async getActiveUsers() {
    const users = await this.userRepository.findByStatus(true)

    return users.map(userData => {
      const user = User.fromPrimitive(userData)
      return user.toPrimitive()
    })
  }

  async validateUserPermissions(userId: string, requiredRole?: 'admin') {
    const userData = await this.userRepository.findById(userId)
    if (!userData) {
      throw new Error(`User with ID ${userId} not found`)
    }

    const user = User.fromPrimitive(userData)

    if (!user.isActive) {
      throw new Error('User account is deactivated')
    }

    if (requiredRole === 'admin' && !user.canAccessAdminFeatures()) {
      throw new Error('Insufficient permissions')
    }

    return {
      valid: true,
      user: user.toPrimitive(),
      permissions: {
        isAdmin: user.isAdmin(),
        canAccessAdmin: user.canAccessAdminFeatures(),
        isActive: user.isActive,
      },
    }
  }

  async searchUsers(
    query: string,
    filters?: {
      role?: 'user' | 'admin'
      isActive?: boolean
    }
  ) {
    const users = await this.userRepository.search(query, filters)

    return users.map(userData => {
      const user = User.fromPrimitive(userData)
      return user.toPrimitive()
    })
  }
}

export class AuthenticationApplicationService {
  constructor(private userRepository: UserRepository) {}

  async authenticateUser(request: { email: string; password: string }) {
    // This would typically involve password verification
    // For this domain model, we'll focus on the user retrieval logic

    const userData = await this.userRepository.findByEmail(request.email)
    if (!userData) {
      throw new Error('Invalid credentials')
    }

    const user = User.fromPrimitive(userData)

    if (!user.isActive) {
      throw new Error('User account is deactivated')
    }

    // In a real implementation, password verification would happen here
    // const isPasswordValid = await this.passwordService.verify(request.password, userData.hashedPassword)
    // if (!isPasswordValid) {
    //   throw new Error('Invalid credentials')
    // }

    const preferencesData = await this.userRepository.getPreferences(user.id)
    const preferences = preferencesData
      ? UserPreferences.fromPrimitive(preferencesData)
      : UserPreferences.create({})

    return {
      success: true,
      user: user.toPrimitive(),
      preferences: preferences.toPrimitive(),
      permissions: {
        isAdmin: user.isAdmin(),
        canAccessAdmin: user.canAccessAdminFeatures(),
      },
    }
  }

  async refreshUserSession(userId: string) {
    const userData = await this.userRepository.findById(userId)
    if (!userData) {
      throw new Error('User not found')
    }

    const user = User.fromPrimitive(userData)

    if (!user.isActive) {
      throw new Error('User session is invalid')
    }

    const preferencesData = await this.userRepository.getPreferences(user.id)
    const preferences = preferencesData
      ? UserPreferences.fromPrimitive(preferencesData)
      : UserPreferences.create({})

    return {
      success: true,
      user: user.toPrimitive(),
      preferences: preferences.toPrimitive(),
      permissions: {
        isAdmin: user.isAdmin(),
        canAccessAdmin: user.canAccessAdminFeatures(),
      },
    }
  }
}
