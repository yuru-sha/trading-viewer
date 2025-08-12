import type { UserIndicators } from '@trading-viewer/shared'

/**
 * User preferences service interface - handles user-specific data
 * Follows Single Responsibility Principle
 */

export interface UserPreferences {
  userId: string
  theme: string
  chartType: string
  timeframe: string
  indicators: UserIndicators
}

export interface IUserPreferencesService {
  /**
   * Get user preferences by user ID
   * @param userId - User identifier
   * @returns User preferences or null if not found
   */
  getUserPreferences(userId: string): Promise<UserPreferences | null>

  /**
   * Update user preferences
   * @param userId - User identifier
   * @param preferences - Partial preferences to update
   * @returns Updated user preferences
   */
  updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences>

  /**
   * Get user's technical indicators configuration
   * @param userId - User identifier
   * @returns Array of user indicators
   */
  getUserIndicators(userId: string): Promise<UserIndicators>

  /**
   * Update user's indicators configuration
   * @param userId - User identifier
   * @param indicators - New indicators configuration
   */
  updateUserIndicators(userId: string, indicators: UserIndicators): Promise<void>

  /**
   * Add a new indicator to user's configuration
   * @param userId - User identifier
   * @param indicator - Indicator to add
   */
  addUserIndicator(userId: string, indicator: UserIndicators[0]): Promise<void>

  /**
   * Remove an indicator from user's configuration
   * @param userId - User identifier
   * @param indicatorName - Name of indicator to remove
   */
  removeUserIndicator(userId: string, indicatorName: string): Promise<void>

  /**
   * Reset user preferences to defaults
   * @param userId - User identifier
   * @returns Reset user preferences
   */
  resetUserPreferences(userId: string): Promise<UserPreferences>

  /**
   * Get default preferences for new users
   * @returns Default user preferences
   */
  getDefaultPreferences(): UserPreferences

  /**
   * Export user preferences as JSON
   * @param userId - User identifier
   * @returns JSON string of user preferences
   */
  exportUserPreferences(userId: string): Promise<string>

  /**
   * Import user preferences from JSON
   * @param userId - User identifier
   * @param preferencesJson - JSON string of preferences
   * @returns Updated user preferences
   */
  importUserPreferences(userId: string, preferencesJson: string): Promise<UserPreferences>
}