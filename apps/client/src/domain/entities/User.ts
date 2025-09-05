export class User {
  private constructor(
    private readonly _id: string,
    private readonly _email: string,
    private _name: string,
    private readonly _role: UserRole,
    private _isActive: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  static create(data: {
    id: string
    email: string
    name: string
    role: UserRole
    isActive?: boolean
  }): User {
    const now = new Date()
    return new User(data.id, data.email, data.name, data.role, data.isActive ?? true, now, now)
  }

  static fromPrimitive(data: {
    id: string
    email: string
    name: string
    role: 'user' | 'admin'
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }): User {
    return new User(
      data.id,
      data.email,
      data.name,
      UserRole.fromString(data.role),
      data.isActive,
      data.createdAt,
      data.updatedAt
    )
  }

  get id(): string {
    return this._id
  }

  get email(): string {
    return this._email
  }

  get name(): string {
    return this._name
  }

  get role(): UserRole {
    return this._role
  }

  get isActive(): boolean {
    return this._isActive
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name cannot be empty')
    }
    this._name = name.trim()
    this._updatedAt = new Date()
  }

  deactivate(): void {
    this._isActive = false
    this._updatedAt = new Date()
  }

  activate(): void {
    this._isActive = true
    this._updatedAt = new Date()
  }

  isAdmin(): boolean {
    return this._role.isAdmin()
  }

  canAccessAdminFeatures(): boolean {
    return this._isActive && this._role.isAdmin()
  }

  toPrimitive() {
    return {
      id: this._id,
      email: this._email,
      name: this._name,
      role: this._role.toString(),
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    }
  }
}

export class UserRole {
  private constructor(private readonly value: 'user' | 'admin') {}

  static readonly USER = new UserRole('user')
  static readonly ADMIN = new UserRole('admin')

  static fromString(role: string): UserRole {
    switch (role) {
      case 'user':
        return UserRole.USER
      case 'admin':
        return UserRole.ADMIN
      default:
        throw new Error(`Invalid user role: ${role}`)
    }
  }

  isAdmin(): boolean {
    return this.value === 'admin'
  }

  isUser(): boolean {
    return this.value === 'user'
  }

  toString(): string {
    return this.value
  }

  equals(other: UserRole): boolean {
    return this.value === other.value
  }
}

export class UserPreferences {
  private constructor(
    private readonly _theme: Theme,
    private readonly _defaultTimeframe: string,
    private readonly _defaultSymbol: string,
    private readonly _language: string
  ) {}

  static create(data: {
    theme?: 'light' | 'dark' | 'system'
    defaultTimeframe?: string
    defaultSymbol?: string
    language?: string
  }): UserPreferences {
    return new UserPreferences(
      Theme.fromString(data.theme || 'system'),
      data.defaultTimeframe || '1D',
      data.defaultSymbol || 'AAPL',
      data.language || 'en'
    )
  }

  static fromPrimitive(data: {
    theme: 'light' | 'dark' | 'system'
    defaultTimeframe: string
    defaultSymbol: string
    language: string
  }): UserPreferences {
    return new UserPreferences(
      Theme.fromString(data.theme),
      data.defaultTimeframe,
      data.defaultSymbol,
      data.language
    )
  }

  get theme(): Theme {
    return this._theme
  }

  get defaultTimeframe(): string {
    return this._defaultTimeframe
  }

  get defaultSymbol(): string {
    return this._defaultSymbol
  }

  get language(): string {
    return this._language
  }

  withTheme(theme: 'light' | 'dark' | 'system'): UserPreferences {
    return new UserPreferences(
      Theme.fromString(theme),
      this._defaultTimeframe,
      this._defaultSymbol,
      this._language
    )
  }

  withDefaultSymbol(symbol: string): UserPreferences {
    if (!symbol || symbol.trim().length === 0) {
      throw new Error('Default symbol cannot be empty')
    }
    return new UserPreferences(
      this._theme,
      this._defaultTimeframe,
      symbol.toUpperCase().trim(),
      this._language
    )
  }

  withDefaultTimeframe(timeframe: string): UserPreferences {
    if (!this.isValidTimeframe(timeframe)) {
      throw new Error(`Invalid timeframe: ${timeframe}`)
    }
    return new UserPreferences(this._theme, timeframe, this._defaultSymbol, this._language)
  }

  withLanguage(language: string): UserPreferences {
    if (!language || language.trim().length === 0) {
      throw new Error('Language cannot be empty')
    }
    return new UserPreferences(
      this._theme,
      this._defaultTimeframe,
      this._defaultSymbol,
      language.toLowerCase().trim()
    )
  }

  private isValidTimeframe(timeframe: string): boolean {
    const validTimeframes = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W', '1M']
    return validTimeframes.includes(timeframe)
  }

  toPrimitive() {
    return {
      theme: this._theme.toString(),
      defaultTimeframe: this._defaultTimeframe,
      defaultSymbol: this._defaultSymbol,
      language: this._language,
    }
  }

  equals(other: UserPreferences): boolean {
    return (
      this._theme.equals(other._theme) &&
      this._defaultTimeframe === other._defaultTimeframe &&
      this._defaultSymbol === other._defaultSymbol &&
      this._language === other._language
    )
  }
}

export class Theme {
  private constructor(private readonly value: 'light' | 'dark' | 'system') {}

  static readonly LIGHT = new Theme('light')
  static readonly DARK = new Theme('dark')
  static readonly SYSTEM = new Theme('system')

  static fromString(theme: string): Theme {
    switch (theme) {
      case 'light':
        return Theme.LIGHT
      case 'dark':
        return Theme.DARK
      case 'system':
        return Theme.SYSTEM
      default:
        throw new Error(`Invalid theme: ${theme}`)
    }
  }

  isLight(): boolean {
    return this.value === 'light'
  }

  isDark(): boolean {
    return this.value === 'dark'
  }

  isSystem(): boolean {
    return this.value === 'system'
  }

  toString(): 'light' | 'dark' | 'system' {
    return this.value
  }

  equals(other: Theme): boolean {
    return this.value === other.value
  }
}
