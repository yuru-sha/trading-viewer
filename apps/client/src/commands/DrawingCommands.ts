import { BaseCommand } from './BaseCommand'
import type {
  DrawingCommandParams,
  CreateDrawingCommand,
  UpdateDrawingCommand,
  DeleteDrawingCommand,
  DrawingToolType,
} from '@trading-viewer/shared'

/**
 * Drawing Tool State Interface
 */
interface DrawingToolState {
  id: string
  type: DrawingToolType
  startPoint: { x: number; y: number }
  endPoint?: { x: number; y: number }
  properties: Record<string, any>
  visible: boolean
  createdAt: number
}

/**
 * Drawing Context Interface
 */
interface IDrawingContext {
  addDrawingTool(tool: DrawingToolState): string
  updateDrawingTool(id: string, properties: Record<string, any>): void
  removeDrawingTool(id: string): void
  getDrawingTool(id: string): DrawingToolState | null
  getAllDrawingTools(): DrawingToolState[]
}

/**
 * Create Drawing Tool Command
 */
export class CreateDrawingToolCommand
  extends BaseCommand<string, DrawingCommandParams>
  implements CreateDrawingCommand
{
  readonly type = 'CREATE_DRAWING'
  private context: IDrawingContext
  private createdId?: string

  constructor(params: DrawingCommandParams, context: IDrawingContext) {
    super('CREATE_DRAWING', params, true)
    this.context = context
  }

  async doExecute(): Promise<string> {
    const tool: DrawingToolState = {
      id: this.generateToolId(),
      type: this.params.toolType,
      startPoint: this.params.startPoint,
      endPoint: this.params.endPoint,
      properties: { ...this.params.properties },
      visible: true,
      createdAt: Date.now(),
    }

    this.createdId = this.context.addDrawingTool(tool)
    return this.createdId
  }

  protected async doUndo(): Promise<void> {
    if (this.createdId) {
      this.context.removeDrawingTool(this.createdId)
    }
  }

  protected async doRedo(): Promise<string> {
    if (this.createdId) {
      const tool = this.context.getDrawingTool(this.createdId)
      if (!tool) {
        // Tool was removed, recreate it
        return this.doExecute()
      }
      // Tool still exists, just make it visible
      this.context.updateDrawingTool(this.createdId, { visible: true })
      return this.createdId
    }
    return this.doExecute()
  }

  validate(): boolean | string {
    if (!this.params.toolType) {
      return 'Tool type is required'
    }
    if (!this.params.startPoint) {
      return 'Start point is required'
    }
    if (!this.isValidPoint(this.params.startPoint)) {
      return 'Invalid start point coordinates'
    }
    if (this.params.endPoint && !this.isValidPoint(this.params.endPoint)) {
      return 'Invalid end point coordinates'
    }
    return true
  }

  private generateToolId(): string {
    return `${this.params.toolType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private isValidPoint(point: { x: number; y: number }): boolean {
    return (
      typeof point.x === 'number' &&
      typeof point.y === 'number' &&
      !isNaN(point.x) &&
      !isNaN(point.y)
    )
  }
}

/**
 * Update Drawing Tool Command
 */
export class UpdateDrawingToolCommand
  extends BaseCommand<void, { id: string; properties: Record<string, any> }>
  implements UpdateDrawingCommand
{
  readonly type = 'UPDATE_DRAWING'
  private context: IDrawingContext
  private originalProperties?: Record<string, any>

  constructor(params: { id: string; properties: Record<string, any> }, context: IDrawingContext) {
    super('UPDATE_DRAWING', params, true)
    this.context = context
  }

  protected async captureState(): Promise<Record<string, any> | null> {
    const tool = this.context.getDrawingTool(this.params.id)
    if (tool) {
      this.originalProperties = { ...tool.properties }
      return this.originalProperties
    }
    return null
  }

  async doExecute(): Promise<void> {
    this.context.updateDrawingTool(this.params.id, this.params.properties)
  }

  protected async doUndo(): Promise<void> {
    if (this.originalProperties) {
      this.context.updateDrawingTool(this.params.id, this.originalProperties)
    }
  }

  protected async doRedo(): Promise<void> {
    this.context.updateDrawingTool(this.params.id, this.params.properties)
  }

  validate(): boolean | string {
    if (!this.params.id) {
      return 'Drawing tool ID is required'
    }
    if (!this.params.properties || Object.keys(this.params.properties).length === 0) {
      return 'Properties to update are required'
    }
    if (!this.context.getDrawingTool(this.params.id)) {
      return 'Drawing tool not found'
    }
    return true
  }
}

/**
 * Delete Drawing Tool Command
 */
export class DeleteDrawingToolCommand
  extends BaseCommand<void, { id: string }>
  implements DeleteDrawingCommand
{
  readonly type = 'DELETE_DRAWING'
  private context: IDrawingContext
  private deletedTool?: DrawingToolState

  constructor(params: { id: string }, context: IDrawingContext) {
    super('DELETE_DRAWING', params, true)
    this.context = context
  }

  protected async captureState(): Promise<DrawingToolState | null> {
    const tool = this.context.getDrawingTool(this.params.id)
    if (tool) {
      this.deletedTool = { ...tool }
      return this.deletedTool
    }
    return null
  }

  async doExecute(): Promise<void> {
    this.context.removeDrawingTool(this.params.id)
  }

  protected async doUndo(): Promise<void> {
    if (this.deletedTool) {
      this.context.addDrawingTool(this.deletedTool)
    }
  }

  protected async doRedo(): Promise<void> {
    this.context.removeDrawingTool(this.params.id)
  }

  validate(): boolean | string {
    if (!this.params.id) {
      return 'Drawing tool ID is required'
    }
    if (!this.context.getDrawingTool(this.params.id)) {
      return 'Drawing tool not found'
    }
    return true
  }
}

/**
 * Batch Drawing Command - executes multiple drawing operations as a unit
 */
export class BatchDrawingCommand extends BaseCommand<void, { commands: BaseCommand[] }> {
  readonly type = 'BATCH_DRAWING'
  private executedCommands: BaseCommand[] = []

  constructor(commands: BaseCommand[]) {
    super('BATCH_DRAWING', { commands }, true)
  }

  async doExecute(): Promise<void> {
    this.executedCommands = []

    for (const command of this.params.commands) {
      try {
        await command.execute()
        this.executedCommands.push(command)
      } catch {
        // Rollback executed commands
        for (let i = this.executedCommands.length - 1; i >= 0; i--) {
          try {
            if (this.executedCommands[i].canUndo) {
              await this.executedCommands[i].undo!()
            }
          } catch (undoError) {
            console.error('Failed to rollback command during batch execution:', undoError)
          }
        }
        throw new Error('Operation failed')
      }
    }
  }

  protected async doUndo(): Promise<void> {
    // Undo commands in reverse order
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const command = this.executedCommands[i]
      if (command.canUndo && command.undo) {
        try {
          await command.undo()
        } catch {
          console.error('Operation failed')
        }
      }
    }
  }

  protected async doRedo(): Promise<void> {
    // Redo commands in original order
    for (const command of this.executedCommands) {
      try {
        if (command.redo) {
          await command.redo()
        } else {
          await command.execute()
        }
      } catch {
        console.error('Operation failed')
        throw new Error('Operation failed')
      }
    }
  }

  validate(): boolean | string {
    if (!this.params.commands || this.params.commands.length === 0) {
      return 'At least one command is required for batch execution'
    }

    // Validate all commands
    for (const command of this.params.commands) {
      if (command.validate) {
        const result = command.validate()
        if (result !== true) {
          return `Invalid command ${command.id}: ${result}`
        }
      }
    }

    return true
  }
}
