import { BaseCommand } from './BaseCommand'
import type {
  UserPreferencesParams,
  UpdateUserPreferencesCommand as IUpdateUserPreferencesCommand,
} from '@trading-viewer/shared'

/**
 * User Preferences State Interface
 */
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  notifications: boolean
  autoSave: boolean
  chartDefaults: {
    timeframe: string
    chartType: 'candlestick' | 'line' | 'area'
    indicators: string[]
  }
  drawingDefaults: {
    lineColor: string
    lineWidth: number
    fillColor: string
    textSize: number
  }
  customSettings: Record<string, any>
  lastModified: number
}

/**
 * User Preferences Context Interface
 */
interface IUserPreferencesContext {
  getUserPreferences(): UserPreferences
  updateUserPreferences(preferences: Partial<UserPreferences>): void
  resetUserPreferences(): void
  exportUserPreferences(): string
  importUserPreferences(data: string): void
  getPreference<T>(key: string, defaultValue?: T): T
  setPreference(key: string, value: any): void
}

/**
 * Update User Preferences Command
 */
export class UpdateUserPreferencesCommand
  extends BaseCommand<void, UserPreferencesParams>
  implements UpdateUserPreferencesCommand
{
  readonly type = 'UPDATE_USER_PREFERENCES'
  private context: IUserPreferencesContext
  private previousPreferences?: Partial<UserPreferences>

  constructor(params: UserPreferencesParams, context: IUserPreferencesContext) {
    super('UPDATE_USER_PREFERENCES', params, true)
    this.context = context
  }

  protected async captureState(): Promise<Partial<UserPreferences>> {
    const currentPreferences = this.context.getUserPreferences()

    // Only capture the preferences that will be changed
    const preferencesToCapture: Partial<UserPreferences> = {}

    Object.keys(this.params).forEach(key => {
      if (key in currentPreferences) {
        ;(preferencesToCapture as any)[key] = (currentPreferences as any)[key]
      }
    })

    this.previousPreferences = preferencesToCapture
    return preferencesToCapture
  }

  async doExecute(): Promise<void> {
    const updateData = {
      ...this.params,
      lastModified: Date.now(),
    }

    this.context.updateUserPreferences(updateData)
  }

  protected async doUndo(): Promise<void> {
    if (this.previousPreferences) {
      this.context.updateUserPreferences(this.previousPreferences)
    }
  }

  protected async doRedo(): Promise<void> {
    return this.doExecute()
  }

  validate(): boolean | string {
    if (!this.params || Object.keys(this.params).length === 0) {
      return 'At least one preference must be provided'
    }

    // Validate theme
    if (this.params.theme && !['light', 'dark', 'auto'].includes(this.params.theme)) {
      return 'Invalid theme. Must be light, dark, or auto'
    }

    // Validate language
    if (this.params.language && !this.isValidLanguageCode(this.params.language)) {
      return 'Invalid language code'
    }

    // Validate boolean values
    if (this.params.notifications !== undefined && typeof this.params.notifications !== 'boolean') {
      return 'Notifications setting must be a boolean'
    }

    if (this.params.autoSave !== undefined && typeof this.params.autoSave !== 'boolean') {
      return 'Auto-save setting must be a boolean'
    }

    // Validate nested objects
    if (this.params.chartDefaults && !this.validateChartDefaults(this.params.chartDefaults)) {
      return 'Invalid chart defaults configuration'
    }

    if (this.params.drawingDefaults && !this.validateDrawingDefaults(this.params.drawingDefaults)) {
      return 'Invalid drawing defaults configuration'
    }

    return true
  }

  private isValidLanguageCode(language: string): boolean {
    // Basic validation for common language codes
    const validLanguages = [
      'en',
      'ja',
      'zh',
      'ko',
      'es',
      'fr',
      'de',
      'it',
      'pt',
      'ru',
      'en-US',
      'en-GB',
      'ja-JP',
      'zh-CN',
      'zh-TW',
      'ko-KR',
    ]
    return validLanguages.includes(language)
  }

  private validateChartDefaults(chartDefaults: any): boolean {
    if (typeof chartDefaults !== 'object') {
      return false
    }

    if (chartDefaults.timeframe && !this.isValidTimeframe(chartDefaults.timeframe)) {
      return false
    }

    if (
      chartDefaults.chartType &&
      !['candlestick', 'line', 'area'].includes(chartDefaults.chartType)
    ) {
      return false
    }

    if (chartDefaults.indicators && !Array.isArray(chartDefaults.indicators)) {
      return false
    }

    return true
  }

  private validateDrawingDefaults(drawingDefaults: any): boolean {
    if (typeof drawingDefaults !== 'object') {
      return false
    }

    if (drawingDefaults.lineColor && !this.isValidColor(drawingDefaults.lineColor)) {
      return false
    }

    if (drawingDefaults.fillColor && !this.isValidColor(drawingDefaults.fillColor)) {
      return false
    }

    if (
      drawingDefaults.lineWidth &&
      (typeof drawingDefaults.lineWidth !== 'number' || drawingDefaults.lineWidth < 1)
    ) {
      return false
    }

    if (
      drawingDefaults.textSize &&
      (typeof drawingDefaults.textSize !== 'number' || drawingDefaults.textSize < 8)
    ) {
      return false
    }

    return true
  }

  private isValidTimeframe(timeframe: string): boolean {
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']
    return validTimeframes.includes(timeframe)
  }

  private isValidColor(color: string): boolean {
    // Basic color validation (hex, rgb, rgba, named colors)
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/
    const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0|1|0?\.\d+)\s*\)$/
    const namedColors = [
      'red',
      'green',
      'blue',
      'yellow',
      'orange',
      'purple',
      'pink',
      'brown',
      'black',
      'white',
      'gray',
    ]

    return (
      hexPattern.test(color) ||
      rgbPattern.test(color) ||
      rgbaPattern.test(color) ||
      namedColors.includes(color.toLowerCase())
    )
  }
}

/**
 * Reset User Preferences Command
 */
export class ResetUserPreferencesCommand extends BaseCommand<void, {}> {
  readonly type = 'RESET_USER_PREFERENCES'
  private context: IUserPreferencesContext
  private backupPreferences?: UserPreferences

  constructor(context: IUserPreferencesContext) {
    super('RESET_USER_PREFERENCES', {}, true)
    this.context = context
  }

  protected async captureState(): Promise<UserPreferences> {
    this.backupPreferences = this.context.getUserPreferences()
    return this.backupPreferences
  }

  async doExecute(): Promise<void> {
    this.context.resetUserPreferences()
  }

  protected async doUndo(): Promise<void> {
    if (this.backupPreferences) {
      this.context.updateUserPreferences(this.backupPreferences)
    }
  }

  protected async doRedo(): Promise<void> {
    this.context.resetUserPreferences()
  }
}

/**
 * Import User Preferences Command
 */
export class ImportUserPreferencesCommand extends BaseCommand<void, { data: string }> {
  readonly type = 'IMPORT_USER_PREFERENCES'
  private context: IUserPreferencesContext
  private backupPreferences?: UserPreferences

  constructor(params: { data: string }, context: IUserPreferencesContext) {
    super('IMPORT_USER_PREFERENCES', params, true)
    this.context = context
  }

  protected async captureState(): Promise<UserPreferences> {
    this.backupPreferences = this.context.getUserPreferences()
    return this.backupPreferences
  }

  async doExecute(): Promise<void> {
    this.context.importUserPreferences(this.params.data)
  }

  protected async doUndo(): Promise<void> {
    if (this.backupPreferences) {
      this.context.updateUserPreferences(this.backupPreferences)
    }
  }

  protected async doRedo(): Promise<void> {
    this.context.importUserPreferences(this.params.data)
  }

  validate(): boolean | string {
    if (!this.params.data) {
      return 'Import data is required'
    }

    try {
      const importedData = JSON.parse(this.params.data)

      // Basic validation of imported data structure
      if (typeof importedData !== 'object') {
        return 'Invalid import data format'
      }

      // Validate required fields
      const requiredFields = ['theme', 'language', 'notifications', 'autoSave']
      for (const field of requiredFields) {
        if (!(field in importedData)) {
          return `Missing required field: ${field}`
        }
      }

      return true
    } catch (error) {
      return 'Invalid JSON format in import data'
    }
  }
}

/**
 * Export User Preferences Command
 */
export class ExportUserPreferencesCommand extends BaseCommand<string, {}> {
  readonly type = 'EXPORT_USER_PREFERENCES'
  private context: IUserPreferencesContext

  constructor(context: IUserPreferencesContext) {
    super('EXPORT_USER_PREFERENCES', {}, false) // Export doesn't need undo
    this.context = context
  }

  async doExecute(): Promise<string> {
    return this.context.exportUserPreferences()
  }
}
