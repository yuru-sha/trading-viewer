export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name?: string,
    public readonly avatar?: string,
    public readonly role: string = 'user',
    public readonly isEmailVerified: boolean = false,
    public readonly failedLoginCount: number = 0,
    public readonly lockedUntil?: Date,
    public readonly lastLoginAt?: Date,
    public readonly isActive: boolean = true,
    public readonly resetToken?: string,
    public readonly resetTokenExpiry?: Date,
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
      this.failedLoginCount,
      this.lockedUntil,
      this.lastLoginAt,
      this.isActive,
      this.resetToken,
      this.resetTokenExpiry,
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
      this.failedLoginCount,
      this.lockedUntil,
      this.lastLoginAt,
      false,
      this.resetToken,
      this.resetTokenExpiry,
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
      this.failedLoginCount,
      this.lockedUntil,
      this.lastLoginAt,
      true,
      this.resetToken,
      this.resetTokenExpiry,
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
}
