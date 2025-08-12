/**
 * Separated service interfaces following Interface Segregation Principle
 * Each interface has a single, focused responsibility
 */

export * from './ISymbolService'
export * from './IQuoteService'
export * from './ICandleDataService'
export * from './IUserPreferencesService'
export * from './IDataManagementService'

// Composite service interface for cases where you need all services
// This maintains backward compatibility while encouraging proper separation
export interface IDataServiceComposite {
  symbols: import('./ISymbolService').ISymbolService
  quotes: import('./IQuoteService').IQuoteService
  candleData: import('./ICandleDataService').ICandleDataService
  userPreferences: import('./IUserPreferencesService').IUserPreferencesService
  dataManagement: import('./IDataManagementService').IDataManagementService
}