import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { ApiError } from '@trading-viewer/shared'

// Validation schemas
export const SymbolSearchSchema = z.object({
  q: z.string().min(1, 'Query parameter is required').max(50, 'Query too long'),
  limit: z.coerce.number().min(1).max(50).optional(),
})

export const CandleQuerySchema = z
  .object({
    resolution: z.enum(['1', '5', '15', '30', '60', 'D', 'W', 'M']),
    from: z.coerce.number().int().positive('From timestamp must be positive'),
    to: z.coerce.number().int().positive('To timestamp must be positive'),
  })
  .refine(data => data.from < data.to, {
    message: 'From timestamp must be less than to timestamp',
  })

export const CandleParamsSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
})

export const QuoteParamsSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(20, 'Symbol too long'),
})

// Generic validation middleware factory
export function validateRequest<T extends z.ZodTypeAny>(
  schema: T,
  source: 'query' | 'params' | 'body' = 'query'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body

      const result = schema.safeParse(data)

      if (!result.success) {
        const errorDetails = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }))

        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          statusCode: 400,
          details: errorDetails,
        } as ApiError & { details: any })
      }

      // Add validated data to request object
      ;(req as any).validated = result.data
      next()
    } catch (error) {
      return res.status(500).json({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Internal validation error',
        statusCode: 500,
      } as ApiError)
    }
  }
}

// Combined validation for endpoints that use both params and query
export function validateCombined(paramsSchema: z.ZodTypeAny, querySchema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate params
      const paramsResult = paramsSchema.safeParse(req.params)
      if (!paramsResult.success) {
        const errorDetails = paramsResult.error.issues.map(issue => ({
          field: `params.${issue.path.join('.')}`,
          message: issue.message,
          code: issue.code,
        }))

        return res.status(400).json({
          code: 'PARAMS_VALIDATION_ERROR',
          message: 'Path parameters validation failed',
          statusCode: 400,
          details: errorDetails,
        } as ApiError & { details: any })
      }

      // Validate query
      const queryResult = querySchema.safeParse(req.query)
      if (!queryResult.success) {
        const errorDetails = queryResult.error.issues.map(issue => ({
          field: `query.${issue.path.join('.')}`,
          message: issue.message,
          code: issue.code,
        }))

        return res.status(400).json({
          code: 'QUERY_VALIDATION_ERROR',
          message: 'Query parameters validation failed',
          statusCode: 400,
          details: errorDetails,
        } as ApiError & { details: any })
      }

      // Combine validated data
      ;(req as any).validated = {
        ...paramsResult.data,
        ...queryResult.data,
      }

      next()
    } catch (error) {
      return res.status(500).json({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Internal validation error',
        statusCode: 500,
      } as ApiError)
    }
  }
}

// Pre-configured validation middlewares
export const validateSymbolSearch = validateRequest(SymbolSearchSchema, 'query')
export const validateCandleParams = validateCombined(CandleParamsSchema, CandleQuerySchema)
export const validateQuoteParams = validateRequest(QuoteParamsSchema, 'params')

// Type guards for validated requests
export interface ValidatedRequest<T> extends Request {
  validated: T
}

export type SymbolSearchRequest = ValidatedRequest<z.infer<typeof SymbolSearchSchema>>
export type CandleParamsRequest = ValidatedRequest<
  z.infer<typeof CandleParamsSchema> & z.infer<typeof CandleQuerySchema>
>
export type QuoteParamsRequest = ValidatedRequest<z.infer<typeof QuoteParamsSchema>>
