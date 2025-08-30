import { SymbolInfo, TimeframeOption, TimezoneOption } from '../types/core/chart'

export const POPULAR_SYMBOLS: SymbolInfo[] = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
]

export const TIMEFRAMES: TimeframeOption[] = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1h' },
  { value: '240', label: '4h' },
  { value: 'D', label: '1D' },
  { value: 'W', label: '1W' },
  { value: 'M', label: '1M' },
]

export const TIMEZONES: TimezoneOption[] = [
  { value: 'UTC', label: 'UTC', offset: '+00:00' },
  { value: 'America/New_York', label: 'New York', offset: 'EST/EDT' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', offset: 'PST/PDT' },
  { value: 'Europe/London', label: 'London', offset: 'GMT/BST' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: 'CET/CEST' },
  { value: 'Asia/Tokyo', label: 'Tokyo', offset: 'JST' },
  { value: 'Asia/Shanghai', label: 'Shanghai', offset: 'CST' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'AEDT/AEST' },
]
