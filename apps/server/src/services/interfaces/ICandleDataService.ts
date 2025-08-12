import type { NormalizedCandleResponse } from '@trading-viewer/shared'

/**
 * Candle data service interface - handles historical chart data
 * Follows Single Responsibility Principle
 */
export interface ICandleDataService {
  /**
   * Get candle data for a symbol within time range
   * @param symbol - Symbol identifier
   * @param resolution - Chart resolution (1, 5, 15, 30, 60, D, W, M)
   * @param from - Start timestamp
   * @param to - End timestamp
   * @param useCache - Whether to use cached data (default: true)
   * @returns Candle data response
   */
  getCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number,
    useCache?: boolean
  ): Promise<NormalizedCandleResponse>

  /**
   * Refresh candle data from external source
   * @param symbol - Symbol identifier
   * @param resolution - Chart resolution
   * @param from - Start timestamp
   * @param to - End timestamp
   * @returns Updated candle data
   */
  refreshCandleData(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<NormalizedCandleResponse>

  /**
   * Get latest candles for a symbol
   * @param symbol - Symbol identifier
   * @param resolution - Chart resolution
   * @param count - Number of candles to retrieve
   * @returns Latest candle data
   */
  getLatestCandles(
    symbol: string,
    resolution: string,
    count: number
  ): Promise<NormalizedCandleResponse>

  /**
   * Clean up old candle data
   * @param symbol - Symbol identifier (optional, cleans all if not provided)
   * @param beforeTimestamp - Timestamp before which to clean data
   * @returns Number of records cleaned
   */
  cleanupOldData(symbol: string, beforeTimestamp: number): Promise<number>

  /**
   * Check data availability for symbol and timeframe
   * @param symbol - Symbol identifier
   * @param resolution - Chart resolution
   * @param from - Start timestamp
   * @param to - End timestamp
   * @returns True if data is available
   */
  isDataAvailable(symbol: string, resolution: string, from: number, to: number): Promise<boolean>
}