export class Symbol {
  constructor(
    public readonly symbol: string,
    public readonly name: string,
    public readonly exchange: string,
    public readonly sector?: string,
    public readonly industry?: string,
    public readonly marketCap?: number,
    public readonly isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(
    symbol: string,
    name: string,
    exchange: string,
    sector?: string,
    industry?: string,
    marketCap?: number
  ): Symbol {
    return new Symbol(
      symbol,
      name,
      exchange,
      sector,
      industry,
      marketCap,
      true,
      new Date(),
      new Date()
    )
  }

  deactivate(): Symbol {
    return new Symbol(
      this.symbol,
      this.name,
      this.exchange,
      this.sector,
      this.industry,
      this.marketCap,
      false,
      this.createdAt,
      new Date()
    )
  }

  updateInfo(
    name?: string,
    sector?: string,
    industry?: string,
    marketCap?: number
  ): Symbol {
    return new Symbol(
      this.symbol,
      name ?? this.name,
      this.exchange,
      sector ?? this.sector,
      industry ?? this.industry,
      marketCap ?? this.marketCap,
      this.isActive,
      this.createdAt,
      new Date()
    )
  }

  getFullName(): string {
    return `${this.name} (${this.symbol})`
  }

  isTradeable(): boolean {
    return this.isActive
  }
}