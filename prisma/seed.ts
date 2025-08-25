import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Sample symbols data
  const symbols = [
    {
      symbol: 'AAPL',
      description: 'Apple Inc.',
      displaySymbol: 'AAPL',
      type: 'Common Stock',
    },
    {
      symbol: 'MSFT',
      description: 'Microsoft Corporation',
      displaySymbol: 'MSFT',
      type: 'Common Stock',
    },
    {
      symbol: 'GOOGL',
      description: 'Alphabet Inc.',
      displaySymbol: 'GOOGL',
      type: 'Common Stock',
    },
    {
      symbol: 'TSLA',
      description: 'Tesla, Inc.',
      displaySymbol: 'TSLA',
      type: 'Common Stock',
    },
    {
      symbol: 'NVDA',
      description: 'NVIDIA Corporation',
      displaySymbol: 'NVDA',
      type: 'Common Stock',
    },
    {
      symbol: 'BTCUSDT',
      description: 'Bitcoin',
      displaySymbol: 'BTC/USDT',
      type: 'Cryptocurrency',
    },
    {
      symbol: 'ETHUSDT',
      description: 'Ethereum',
      displaySymbol: 'ETH/USDT',
      type: 'Cryptocurrency',
    },
  ]

  // Insert symbols
  for (const symbolData of symbols) {
    await prisma.symbol.upsert({
      where: { symbol: symbolData.symbol },
      update: symbolData,
      create: symbolData,
    })
  }

  console.log(`✅ Created ${symbols.length} symbols`)

  // Generate sample candle data for AAPL
  const aaplCandles = []
  const basePrice = 150
  const baseTimestamp = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60 // 1 year ago

  for (let i = 0; i < 365; i++) {
    const timestamp = baseTimestamp + i * 24 * 60 * 60 // Daily candles
    const randomFactor = 0.95 + Math.random() * 0.1 // ±5% variation
    const open = basePrice * randomFactor
    const close = open * (0.98 + Math.random() * 0.04) // ±2% daily change
    const high = Math.max(open, close) * (1 + Math.random() * 0.02)
    const low = Math.min(open, close) * (1 - Math.random() * 0.02)
    const volume = Math.floor(Math.random() * 100000000 + 10000000) // 10M-110M volume

    aaplCandles.push({
      symbol: 'AAPL',
      timestamp,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    })
  }

  // Insert candle data
  for (const candleData of aaplCandles) {
    await prisma.candle.upsert({
      where: {
        symbol_timestamp: {
          symbol: candleData.symbol,
          timestamp: candleData.timestamp,
        },
      },
      update: candleData,
      create: candleData,
    })
  }

  console.log(`✅ Created ${aaplCandles.length} candle records for AAPL`)

  // Sample users with passwords
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12)
  const userPasswordHash = await bcrypt.hash('user123', 12)

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@tradingviewer.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'admin',
      name: 'Admin User',
      isEmailVerified: true,
    },
    create: {
      email: 'admin@tradingviewer.com',
      passwordHash: adminPasswordHash,
      name: 'Admin User',
      role: 'admin',
      isEmailVerified: true,
    },
  })

  // Create test user (matching login screen demo)
  const testPasswordHash = await bcrypt.hash('password123', 12)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      passwordHash: testPasswordHash,
      name: 'Test User',
      role: 'user',
      isEmailVerified: true,
    },
    create: {
      email: 'test@example.com',
      passwordHash: testPasswordHash,
      name: 'Test User',
      role: 'user',
      isEmailVerified: true,
    },
  })

  // Create default watchlist for demo user
  const defaultWatchlist = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'TSLA', name: 'Tesla, Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  ]

  for (const item of defaultWatchlist) {
    await prisma.watchlist.upsert({
      where: {
        userId_symbol: {
          userId: testUser.id,
          symbol: item.symbol,
        },
      },
      update: {},
      create: {
        userId: testUser.id,
        symbol: item.symbol,
        name: item.name,
      },
    })
  }

  await prisma.userPreferences.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      theme: 'dark',
      chartType: 'candlestick',
      timeframe: '1D',
      indicators: JSON.stringify([
        { id: 'sma_20', name: 'SMA(20)', type: 'overlay', visible: true },
        { id: 'rsi_14', name: 'RSI(14)', type: 'oscillator', visible: true },
      ]),
    },
  })

  console.log('✅ Created admin and test users with preferences')
  console.log('📧 Admin: admin@tradingviewer.com / Admin123!')
  console.log('📧 Test User: test@example.com / password123')
  console.log('🎉 Database seeding completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async e => {
    console.error('❌ Database seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
