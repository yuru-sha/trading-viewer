export interface DomainEvent {
  readonly eventId: string
  readonly occurredAt: Date
  readonly eventType: string
}

export class UserLoggedIn implements DomainEvent {
  readonly eventId: string
  readonly occurredAt: Date
  readonly eventType = 'UserLoggedIn'

  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {
    this.eventId = crypto.randomUUID()
    this.occurredAt = new Date()
  }
}

export class ChartDrawingAdded implements DomainEvent {
  readonly eventId: string
  readonly occurredAt: Date
  readonly eventType = 'ChartDrawingAdded'

  constructor(
    public readonly userId: string,
    public readonly symbol: string,
    public readonly drawingId: string
  ) {
    this.eventId = crypto.randomUUID()
    this.occurredAt = new Date()
  }
}

export class AlertTriggered implements DomainEvent {
  readonly eventId: string
  readonly occurredAt: Date
  readonly eventType = 'AlertTriggered'

  constructor(
    public readonly alertId: string,
    public readonly userId: string,
    public readonly symbol: string,
    public readonly targetPrice: number,
    public readonly currentPrice: number
  ) {
    this.eventId = crypto.randomUUID()
    this.occurredAt = new Date()
  }
}
