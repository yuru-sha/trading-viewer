import type { NormalizedQuote } from '@trading-viewer/shared'

/**
 * Quote service interface - handles real-time quote operations
 * Follows Single Responsibility Principle
 */
export interface IQuoteService {
  /**
   * Get current quote for a symbol
   * @param symbol - Symbol identifier
   * @param useCache - Whether to use cached data (default: true)
   * @returns Current quote data
   */
  getQuote(symbol: string, useCache?: boolean): Promise<NormalizedQuote>

  /**
   * Refresh quote data from external source
   * @param symbol - Symbol identifier
   * @returns Updated quote data
   */
  refreshQuote(symbol: string): Promise<NormalizedQuote>

  /**
   * Get quotes for multiple symbols
   * @param symbols - Array of symbol identifiers
   * @param useCache - Whether to use cached data (default: true)
   * @returns Array of quote data
   */
  getMultipleQuotes(symbols: string[], useCache?: boolean): Promise<NormalizedQuote[]>

  /**
   * Subscribe to real-time quote updates
   * @param symbol - Symbol identifier
   * @param callback - Callback function for updates
   * @returns Unsubscribe function
   */
  subscribeToQuote(symbol: string, callback: (quote: NormalizedQuote) => void): () => void

  /**
   * Check if quote data is stale
   * @param symbol - Symbol identifier
   * @returns True if data is stale
   */
  isQuoteStale(symbol: string): Promise<boolean>
}