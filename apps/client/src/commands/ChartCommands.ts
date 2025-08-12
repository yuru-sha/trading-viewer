import { BaseCommand } from './BaseCommand'
import type { 
  ChartSettingsParams, 
  UpdateChartSettingsCommand, 
  AddIndicatorCommand as IAddIndicatorCommand, 
  RemoveIndicatorCommand as IRemoveIndicatorCommand 
} from '@trading-viewer/shared'

/**
 * Chart State Interface
 */
interface ChartState {
  timeframe: string
  chartType: 'candlestick' | 'line' | 'area'
  indicators: Map<string, IndicatorConfig>
  theme: 'light' | 'dark'
  settings: Record<string, any>
}

/**
 * Indicator Configuration
 */
interface IndicatorConfig {
  id: string
  type: string
  params: Record<string, any>
  visible: boolean
  createdAt: number
}

/**
 * Chart Context Interface
 */
interface IChartContext {
  getChartState(): ChartState
  updateChartSettings(settings: Partial<ChartState>): void
  addIndicator(config: IndicatorConfig): string
  removeIndicator(id: string): void
  updateIndicator(id: string, config: Partial<IndicatorConfig>): void
  getIndicator(id: string): IndicatorConfig | null
}

/**
 * Update Chart Settings Command
 */
export class ChartSettingsCommand extends BaseCommand<void, ChartSettingsParams> implements UpdateChartSettingsCommand {
  readonly type = 'UPDATE_CHART_SETTINGS'
  private context: IChartContext
  private previousSettings?: Partial<ChartState>

  constructor(params: ChartSettingsParams, context: IChartContext) {
    super('UPDATE_CHART_SETTINGS', params, true)
    this.context = context
  }

  protected async captureState(): Promise<Partial<ChartState>> {
    const currentState = this.context.getChartState()
    
    // Only capture the settings that will be changed
    const settingsToCapture: Partial<ChartState> = {}
    
    if (this.params.timeframe !== undefined) {
      settingsToCapture.timeframe = currentState.timeframe
    }
    if (this.params.chartType !== undefined) {
      settingsToCapture.chartType = currentState.chartType
    }
    if (this.params.theme !== undefined) {
      settingsToCapture.theme = currentState.theme
    }
    if (this.params.indicators !== undefined) {
      // Deep clone indicators map
      settingsToCapture.indicators = new Map(currentState.indicators)
    }

    this.previousSettings = settingsToCapture
    return settingsToCapture
  }

  async doExecute(): Promise<void> {
    const updateData: Partial<ChartState> = {}

    if (this.params.timeframe) {
      updateData.timeframe = this.params.timeframe
    }
    if (this.params.chartType) {
      updateData.chartType = this.params.chartType
    }
    if (this.params.theme) {
      updateData.theme = this.params.theme
    }
    if (this.params.indicators) {
      // Convert indicator names to actual indicator configs
      const indicatorMap = new Map<string, IndicatorConfig>()
      this.params.indicators.forEach((indicatorType, index) => {
        const id = `indicator_${Date.now()}_${index}`
        indicatorMap.set(id, {
          id,
          type: indicatorType,
          params: {},
          visible: true,
          createdAt: Date.now(),
        })
      })
      updateData.indicators = indicatorMap
    }

    this.context.updateChartSettings(updateData)
  }

  protected async doUndo(): Promise<void> {
    if (this.previousSettings) {
      this.context.updateChartSettings(this.previousSettings)
    }
  }

  protected async doRedo(): Promise<void> {
    return this.doExecute()
  }

  validate(): boolean | string {
    if (!this.params || Object.keys(this.params).length === 0) {
      return 'At least one chart setting must be provided'
    }

    if (this.params.timeframe && !this.isValidTimeframe(this.params.timeframe)) {
      return 'Invalid timeframe specified'
    }

    if (this.params.chartType && !['candlestick', 'line', 'area'].includes(this.params.chartType)) {
      return 'Invalid chart type specified'
    }

    if (this.params.theme && !['light', 'dark'].includes(this.params.theme)) {
      return 'Invalid theme specified'
    }

    return true
  }

  private isValidTimeframe(timeframe: string): boolean {
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']
    return validTimeframes.includes(timeframe)
  }
}

/**
 * Add Indicator Command
 */
export class AddIndicatorCommand extends BaseCommand<string, { type: string; params: Record<string, any> }> implements AddIndicatorCommand {
  readonly type = 'ADD_INDICATOR'
  private context: IChartContext
  private addedIndicatorId?: string

  constructor(params: { type: string; params: Record<string, any> }, context: IChartContext) {
    super('ADD_INDICATOR', params, true)
    this.context = context
  }

  async doExecute(): Promise<string> {
    const indicatorConfig: IndicatorConfig = {
      id: this.generateIndicatorId(),
      type: this.params.type,
      params: { ...this.params.params },
      visible: true,
      createdAt: Date.now(),
    }

    this.addedIndicatorId = this.context.addIndicator(indicatorConfig)
    return this.addedIndicatorId
  }

  protected async doUndo(): Promise<void> {
    if (this.addedIndicatorId) {
      this.context.removeIndicator(this.addedIndicatorId)
    }
  }

  protected async doRedo(): Promise<string> {
    if (this.addedIndicatorId) {
      const existingIndicator = this.context.getIndicator(this.addedIndicatorId)
      if (!existingIndicator) {
        // Indicator was removed, recreate it
        return this.doExecute()
      }
      // Indicator still exists, just make it visible
      this.context.updateIndicator(this.addedIndicatorId, { visible: true })
      return this.addedIndicatorId
    }
    return this.doExecute()
  }

  validate(): boolean | string {
    if (!this.params.type) {
      return 'Indicator type is required'
    }

    if (!this.isValidIndicatorType(this.params.type)) {
      return `Unsupported indicator type: ${this.params.type}`
    }

    // Validate indicator-specific parameters
    const validationResult = this.validateIndicatorParams(this.params.type, this.params.params)
    if (validationResult !== true) {
      return validationResult
    }

    return true
  }

  private generateIndicatorId(): string {
    return `${this.params.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private isValidIndicatorType(type: string): boolean {
    const validTypes = ['SMA', 'EMA', 'RSI', 'MACD', 'BB', 'STOCH', 'ADX', 'CCI', 'MFI', 'ATR']
    return validTypes.includes(type.toUpperCase())
  }

  private validateIndicatorParams(type: string, params: Record<string, any>): boolean | string {
    switch (type.toUpperCase()) {
      case 'SMA':
      case 'EMA':
        if (!params.period || typeof params.period !== 'number' || params.period < 1) {
          return 'Period must be a positive number'
        }
        break
      
      case 'RSI':
        if (!params.period || typeof params.period !== 'number' || params.period < 2) {
          return 'RSI period must be at least 2'
        }
        break
      
      case 'BB':
        if (!params.period || typeof params.period !== 'number' || params.period < 2) {
          return 'Bollinger Bands period must be at least 2'
        }
        if (!params.stdDev || typeof params.stdDev !== 'number' || params.stdDev <= 0) {
          return 'Standard deviation must be positive'
        }
        break
      
      case 'MACD':
        if (!params.fastPeriod || !params.slowPeriod || !params.signalPeriod) {
          return 'MACD requires fastPeriod, slowPeriod, and signalPeriod'
        }
        break
    }

    return true
  }
}

/**
 * Remove Indicator Command
 */
export class RemoveIndicatorCommand extends BaseCommand<void, { id: string }> implements RemoveIndicatorCommand {
  readonly type = 'REMOVE_INDICATOR'
  private context: IChartContext
  private removedIndicator?: IndicatorConfig

  constructor(params: { id: string }, context: IChartContext) {
    super('REMOVE_INDICATOR', params, true)
    this.context = context
  }

  protected async captureState(): Promise<IndicatorConfig | null> {
    const indicator = this.context.getIndicator(this.params.id)
    if (indicator) {
      this.removedIndicator = { ...indicator }
      return this.removedIndicator
    }
    return null
  }

  async doExecute(): Promise<void> {
    this.context.removeIndicator(this.params.id)
  }

  protected async doUndo(): Promise<void> {
    if (this.removedIndicator) {
      this.context.addIndicator(this.removedIndicator)
    }
  }

  protected async doRedo(): Promise<void> {
    this.context.removeIndicator(this.params.id)
  }

  validate(): boolean | string {
    if (!this.params.id) {
      return 'Indicator ID is required'
    }

    if (!this.context.getIndicator(this.params.id)) {
      return 'Indicator not found'
    }

    return true
  }
}

/**
 * Batch Chart Command - executes multiple chart operations
 */
export class BatchChartCommand extends BaseCommand<void, { commands: BaseCommand[] }> {
  readonly type = 'BATCH_CHART'
  private executedCommands: BaseCommand[] = []

  constructor(commands: BaseCommand[]) {
    super('BATCH_CHART', { commands }, true)
  }

  async doExecute(): Promise<void> {
    this.executedCommands = []
    
    for (const command of this.params.commands) {
      try {
        await command.execute()
        this.executedCommands.push(command)
      } catch (error) {
        // Rollback executed commands
        for (let i = this.executedCommands.length - 1; i >= 0; i--) {
          try {
            if (this.executedCommands[i].canUndo && this.executedCommands[i].undo) {
              await this.executedCommands[i].undo!()
            }
          } catch (undoError) {
            console.error('Failed to rollback chart command:', undoError)
          }
        }
        throw error
      }
    }
  }

  protected async doUndo(): Promise<void> {
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const command = this.executedCommands[i]
      if (command.canUndo && command.undo) {
        try {
          await command.undo()
        } catch (error) {
          console.error(`Failed to undo chart command ${command.id}:`, error)
        }
      }
    }
  }

  protected async doRedo(): Promise<void> {
    for (const command of this.executedCommands) {
      try {
        if (command.redo) {
          await command.redo()
        } else {
          await command.execute()
        }
      } catch (error) {
        console.error(`Failed to redo chart command ${command.id}:`, error)
        throw error
      }
    }
  }

  validate(): boolean | string {
    if (!this.params.commands || this.params.commands.length === 0) {
      return 'At least one command is required'
    }

    for (const command of this.params.commands) {
      if (command.validate) {
        const result = command.validate()
        if (result !== true) {
          return `Invalid chart command: ${result}`
        }
      }
    }

    return true
  }
}