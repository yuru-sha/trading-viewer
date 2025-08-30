import { Request, Response, NextFunction } from 'express'
import { httpLogger, errorLogger as winstonErrorLogger } from '../utils/logger.js'

// Export Winston-based loggers for consistency
export const requestLogger = httpLogger
export const errorLogger = winstonErrorLogger
