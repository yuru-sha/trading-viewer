import { SecurityEventType, SecuritySeverity } from '../services/securityLogger'
import { CIRCUIT_BREAKER_TIMEOUTS } from '@trading-viewer/shared'
import { SecureRandom } from '../services/encryption'

// Security Design Patterns Implementation

// 1. Circuit Breaker Pattern for preventing cascading failures
export class CircuitBreaker extends EventEmitter {
  private failureCount: number = 0
  private successCount: number = 0
  private nextAttempt: Date = new Date()
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private readonly failureThreshold: number = CIRCUIT_BREAKER_TIMEOUTS.FAILURE_THRESHOLD,
    private readonly timeout: number = CIRCUIT_BREAKER_TIMEOUTS.OPEN_STATE_TIMEOUT,
    private readonly monitoringPeriod: number = CIRCUIT_BREAKER_TIMEOUTS.MONITORING_PERIOD
  ) {
    super()
    this.startMonitoring()
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.emit('metrics', {
        state: this.state,
        failureCount: this.failureCount,
        successCount: this.successCount,
        failureRate: this.getFailureRate(),
      })

      // Reset counters periodically
      if (this.state === 'CLOSED') {
        this.failureCount = 0
        this.successCount = 0
      }
    }, this.monitoringPeriod)
  }

  private getFailureRate(): number {
    const total = this.failureCount + this.successCount
    return total === 0 ? 0 : this.failureCount / total
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt.getTime()) {
        throw new Error('Circuit breaker is OPEN')
      }
      this.state = 'HALF_OPEN'
      this.emit('stateChange', 'HALF_OPEN')
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.successCount++

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED'
      this.failureCount = 0
      this.emit('stateChange', 'CLOSED')
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.INFO,
        message: 'Circuit breaker closed - service recovered',
        metadata: { component: 'CircuitBreaker' },
      })
    }
  }

  private onFailure(): void {
    this.failureCount++

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
      this.nextAttempt = new Date(Date.now() + this.timeout)
      this.emit('stateChange', 'OPEN')

      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        message: 'Circuit breaker opened due to failures',
        metadata: {
          component: 'CircuitBreaker',
          failureCount: this.failureCount,
          threshold: this.failureThreshold,
        },
      })
    }
  }

  getState(): string {
    return this.state
  }

  getMetrics(): {
    state: string
    failureCount: number
    successCount: number
    failureRate: number
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate: this.getFailureRate(),
    }
  }
}

// 2. Secure Resource Pool Pattern
export class SecureResourcePool<T> {
  private available: T[] = []
  private inUse: Map<string, { resource: T; userId: string; createdAt: Date }> = new Map()
  private maxSize: number
  private maxUsageTime: number = 30 * 60 * 1000 // 30 minutes

  constructor(
    private createResource: () => Promise<T>,
    private validateResource: (resource: T) => Promise<boolean>,
    private destroyResource: (resource: T) => Promise<void>,
    maxSize: number = 10
  ) {
    this.maxSize = maxSize
    this.startCleanupTask()
  }

  private startCleanupTask(): void {
    // Clean up expired resources every 5 minutes
    setInterval(
      async () => {
        await this.cleanup()
      },
      5 * 60 * 1000
    )
  }

  async acquire(userId: string): Promise<{ resource: T; resourceId: string }> {
    // Check if user already has a resource
    for (const [resourceId, allocation] of this.inUse.entries()) {
      if (allocation.userId === userId) {
        // Extend usage time if resource is valid
        if (await this.validateResource(allocation.resource)) {
          allocation.createdAt = new Date()
          return { resource: allocation.resource, resourceId }
        } else {
          // Remove invalid resource
          await this.release(resourceId)
          break
        }
      }
    }

    let resource: T

    // Try to get from available pool
    if (this.available.length > 0) {
      resource = this.available.pop()!

      // Validate resource before use
      if (!(await this.validateResource(resource))) {
        await this.destroyResource(resource)
        resource = await this.createResource()
      }
    } else {
      // Create new resource if pool not at capacity
      if (this.inUse.size < this.maxSize) {
        resource = await this.createResource()
      } else {
        throw new Error('Resource pool exhausted')
      }
    }

    const resourceId = SecureRandom.generateUUID()
    this.inUse.set(resourceId, {
      resource,
      userId,
      createdAt: new Date(),
    })

    securityLogger.log({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.INFO,
      message: 'Resource acquired from pool',
      metadata: { resourceId, userId, poolSize: this.inUse.size },
    })

    return { resource, resourceId }
  }

  async release(resourceId: string): Promise<void> {
    const allocation = this.inUse.get(resourceId)
    if (!allocation) {
      return
    }

    this.inUse.delete(resourceId)

    // Validate resource before returning to pool
    if (await this.validateResource(allocation.resource)) {
      this.available.push(allocation.resource)
    } else {
      await this.destroyResource(allocation.resource)
    }

    securityLogger.log({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.INFO,
      message: 'Resource released to pool',
      metadata: { resourceId, userId: allocation.userId },
    })
  }

  private async cleanup(): Promise<void> {
    const now = new Date()
    const expiredResources: string[] = []

    for (const [resourceId, allocation] of this.inUse.entries()) {
      if (now.getTime() - allocation.createdAt.getTime() > this.maxUsageTime) {
        expiredResources.push(resourceId)
      }
    }

    for (const resourceId of expiredResources) {
      const allocation = this.inUse.get(resourceId)
      if (allocation) {
        await this.destroyResource(allocation.resource)
        this.inUse.delete(resourceId)

        securityLogger.log({
          eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.WARNING,
          message: 'Resource forcibly released due to timeout',
          metadata: { resourceId, userId: allocation.userId },
        })
      }
    }
  }

  getMetrics(): {
    available: number
    inUse: number
    total: number
    utilizationRate: number
  } {
    const available = this.available.length
    const inUse = this.inUse.size
    const total = available + inUse

    return {
      available,
      inUse,
      total,
      utilizationRate: total === 0 ? 0 : inUse / total,
    }
  }
}

// 3. Secure State Machine Pattern
export class SecureStateMachine<TState extends string, TEvent extends string> {
  private currentState: TState
  private transitions: Map<TState, Map<TEvent, TState>> = new Map()
  private guards: Map<string, (context: any) => boolean> = new Map()
  private actions: Map<string, (context: any) => void> = new Map()
  private stateHistory: Array<{ state: TState; timestamp: Date; userId?: string }> = []

  constructor(
    initialState: TState,
    private readonly userId?: string
  ) {
    this.currentState = initialState
    this.recordStateChange(initialState)
  }

  private recordStateChange(state: TState): void {
    this.stateHistory.push({
      state,
      timestamp: new Date(),
      userId: this.userId,
    })

    // Keep only last 100 state changes
    if (this.stateHistory.length > 100) {
      this.stateHistory.shift()
    }
  }

  // Define valid transitions
  addTransition(from: TState, event: TEvent, to: TState): void {
    if (!this.transitions.has(from)) {
      this.transitions.set(from, new Map())
    }
    this.transitions.get(from)!.set(event, to)
  }

  // Add guard condition
  addGuard(guardName: string, condition: (context: any) => boolean): void {
    this.guards.set(guardName, condition)
  }

  // Add action
  addAction(actionName: string, action: (context: any) => void): void {
    this.actions.set(actionName, action)
  }

  // Send event to state machine
  sendEvent(
    event: TEvent,
    context?: any,
    guardName?: string,
    actionName?: string
  ): { success: boolean; newState?: TState; error?: string } {
    const currentTransitions = this.transitions.get(this.currentState)

    if (!currentTransitions) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        message: 'Invalid state transition attempted - no transitions defined',
        metadata: {
          currentState: this.currentState,
          event,
          userId: this.userId,
        },
      })
      return { success: false, error: 'No transitions defined for current state' }
    }

    const targetState = currentTransitions.get(event)

    if (!targetState) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.WARNING,
        message: 'Invalid state transition attempted - invalid event',
        metadata: {
          currentState: this.currentState,
          event,
          userId: this.userId,
        },
      })
      return { success: false, error: 'Invalid event for current state' }
    }

    // Check guard condition
    if (guardName) {
      const guard = this.guards.get(guardName)
      if (guard && !guard(context)) {
        securityLogger.log({
          eventType: SecurityEventType.FORBIDDEN_ACCESS,
          severity: SecuritySeverity.HIGH,
          message: 'State transition blocked by guard condition',
          metadata: {
            currentState: this.currentState,
            event,
            targetState,
            guardName,
            userId: this.userId,
          },
        })
        return { success: false, error: 'Guard condition not met' }
      }
    }

    // Execute action
    if (actionName) {
      const action = this.actions.get(actionName)
      if (action) {
        try {
          action(context)
        } catch (error) {
          securityLogger.log({
            eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
            severity: SecuritySeverity.HIGH,
            message: 'Action execution failed during state transition',
            metadata: {
              currentState: this.currentState,
              event,
              targetState,
              actionName,
              error: error.message,
              userId: this.userId,
            },
          })
          return { success: false, error: 'Action execution failed' }
        }
      }
    }

    // Perform transition
    const previousState = this.currentState
    this.currentState = targetState
    this.recordStateChange(targetState)

    securityLogger.log({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.INFO,
      message: 'State transition completed',
      metadata: {
        previousState,
        newState: targetState,
        event,
        userId: this.userId,
      },
    })

    return { success: true, newState: targetState }
  }

  getCurrentState(): TState {
    return this.currentState
  }

  getStateHistory(): Array<{ state: TState; timestamp: Date; userId?: string }> {
    return [...this.stateHistory]
  }

  // Check if a transition is valid
  canTransition(event: TEvent): boolean {
    const currentTransitions = this.transitions.get(this.currentState)
    return currentTransitions?.has(event) ?? false
  }
}

// 4. Secure Cache with TTL and Size Limits
export class SecureCache<K, V> {
  private cache: Map<K, { value: V; expires: number; accessCount: number; createdAt: number }> =
    new Map()
  private accessOrder: K[] = []

  constructor(
    private readonly maxSize: number = 1000,
    private readonly defaultTtl: number = 300000, // 5 minutes
    private readonly maxMemoryMB: number = 100
  ) {
    this.startCleanupTask()
  }

  private startCleanupTask(): void {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  set(key: K, value: V, ttl?: number): void {
    const expires = Date.now() + (ttl ?? this.defaultTtl)

    // Check memory limit (approximate)
    if (this.getApproximateMemoryUsage() > this.maxMemoryMB * 1024 * 1024) {
      this.evictLeastRecentlyUsed()
    }

    // Check size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed()
    }

    this.cache.set(key, {
      value,
      expires,
      accessCount: 0,
      createdAt: Date.now(),
    })

    // Update access order
    this.updateAccessOrder(key)
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // Check expiration
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      return undefined
    }

    // Update access statistics
    entry.accessCount++
    this.updateAccessOrder(key)

    return entry.value
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.removeFromAccessOrder(key)
    }
    return deleted
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
      return false
    }

    return true
  }

  private updateAccessOrder(key: K): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  private removeFromAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private evictLeastRecentlyUsed(): void {
    if (this.accessOrder.length === 0) return

    const lruKey = this.accessOrder.shift()
    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: K[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key)
      this.removeFromAccessOrder(key)
    }

    if (expiredKeys.length > 0) {
      securityLogger.log({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.INFO,
        message: 'Cache cleanup completed',
        metadata: { expiredItems: expiredKeys.length, totalItems: this.cache.size },
      })
    }
  }

  private getApproximateMemoryUsage(): number {
    // Rough estimation - in production, use more sophisticated memory tracking
    return this.cache.size * 1024 // Assume 1KB per entry
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
  }

  getMetrics(): {
    size: number
    hitRate: number
    memoryUsageBytes: number
    oldestEntry?: number
    newestEntry?: number
  } {
    let totalAccess = 0
    let hits = 0
    let oldestEntry: number | undefined
    let newestEntry: number | undefined

    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount
      if (entry.accessCount > 0) hits++

      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt
      }
      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt
      }
    }

    return {
      size: this.cache.size,
      hitRate: totalAccess === 0 ? 0 : hits / totalAccess,
      memoryUsageBytes: this.getApproximateMemoryUsage(),
      oldestEntry,
      newestEntry,
    }
  }
}

// Export pattern implementations
export { CircuitBreaker, SecureResourcePool, SecureStateMachine, SecureCache }
