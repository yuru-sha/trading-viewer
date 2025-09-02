export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly token: string,
    public readonly userId: string,
    public readonly expiresAt: Date,
    public readonly lastUsedAt?: Date,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(id: string, token: string, userId: string, expiresAt: Date): RefreshToken {
    return new RefreshToken(id, token, userId, expiresAt, undefined, new Date(), new Date())
  }

  isExpired(): boolean {
    return this.expiresAt < new Date()
  }

  updateLastUsed(): RefreshToken {
    return new RefreshToken(
      this.id,
      this.token,
      this.userId,
      this.expiresAt,
      new Date(),
      this.createdAt,
      new Date()
    )
  }
}
