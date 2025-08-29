import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, Icon } from '@trading-viewer/ui'
import { useAppActions } from '../contexts/AppContext'
import { api } from '../lib/apiClient'
import { useWebSocket } from '../hooks/useWebSocket'
import { MarketNews } from '../components/market/MarketNews'

interface MarketData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume?: number
  volatility?: number
}

type MarketTab =
  | 'indices'
  | 'stocks-japan'
  | 'stocks-world'
  | 'crypto'
  | 'futures'
  | 'fx'
  | 'bonds'
  | 'etf'
  | 'economics'

const MarketPage: React.FC = () => {
  const { setError } = useAppActions()
  const [activeTab, setActiveTab] = useState<MarketTab>('stocks-japan')
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [loading, setLoading] = useState(true)
  const [dataCache, setDataCache] = useState<
    Partial<Record<MarketTab, { data: MarketData[]; timestamp: number }>>
  >({})

  // Define market categories
  const marketTabs = [
    { id: 'indices' as MarketTab, label: 'Indices', icon: 'BarChart3' },
    { id: 'stocks-japan' as MarketTab, label: 'Japan Stocks', icon: '🇯🇵' },
    { id: 'stocks-world' as MarketTab, label: 'World Stocks', icon: '🌍' },
    { id: 'crypto' as MarketTab, label: 'Crypto', icon: '₿' },
    { id: 'futures' as MarketTab, label: 'Futures', icon: 'TrendingUp' },
    { id: 'fx' as MarketTab, label: 'FX', icon: '💱' },
    { id: 'bonds' as MarketTab, label: 'Bonds', icon: '🏦' },
    { id: 'etf' as MarketTab, label: 'ETF', icon: 'Package' },
    { id: 'economics' as MarketTab, label: 'Economics', icon: 'TrendingDown' },
  ]

  // WebSocket for real-time updates
  const { lastQuote } = useWebSocket({
    autoConnect: true,
  })

  // Get symbols based on active tab
  const getSymbolsForTab = (tab: MarketTab): string[] => {
    switch (tab) {
      case 'indices':
        return ['^N225', '^GSPC', '^IXIC', '^DJI'] // Nikkei, S&P500, NASDAQ, Dow (Yahoo Finance format)
      case 'stocks-japan':
        // Japanese stocks with Yahoo Finance format (.T suffix for Tokyo Stock Exchange)
        return [
          '7203.T',
          '6758.T',
          '9984.T',
          '7974.T',
          '9433.T',
          '8306.T', // Toyota, Sony, SoftBank, Nintendo, KDDI, MUFG
          '6861.T',
          '6902.T',
          '4063.T',
          '9432.T',
          '8035.T',
          '7267.T', // Keyence, Denso, Shin-Etsu, NTT, Tokyo Electron, Honda
          '6501.T',
          '8058.T',
          '8001.T',
          '9020.T',
          '7751.T',
          '4519.T', // Hitachi, Mitsubishi, Itochu, JR East, Canon, Chugai
        ]
      case 'stocks-world':
        // More world stocks for better categorization
        return [
          'AAPL',
          'MSFT',
          'GOOGL',
          'TSLA',
          'AMZN',
          'NVDA', // Original
          'META',
          'BRK.B',
          'JPM',
          'V',
          'JNJ',
          'WMT', // Meta, Berkshire, JPMorgan, Visa, J&J, Walmart
          'UNH',
          'PG',
          'DIS',
          'MA',
          'HD',
          'NFLX', // UnitedHealth, P&G, Disney, Mastercard, Home Depot, Netflix
        ]
      case 'crypto':
        return ['BTC-USD', 'ETH-USD', 'ADA-USD', 'XRP-USD'] // Yahoo Finance crypto format
      case 'futures':
        return ['GC=F', 'SI=F', 'CL=F', 'NG=F'] // Gold, Silver, Oil, Natural Gas
      case 'fx':
        // Major currency pairs with Yahoo Finance format (=X suffix)
        return [
          'JPY=X',
          'EURUSD=X',
          'GBPUSD=X',
          'AUDUSD=X',
          'NZDUSD=X',
          'USDCAD=X', // Major pairs
          'USDCHF=X',
          'EURGBP=X',
          'EURJPY=X',
          'GBPJPY=X',
          'AUDJPY=X',
          'CADJPY=X', // Cross pairs
        ]
      case 'bonds':
        return ['TNX', 'DGS10', 'DGS2', 'DGS30'] // Treasury yields
      case 'etf':
        return ['SPY', 'QQQ', 'VTI', 'IWM']
      case 'economics':
        return [] // Will show economic indicators
      default:
        return []
    }
  }

  const getDisplayName = (symbol: string): string => {
    const names: Record<string, string> = {
      // Japanese stocks
      '7203.T': 'トヨタ自動車',
      '6758.T': 'ソニーグループ',
      '9984.T': 'ソフトバンクグループ',
      '7974.T': '任天堂',
      '9433.T': 'KDDI',
      '8306.T': '三菱 UFJ フィナンシャル・グループ',
      '6861.T': 'キーエンス',
      '6902.T': 'デンソー',
      '4063.T': '信越化学工業',
      '9432.T': '日本電信電話',
      '8035.T': '東京エレクトロン',
      '7267.T': '本田技研工業',
      '6501.T': '日立製作所',
      '8058.T': '三菱商事',
      '8001.T': '伊藤忠商事',
      '9020.T': 'JR東日本',
      '7751.T': 'キヤノン',
      '4519.T': '中外製薬',

      // World stocks
      AAPL: 'Apple Inc.',
      MSFT: 'Microsoft Corporation',
      GOOGL: 'Alphabet Inc.',
      TSLA: 'Tesla, Inc.',
      AMZN: 'Amazon.com Inc.',
      NVDA: 'NVIDIA Corporation',
      META: 'Meta Platforms Inc.',
      'BRK.B': 'Berkshire Hathaway',
      JPM: 'JPMorgan Chase',
      V: 'Visa Inc.',
      JNJ: 'Johnson & Johnson',
      WMT: 'Walmart Inc.',
      UNH: 'UnitedHealth Group',
      PG: 'Procter & Gamble',
      DIS: 'Walt Disney Co.',
      MA: 'Mastercard Inc.',
      HD: 'Home Depot Inc.',
      NFLX: 'Netflix Inc.',

      // Indices
      '^N225': 'Nikkei 225',
      '^GSPC': 'S&P 500',
      '^IXIC': 'NASDAQ Composite',
      '^DJI': 'Dow Jones Industrial Average',

      // Crypto
      'BTC-USD': 'Bitcoin',
      'ETH-USD': 'Ethereum',
      'ADA-USD': 'Cardano',
      'XRP-USD': 'XRP',

      // Futures
      'GC=F': 'Gold Futures',
      'SI=F': 'Silver Futures',
      'CL=F': 'Crude Oil Futures',
      'NG=F': 'Natural Gas Futures',

      // FX
      'JPY=X': 'USD/JPY',
      'EURUSD=X': 'EUR/USD',
      'GBPUSD=X': 'GBP/USD',
      'AUDUSD=X': 'AUD/USD',
      'NZDUSD=X': 'NZD/USD',
      'USDCAD=X': 'USD/CAD',
      'USDCHF=X': 'USD/CHF',
      'EURGBP=X': 'EUR/GBP',
      'EURJPY=X': 'EUR/JPY',
      'GBPJPY=X': 'GBP/JPY',
      'AUDJPY=X': 'AUD/JPY',
      'CADJPY=X': 'CAD/JPY',

      // ETFs
      SPY: 'SPDR S&P 500 ETF',
      QQQ: 'Invesco QQQ Trust',
      VTI: 'Vanguard Total Stock Market ETF',
      IWM: 'iShares Russell 2000 ETF',
    }
    return names[symbol] || symbol
  }

  // Cache expiry time (5 minutes)
  const CACHE_EXPIRY_MS = 5 * 60 * 1000

  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_EXPIRY_MS
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Check if we have valid cached data
        const cachedData = dataCache[activeTab]
        if (cachedData && isCacheValid(cachedData.timestamp)) {
          setMarketData(cachedData.data)
          setLoading(false)
          return
        }

        const symbols = getSymbolsForTab(activeTab)

        if (symbols.length === 0) {
          // For economics tab, we'll show static indicators
          setMarketData([])
          setLoading(false)
          return
        }

        // Fetch quotes for symbols based on active tab (with reduced concurrency)
        const quotes: (MarketData | null)[] = []

        // Process symbols in batches of 2 to reduce API load
        for (let i = 0; i < symbols.length; i += 2) {
          const batch = symbols.slice(i, i + 2)
          const batchQuotes = await Promise.all(
            batch.map(async symbol => {
              try {
                const quote = await api.market.getQuote(symbol)
                return {
                  symbol,
                  name: getDisplayName(symbol),
                  price: quote.c,
                  change: quote.d,
                  changePercent: quote.dp,
                  high: quote.h,
                  low: quote.l,
                  // Mock volume and volatility data (in real app, this would come from API)
                  volume: Math.floor(Math.random() * 10000000) + 1000000,
                  volatility: Math.abs(quote.dp) * (1 + Math.random() * 0.5),
                }
              } catch (err) {
                console.warn(`Failed to fetch quote for ${symbol}:`, err)
                return null
              }
            })
          )
          quotes.push(...batchQuotes)

          // Add small delay between batches to prevent overwhelming the API
          if (i + 2 < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        const validQuotes = quotes.filter(Boolean) as MarketData[]

        // Cache the data
        setDataCache(prev => ({
          ...prev,
          [activeTab]: {
            data: validQuotes,
            timestamp: Date.now(),
          },
        }))

        setMarketData(validQuotes)
      } catch {
        console.error('Failed to fetch market data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load market data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab, setError])

  // Update market data with WebSocket quotes
  useEffect(() => {
    if (
      lastQuote &&
      'symbol' in lastQuote &&
      'data' in lastQuote &&
      typeof lastQuote.data === 'object' &&
      lastQuote.data !== null
    ) {
      const data = lastQuote.data as { price?: number; change?: number; changePercent?: number }
      if (
        typeof data.price === 'number' &&
        typeof data.change === 'number' &&
        typeof data.changePercent === 'number'
      ) {
        setMarketData(prev =>
          prev.map(item =>
            item.symbol === lastQuote.symbol
              ? {
                  ...item,
                  price: data.price!,
                  change: data.change!,
                  changePercent: data.changePercent!,
                  high: item.high, // Keep existing high/low as WebSocket might not have these
                  low: item.low,
                }
              : item
          )
        )
      }
    }
  }, [lastQuote])

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center'>
        <Loading size='lg' text='Loading market data...' />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Markets</h1>
        </div>

        {/* Market Tabs */}
        <div className='mb-8'>
          <div className='border-b border-gray-200 dark:border-gray-700'>
            <nav className='-mb-px flex space-x-8 overflow-x-auto'>
              {marketTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {loading ? (
          <div className='flex justify-center items-center py-20'>
            <Loading
              size='lg'
              text={`Loading ${marketTabs.find(t => t.id === activeTab)?.label} data...`}
            />
          </div>
        ) : (
          <div>
            {activeTab === 'economics' ? (
              // Economics indicators view
              <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
                <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-6'>
                  Economic Indicators
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                      <span className='font-medium text-gray-900 dark:text-white'>Japan GDP</span>
                      <span className='text-lg font-bold text-gray-900 dark:text-white'>
                        ¥4.03T
                      </span>
                    </div>
                    <div className='flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                      <span className='font-medium text-gray-900 dark:text-white'>US GDP</span>
                      <span className='text-lg font-bold text-gray-900 dark:text-white'>
                        $29.18T
                      </span>
                    </div>
                    <div className='flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                      <span className='font-medium text-gray-900 dark:text-white'>
                        Japan Interest Rate
                      </span>
                      <span className='text-lg font-bold text-gray-900 dark:text-white'>0.5%</span>
                    </div>
                  </div>
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                      <span className='font-medium text-gray-900 dark:text-white'>
                        Japan Unemployment Rate
                      </span>
                      <span className='text-lg font-bold text-gray-900 dark:text-white'>2.5%</span>
                    </div>
                    <div className='flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                      <span className='font-medium text-gray-900 dark:text-white'>
                        Japan Inflation Rate
                      </span>
                      <span className='text-lg font-bold text-gray-900 dark:text-white'>3.3%</span>
                    </div>
                    <div className='flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                      <span className='font-medium text-gray-900 dark:text-white'>USD/JPY</span>
                      <span className='text-lg font-bold text-gray-900 dark:text-white'>
                        ¥147.74
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'fx' ? (
              // Special layout for FX tab
              <div>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                  {/* Major Currency Pairs */}
                  <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                      💱 Major Currency Pairs
                    </h3>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2'>
                      {marketData.slice(0, 6).map(item => (
                        <Link
                          key={item.symbol}
                          to={`/charts?symbol=${item.symbol}`}
                          className='flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors'
                        >
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {item.symbol}
                          </span>
                          <div className='flex items-center space-x-2'>
                            <span className='text-sm text-gray-600 dark:text-gray-300'>
                              {item.price.toFixed(4)}
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                item.changePercent >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {item.changePercent >= 0 ? '+' : ''}
                              {item.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Cross Currency Pairs */}
                  <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                      🔄 Cross Currency Pairs
                    </h3>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2'>
                      {marketData.slice(6, 12).map(item => (
                        <Link
                          key={item.symbol}
                          to={`/charts?symbol=${item.symbol}`}
                          className='flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors'
                        >
                          <span className='font-medium text-gray-900 dark:text-white'>
                            {item.symbol}
                          </span>
                          <div className='flex items-center space-x-2'>
                            <span className='text-sm text-gray-600 dark:text-gray-300'>
                              {item.price.toFixed(2)}
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                item.changePercent >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {item.changePercent >= 0 ? '+' : ''}
                              {item.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'stocks-japan' || activeTab === 'stocks-world' ? (
              // Special layout for Japan Stocks and World Stocks
              <div>
                {/* Categories in 2x2 grid */}
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                  {/* Top Volume */}
                  <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                      <Icon name="BarChart3" className="w-5 h-5 inline mr-2" />Top Volume
                    </h3>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2'>
                      {marketData
                        .sort((a, b) => (b.volume || 0) - (a.volume || 0))
                        .slice(0, 6)
                        .map(item => (
                          <Link
                            key={item.symbol}
                            to={`/charts?symbol=${item.symbol}`}
                            className='flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors'
                          >
                            <div className='flex flex-col'>
                              <span className='font-medium text-gray-900 dark:text-white'>
                                {item.symbol}
                              </span>
                              <span className='text-xs text-gray-500 dark:text-gray-400'>
                                {((item.volume || 0) / 1000000).toFixed(1)}M
                              </span>
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                item.changePercent >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {item.changePercent >= 0 ? '+' : ''}
                              {item.changePercent.toFixed(2)}%
                            </span>
                          </Link>
                        ))}
                    </div>
                  </div>

                  {/* Top Volatility */}
                  <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                      <Icon name="Zap" className="w-5 h-5 inline mr-2" />Top Volatility
                    </h3>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2'>
                      {marketData
                        .sort((a, b) => (b.volatility || 0) - (a.volatility || 0))
                        .slice(0, 6)
                        .map(item => (
                          <Link
                            key={item.symbol}
                            to={`/charts?symbol=${item.symbol}`}
                            className='flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors'
                          >
                            <div className='flex flex-col'>
                              <span className='font-medium text-gray-900 dark:text-white'>
                                {item.symbol}
                              </span>
                              <span className='text-xs text-gray-500 dark:text-gray-400'>
                                {(item.volatility || 0).toFixed(2)}%
                              </span>
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                item.changePercent >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {item.changePercent >= 0 ? '+' : ''}
                              {item.changePercent.toFixed(2)}%
                            </span>
                          </Link>
                        ))}
                    </div>
                  </div>

                  {/* Top Gainers */}
                  <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                      <Icon name="TrendingUp" className="w-5 h-5 inline mr-2" />Top Gainers
                    </h3>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2'>
                      {marketData
                        .sort((a, b) => b.changePercent - a.changePercent)
                        .slice(0, 6)
                        .map(item => (
                          <Link
                            key={item.symbol}
                            to={`/charts?symbol=${item.symbol}`}
                            className='flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors'
                          >
                            <span className='font-medium text-gray-900 dark:text-white'>
                              {item.symbol}
                            </span>
                            <span className='text-sm font-medium text-green-600 dark:text-green-400'>
                              +{item.changePercent.toFixed(2)}%
                            </span>
                          </Link>
                        ))}
                    </div>
                  </div>

                  {/* Top Losers */}
                  <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                      <Icon name="TrendingDown" className="w-5 h-5 inline mr-2" />Top Losers
                    </h3>
                    <div className='grid grid-cols-2 gap-x-4 gap-y-2'>
                      {marketData
                        .sort((a, b) => a.changePercent - b.changePercent)
                        .slice(0, 6)
                        .map(item => (
                          <Link
                            key={item.symbol}
                            to={`/charts?symbol=${item.symbol}`}
                            className='flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors'
                          >
                            <span className='font-medium text-gray-900 dark:text-white'>
                              {item.symbol}
                            </span>
                            <span className='text-sm font-medium text-red-600 dark:text-red-400'>
                              {item.changePercent.toFixed(2)}%
                            </span>
                          </Link>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Default market data grid for other tabs
              <div>
                <div className='flex items-center justify-between mb-6'>
                  <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                    {marketTabs.find(t => t.id === activeTab)?.label}
                  </h2>
                  <Link
                    to={`/search?category=${activeTab}`}
                    className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium'
                  >
                    View All →
                  </Link>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
                  {marketData.map(item => (
                    <Link
                      key={item.symbol}
                      to={`/charts?symbol=${item.symbol}`}
                      className='block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6'
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                          {item.symbol}
                        </h3>
                        <div
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.change >= 0
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {item.change >= 0 ? '+' : ''}
                          {item.changePercent.toFixed(2)}%
                        </div>
                      </div>

                      <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>{item.name}</p>

                      <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <span className='text-2xl font-bold text-gray-900 dark:text-white'>
                            {(activeTab as MarketTab) === 'fx' ||
                            (activeTab as MarketTab) === 'crypto'
                              ? item.price.toFixed(4)
                              : activeTab === 'bonds'
                                ? `${item.price.toFixed(3)}%`
                                : `$${item.price.toFixed(2)}`}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              item.change >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {item.change >= 0 ? '+' : ''}
                            {(activeTab as MarketTab) === 'fx' ||
                            (activeTab as MarketTab) === 'crypto'
                              ? item.change.toFixed(4)
                              : activeTab === 'bonds'
                                ? `${item.change.toFixed(3)}%`
                                : `$${item.change.toFixed(2)}`}
                          </span>
                        </div>

                        <div className='flex justify-between text-xs text-gray-500'>
                          <span>
                            H:{' '}
                            {(activeTab as MarketTab) === 'fx' ||
                            (activeTab as MarketTab) === 'crypto'
                              ? item.high.toFixed(4)
                              : activeTab === 'bonds'
                                ? `${item.high.toFixed(3)}%`
                                : `$${item.high.toFixed(2)}`}
                          </span>
                          <span>
                            L:{' '}
                            {(activeTab as MarketTab) === 'fx' ||
                            (activeTab as MarketTab) === 'crypto'
                              ? item.low.toFixed(4)
                              : activeTab === 'bonds'
                                ? `${item.low.toFixed(3)}%`
                                : `$${item.low.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Market News Section - Show category-specific news */}
        {activeTab !== 'fx' && (
          <div className='mt-12'>
            <MarketNews
              category={
                activeTab === 'stocks-japan'
                  ? 'japan'
                  : activeTab === 'stocks-world'
                    ? 'world'
                    : activeTab === 'crypto'
                      ? 'crypto'
                      : 'general'
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default MarketPage
