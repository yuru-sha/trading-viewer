import axios from 'axios'
import { FinnhubService, resetFinnhubService } from '../../services/finnhubService'
import {
  FinnhubSymbolSearchResponse,
  FinnhubQuote,
  FinnhubCandle,
  SymbolSearchParams,
  QuoteParams,
  CandleDataParams,
} from '@trading-viewer/shared'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('FinnhubService', () => {
  let finnhubService: FinnhubService
  const mockAxiosInstance = {
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  }

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Set up environment variables
    process.env.FINNHUB_API_KEY = 'test-api-key'
    process.env.FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
    process.env.FINNHUB_RATE_LIMIT = '60'

    // Mock axios.create
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any)

    finnhubService = new FinnhubService()
  })

  afterEach(() => {
    delete process.env.FINNHUB_API_KEY
    delete process.env.FINNHUB_BASE_URL
    delete process.env.FINNHUB_RATE_LIMIT
    resetFinnhubService()
  })

  describe('constructor', () => {
    it('should throw error if FINNHUB_API_KEY is not provided', () => {
      delete process.env.FINNHUB_API_KEY

      expect(() => new FinnhubService()).toThrow('FINNHUB_API_KEY environment variable is required')
    })

    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://finnhub.io/api/v1',
        timeout: 10000,
        headers: {
          'X-Finnhub-Token': 'test-api-key',
        },
      })
    })
  })

  describe('searchSymbols', () => {
    it('should search symbols successfully', async () => {
      const mockResponse: FinnhubSymbolSearchResponse = {
        count: 2,
        result: [
          {
            currency: 'USD',
            description: 'Apple Inc',
            displaySymbol: 'AAPL',
            figi: 'BBG000B9XRY4',
            mic: 'XNAS',
            symbol: 'AAPL',
            type: 'Common Stock',
          },
          {
            currency: 'USD',
            description: 'Microsoft Corporation',
            displaySymbol: 'MSFT',
            figi: 'BBG000BPH459',
            mic: 'XNAS',
            symbol: 'MSFT',
            type: 'Common Stock',
          },
        ],
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse })

      const params: SymbolSearchParams = { q: 'APP', limit: 10 }
      const result = await finnhubService.searchSymbols(params)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
        params: { q: 'APP', limit: 10 },
      })

      expect(result).toEqual([
        {
          symbol: 'AAPL',
          description: 'Apple Inc',
          displaySymbol: 'AAPL',
          type: 'Common Stock',
          currency: 'USD',
        },
        {
          symbol: 'MSFT',
          description: 'Microsoft Corporation',
          displaySymbol: 'MSFT',
          type: 'Common Stock',
          currency: 'USD',
        },
      ])
    })

    it('should use default limit when not provided', async () => {
      const mockResponse: FinnhubSymbolSearchResponse = { count: 0, result: [] }
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse })

      const params: SymbolSearchParams = { q: 'TEST' }
      await finnhubService.searchSymbols(params)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
        params: { q: 'TEST', limit: 10 },
      })
    })
  })

  describe('getQuote', () => {
    it('should get quote successfully', async () => {
      const mockResponse: FinnhubQuote = {
        c: 150.0, // Current price
        d: 2.5, // Change
        dp: 1.69, // Percent change
        h: 152.0, // High
        l: 148.0, // Low
        o: 149.0, // Open
        pc: 147.5, // Previous close
        t: 1640995200, // Timestamp
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse })

      const params: QuoteParams = { symbol: 'AAPL' }
      const result = await finnhubService.getQuote(params)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/quote', {
        params: { symbol: 'AAPL' },
      })

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.0,
        change: 2.5,
        changePercent: 1.69,
        high: 152.0,
        low: 148.0,
        open: 149.0,
        previousClose: 147.5,
        timestamp: 1640995200,
      })
    })
  })

  describe('getCandleData', () => {
    it('should get candle data successfully', async () => {
      const mockResponse: FinnhubCandle = {
        c: [150.0, 151.0], // Close prices
        h: [152.0, 153.0], // High prices
        l: [148.0, 149.0], // Low prices
        o: [149.0, 150.5], // Open prices
        s: 'ok', // Status
        t: [1640995200, 1641081600], // Timestamps
        v: [1000000, 1200000], // Volume
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse })

      const params: CandleDataParams = {
        symbol: 'AAPL',
        resolution: 'D',
        from: 1640995200,
        to: 1641081600,
      }

      const result = await finnhubService.getCandleData(params)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/stock/candle', {
        params: {
          symbol: 'AAPL',
          resolution: 'D',
          from: 1640995200,
          to: 1641081600,
        },
      })

      expect(result).toEqual({
        symbol: 'AAPL',
        resolution: 'D',
        status: 'ok',
        data: [
          {
            timestamp: 1640995200,
            open: 149.0,
            high: 152.0,
            low: 148.0,
            close: 150.0,
            volume: 1000000,
          },
          {
            timestamp: 1641081600,
            open: 150.5,
            high: 153.0,
            low: 149.0,
            close: 151.0,
            volume: 1200000,
          },
        ],
      })
    })

    it('should handle no data response', async () => {
      const mockResponse: FinnhubCandle = {
        c: [],
        h: [],
        l: [],
        o: [],
        s: 'no_data',
        t: [],
        v: [],
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse })

      const params: CandleDataParams = {
        symbol: 'INVALID',
        resolution: 'D',
        from: 1640995200,
        to: 1641081600,
      }

      const result = await finnhubService.getCandleData(params)

      expect(result).toEqual({
        symbol: 'INVALID',
        resolution: 'D',
        status: 'error',
        data: [],
      })
    })
  })

  describe('rate limiting', () => {
    it('should track rate limit info', () => {
      const rateLimitInfo = finnhubService.getRateLimitInfo()

      expect(rateLimitInfo).toHaveProperty('limit')
      expect(rateLimitInfo).toHaveProperty('remaining')
      expect(rateLimitInfo).toHaveProperty('resetTime')
      expect(rateLimitInfo.limit).toBe(60)
    })

    it('should check if requests can be made', () => {
      const canMake = finnhubService.canMakeRequest()
      expect(typeof canMake).toBe('boolean')
    })

    it('should get time until reset', () => {
      const timeUntilReset = finnhubService.getTimeUntilReset()
      expect(typeof timeUntilReset).toBe('number')
      expect(timeUntilReset).toBeGreaterThanOrEqual(0)
    })
  })
})
