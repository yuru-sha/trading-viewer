import { z } from 'zod'

export const SymbolRequestSchema = z.object({
  query: z.string().min(1).max(10),
  limit: z.number().min(1).max(50).optional().default(10),
})

export const MarketDataRequestSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,5}$/, 'Invalid symbol format'),
  timeframe: z.enum(['1', '5', '15', '30', '60', 'D', 'W', 'M']),
  from: z.number().positive().optional(),
  to: z.number().positive().optional(),
})

export const QuoteRequestSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{1,5}$/, 'Invalid symbol format'),
})

export const CandleDataSchema = z.object({
  time: z.number().positive(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative().optional(),
})

export type SymbolRequestValidated = z.infer<typeof SymbolRequestSchema>
export type MarketDataRequestValidated = z.infer<typeof MarketDataRequestSchema>
export type QuoteRequestValidated = z.infer<typeof QuoteRequestSchema>
export type CandleDataValidated = z.infer<typeof CandleDataSchema>
