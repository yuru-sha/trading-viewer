import { BaseCommand } from './BaseCommand'
import { log } from '../services/logger'
import type {
  DrawingCommandParams,
  CreateDrawingCommand,
  UpdateDrawingCommand,
  DeleteDrawingCommand,
  DrawingToolType,
  DrawingObject,
} from '@trading-viewer/shared'

/**
 * Drawing Tool State Interface
 */
interface DrawingToolState {
  id: string
  type: DrawingToolType
  startPoint: { x: number; y: number }
  endPoint?: { x: number; y: number }
  properties: Record<string, unknown>
  visible: boolean
  createdAt: number
}

/**
 * Drawing Context Interface
 */
interface IDrawingContext {
  addDrawingTool(tool: DrawingToolState): string
  updateDrawingTool(id: string, properties: Record<string, unknown>): void
  removeDrawingTool(id: string): void
  getDrawingTool(id: string): DrawingToolState | null
  getAllDrawingTools(): DrawingToolState[]
}

/**
 * Create Drawing Tool Command
 */
export class CreateDrawingToolCommand
  extends BaseCommand<DrawingObject, DrawingCommandParams>
  implements CreateDrawingCommand
{
  readonly type = 'CREATE_DRAWING'
  private context: IDrawingContext
  private createdId?: string

  constructor(params: DrawingCommandParams, context: IDrawingContext) {
    super('CREATE_DRAWING', params, true)
    this.context = context
  }

  async doExecute(): Promise<DrawingObject> {
    const drawingTool: DrawingToolState = {
      id: this.generateToolId(),
      type: this.params.toolType,
      startPoint: { x: this.params.startPoint.x, y: this.params.startPoint.y },
      endPoint: this.params.endPoint,
      properties: {
        ...this.params.properties,
        color: this.params.properties?.color || '#3b82f6',
        lineWidth: this.params.properties?.lineWidth || 2,
      },
      visible: this.params.properties?.visible !== false,
      createdAt: Date.now(),
    }

    this.createdId = this.context.addDrawingTool(drawingTool)

    // Convert to DrawingObject for return
    const drawingObject: DrawingObject = {
      id: drawingTool.id,
      type: drawingTool.type,
      points: [drawingTool.startPoint, ...(drawingTool.endPoint ? [drawingTool.endPoint] : [])],
      style: {
        color: (drawingTool.properties?.color as string) || '#3b82f6',
        lineWidth: (drawingTool.properties?.lineWidth as number) || 2,
      },
      locked: false,
      visible: drawingTool.visible,
      zIndex: (drawingTool.properties?.zIndex as number) || 0,
      createdAt: drawingTool.createdAt,
      updatedAt: drawingTool.createdAt,
    }

    return drawingObject
  }

  protected async doUndo(): Promise<DrawingCommandParams> {
    if (this.createdId) {
      this.context.removeDrawingTool(this.createdId)
    }
    return this.params
  }

  protected async doRedo(): Promise<DrawingObject> {
    if (this.createdId) {
      const tool = this.context.getDrawingTool(this.createdId)
      if (!tool) {
        // Tool was removed, recreate it
        return this.doExecute()
      }
      // Tool still exists, just make it visible
      this.context.updateDrawingTool(this.createdId, { visible: true })
      return tool as unknown as DrawingObject
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
  extends BaseCommand<void, { drawingId: string; updates: Record<string, unknown> }>
  implements UpdateDrawingCommand
{
  readonly type = 'UPDATE_DRAWING'
  readonly drawingId: string
  readonly updates: Record<string, unknown>
  private context: IDrawingContext
  private originalProperties?: Record<string, unknown>

  constructor(
    params: { drawingId: string; updates: Record<string, unknown> },
    context: IDrawingContext
  ) {
    super('UPDATE_DRAWING', params, true)
    this.context = context
    this.drawingId = params.drawingId
    this.updates = params.updates
  }

  protected async captureState(): Promise<Record<string, unknown> | null> {
    const tool = this.context.getDrawingTool(this.params.drawingId)
    if (tool) {
      this.originalProperties = { ...tool.properties }
      return this.originalProperties
    }
    return null
  }

  async doExecute(): Promise<void> {
    this.context.updateDrawingTool(this.params.drawingId, this.params.updates)
  }

  protected doUndo(): { drawingId: string; updates: Record<string, unknown> } {
    if (this.originalProperties) {
      this.context.updateDrawingTool(this.params.drawingId, this.originalProperties)
    }
    return this.params
  }

  protected async doRedo(): Promise<void> {
    this.context.updateDrawingTool(this.params.drawingId, this.params.updates)
  }

  validate(): boolean | string {
    if (!this.params.drawingId) {
      return 'Drawing tool ID is required'
    }
    if (!this.params.updates || Object.keys(this.params.updates).length === 0) {
      return 'Properties to update are required'
    }
    if (!this.context.getDrawingTool(this.params.drawingId)) {
      return 'Drawing tool not found'
    }
    return true
  }
}

/**
 * Delete Drawing Tool Command
 */
export class DeleteDrawingToolCommand
  extends BaseCommand<boolean, { drawingId: string }>
  implements DeleteDrawingCommand
{
  readonly type = 'DELETE_DRAWING'
  readonly drawingId: string
  private context: IDrawingContext
  private deletedTool?: DrawingToolState

  constructor(params: { drawingId: string }, context: IDrawingContext) {
    super('DELETE_DRAWING', params, true)
    this.context = context
    this.drawingId = params.drawingId
  }

  protected async captureState(): Promise<DrawingToolState | null> {
    const tool = this.context.getDrawingTool(this.params.drawingId)
    if (tool) {
      this.deletedTool = { ...tool }
      return this.deletedTool
    }
    return null
  }

  async doExecute(): Promise<boolean> {
    try {
      this.context.removeDrawingTool(this.params.drawingId)
      return true
    } catch {
      return false
    }
  }

  protected doUndo(): { drawingId: string } {
    if (this.deletedTool) {
      this.context.addDrawingTool(this.deletedTool)
    }
    return this.params
  }

  protected async doRedo(): Promise<boolean> {
    return this.doExecute()
  }

  validate(): boolean | string {
    if (!this.params.drawingId) {
      return 'Drawing tool ID is required'
    }
    if (!this.context.getDrawingTool(this.params.drawingId)) {
      return 'Drawing tool not found'
    }
    return true
  }
}

/**
 * Batch Drawing Command - executes multiple drawing operations as a unit
 */
export class BatchDrawingCommand extends BaseCommand<
  void,
  { commands: BaseCommand<unknown, unknown>[] }
> {
  readonly type = 'BATCH_DRAWING'
  private executedCommands: BaseCommand<unknown, unknown>[] = []

  constructor(commands: BaseCommand<unknown, unknown>[]) {
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
            log.system.error(
              'Failed to rollback drawing command during batch execution',
              undoError instanceof Error ? undoError : new Error(String(undoError))
            )
          }
        }
        throw new Error('Operation failed')
      }
    }
  }

  protected doUndo(): { commands: BaseCommand<unknown, unknown>[] } {
    // Undo commands in reverse order
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const command = this.executedCommands[i]
      if (command.canUndo && command.undo) {
        try {
          command.undo()
        } catch {
          log.system.error('Drawing command batch undo operation failed')
        }
      }
    }
    return this.params
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
        log.system.error('Drawing command batch redo operation failed')
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
