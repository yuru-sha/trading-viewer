export class Watchlist {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly symbols: string[] = [],
    public readonly isDefault: boolean = false,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  static create(
    id: string,
    userId: string,
    name: string,
    isDefault: boolean = false
  ): Watchlist {
    return new Watchlist(id, userId, name, [], isDefault, new Date(), new Date())
  }

  addSymbol(symbol: string): Watchlist {
    if (this.symbols.includes(symbol)) {
      return this
    }

    return new Watchlist(
      this.id,
      this.userId,
      this.name,
      [...this.symbols, symbol],
      this.isDefault,
      this.createdAt,
      new Date()
    )
  }

  removeSymbol(symbol: string): Watchlist {
    const filteredSymbols = this.symbols.filter(s => s !== symbol)
    
    if (filteredSymbols.length === this.symbols.length) {
      return this
    }

    return new Watchlist(
      this.id,
      this.userId,
      this.name,
      filteredSymbols,
      this.isDefault,
      this.createdAt,
      new Date()
    )
  }

  rename(newName: string): Watchlist {
    return new Watchlist(
      this.id,
      this.userId,
      newName,
      this.symbols,
      this.isDefault,
      this.createdAt,
      new Date()
    )
  }

  setAsDefault(): Watchlist {
    return new Watchlist(
      this.id,
      this.userId,
      this.name,
      this.symbols,
      true,
      this.createdAt,
      new Date()
    )
  }

  unsetAsDefault(): Watchlist {
    return new Watchlist(
      this.id,
      this.userId,
      this.name,
      this.symbols,
      false,
      this.createdAt,
      new Date()
    )
  }

  hasSymbol(symbol: string): boolean {
    return this.symbols.includes(symbol)
  }

  getSymbolCount(): number {
    return this.symbols.length
  }

  isEmpty(): boolean {
    return this.symbols.length === 0
  }
}