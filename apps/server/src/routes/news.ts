import express from 'express'
import { getService } from '../infrastructure/di/container.js'
import { TYPES } from '../infrastructure/di/types.js'
import type { IYahooFinanceService } from '../infrastructure/di/interfaces.js'

const router: express.Router = express.Router()
const yahooFinanceService = getService<IYahooFinanceService>(TYPES.YahooFinanceService)

/**
 * GET /api/news
 * Get general market news
 */
router.get('/', async (req, res) => {
  try {
    const { category = 'general', count = 6 } = req.query

    const validCategories = ['japan', 'world', 'crypto', 'general']
    const newsCategory = validCategories.includes(category as string)
      ? (category as 'japan' | 'world' | 'crypto' | 'general')
      : 'general'

    const newsCount = Math.min(parseInt(count as string) || 6, 20) // Max 20 items

    // Fetching news articles for category

    const news = await yahooFinanceService.getCategoryNews(newsCategory)

    // Transform to match client expectations
    const transformedNews = news.map(item => {
      // providerPublishTime is already in seconds from the service
      const timestamp = item.providerPublishTime * 1000 // Convert to milliseconds for Date constructor

      return {
        title: item.title,
        publisher: item.publisher,
        link: item.link,
        time: new Date(timestamp).toISOString(),
        logo: item.publisher.substring(0, 2).toUpperCase(), // Simple logo from publisher name
        uuid: item.uuid,
        thumbnail: item.thumbnail?.resolutions?.[0]?.url,
        relatedTickers: item.relatedTickers,
      }
    })

    res.json({
      success: true,
      data: transformedNews,
      category: newsCategory,
      count: transformedNews.length,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/news/:category
 * Get news for specific category
 */
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params
    const { count = 6 } = req.query

    const validCategories = ['japan', 'world', 'crypto', 'general']
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        validCategories,
      })
    }

    const newsCount = Math.min(parseInt(count as string) || 6, 20)

    // Fetching news articles for category

    const news = await yahooFinanceService.getCategoryNews(category as any)

    const transformedNews = news.map(item => {
      // providerPublishTime is already in seconds from the service
      const timestamp = item.providerPublishTime * 1000 // Convert to milliseconds for Date constructor

      return {
        title: item.title,
        publisher: item.publisher,
        link: item.link,
        time: new Date(timestamp).toISOString(),
        logo: item.publisher.substring(0, 2).toUpperCase(),
        uuid: item.uuid,
        thumbnail: item.thumbnail?.resolutions?.[0]?.url,
        relatedTickers: item.relatedTickers,
      }
    })

    res.json({
      success: true,
      data: transformedNews,
      category,
      count: transformedNews.length,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
