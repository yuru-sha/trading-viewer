import type { NormalizedSymbol } from '@trading-viewer/shared'

/**
 * Symbol service interface - handles symbol-related operations
 * Follows Single Responsibility Principle
 */
export interface ISymbolService {
  /**
   * Search for symbols based on query string
   * @param query - Search query
   * @param limit - Maximum number of results (optional)
   * @returns Array of normalized symbols
   */
  searchSymbols(query: string, limit?: number): Promise<NormalizedSymbol[]>

  /**
   * Get a specific symbol by its identifier
   * @param symbol - Symbol identifier
   * @returns Normalized symbol or null if not found
   */
  getSymbol(symbol: string): Promise<NormalizedSymbol | null>

  /**
   * Synchronize symbol data with external source
   * @param symbol - Symbol identifier
   * @returns Updated normalized symbol
   */
  syncSymbol(symbol: string): Promise<NormalizedSymbol>

  /**
   * Validate if symbol format is correct
   * @param symbol - Symbol identifier to validate
   * @returns True if valid, false otherwise
   */
  validateSymbol(symbol: string): boolean

  /**
   * Get multiple symbols by their identifiers
   * @param symbols - Array of symbol identifiers
   * @returns Array of normalized symbols
   */
  getMultipleSymbols(symbols: string[]): Promise<NormalizedSymbol[]>
}
