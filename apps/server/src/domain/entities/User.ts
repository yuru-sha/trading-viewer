export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name?: string,
    public readonly avatar?: string,
    public readonly role: string = 'user',
    public readonly isEmailVerified: boolean = false,
    public readonly failedLoginAttempts: number = 0,
    public readonly lockedUntil?: Date,
    public readonly lastLoginAt?: Date,
    public readonly isActive: boolean = true,
    public readonly resetToken?: string,
    public readonly resetTokenExpiresAt?: Date,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(
    id: string,
    email: string,
    passwordHash: string,
    name?: string,
    role: string = 'user'
  ): User {
    return new User(
      id,
      email,
      passwordHash,
      name,
      undefined,
      role,
      false,
      0,
      undefined,
      undefined,
      true,
      undefined,
      undefined,
      new Date(),
      new Date()
    )
  }

  updatePassword(newPasswordHash: string): User {
    return new User(
      this.id,
      this.email,
      newPasswordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      this.failedLoginAttempts,
      this.lockedUntil,
      this.lastLoginAt,
      this.isActive,
      this.resetToken,
      this.resetTokenExpiresAt,
      this.createdAt,
      new Date()
    )
  }

  incrementFailedLogins(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      this.failedLoginAttempts + 1,
      this.lockedUntil,
      this.lastLoginAt,
      this.isActive,
      this.resetToken,
      this.resetTokenExpiresAt,
      this.createdAt,
      new Date()
    )
  }

  resetFailedLogins(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      0,
      this.lockedUntil,
      this.lastLoginAt,
      this.isActive,
      this.resetToken,
      this.resetTokenExpiresAt,
      this.createdAt,
      new Date()
    )
  }

  lockAccount(until: Date): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      this.failedLoginAttempts,
      until,
      this.lastLoginAt,
      this.isActive,
      this.resetToken,
      this.resetTokenExpiresAt,
      this.createdAt,
      new Date()
    )
  }

  unlockAccount(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      0,
      undefined,
      this.lastLoginAt,
      this.isActive,
      this.resetToken,
      this.resetTokenExpiresAt,
      this.createdAt,
      new Date()
    )
  }

  setResetToken(token: string, expiresAt: Date): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      this.failedLoginAttempts,
      this.lockedUntil,
      this.lastLoginAt,
      this.isActive,
      token,
      expiresAt,
      this.createdAt,
      new Date()
    )
  }

  clearResetToken(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      this.failedLoginAttempts,
      this.lockedUntil,
      this.lastLoginAt,
      this.isActive,
      undefined,
      undefined,
      this.createdAt,
      new Date()
    )
  }

  updateLastLogin(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      this.failedLoginAttempts,
      this.lockedUntil,
      new Date(),
      this.isActive,
      this.resetToken,
      this.resetTokenExpiresAt,
      this.createdAt,
      new Date()
    )
  }

  deactivate(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      this.failedLoginAttempts,
      this.lockedUntil,
      this.lastLoginAt,
      false,
      this.resetToken,
      this.resetTokenExpiresAt,
      this.createdAt,
      new Date()
    )
  }

  activate(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.name,
      this.avatar,
      this.role,
      this.isEmailVerified,
      this.failedLoginAttempts,
      this.lockedUntil,
      this.lastLoginAt,
      true,
      this.resetToken,
      this.resetTokenExpiresAt,
      this.createdAt,
      new Date()
    )
  }

  isAdmin(): boolean {
    return this.role === 'admin'
  }

  canAccessAdminFeatures(): boolean {
    return this.isActive && this.isAdmin()
  }

  isAccountLocked(): boolean {
    return this.lockedUntil !== undefined && this.lockedUntil > new Date()
  }

  isResetTokenValid(): boolean {
    return (
      this.resetToken !== undefined &&
      this.resetTokenExpiresAt !== undefined &&
      this.resetTokenExpiresAt > new Date()
    )
  }

  // Convert to shared package User type format
  toApiFormat() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      createdAt: this.createdAt.getTime(),
      updatedAt: this.updatedAt.getTime(),
      isActive: this.isActive,
      role: this.role as 'user' | 'admin',
    }
  }
}
