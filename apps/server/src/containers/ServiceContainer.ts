import 'reflect-metadata'
import { ENVIRONMENTS } from '@trading-viewer/shared'

/**
 * Service lifetime definitions
 */
export enum ServiceLifetime {
  Transient = 'transient', // New instance every time
  Singleton = 'singleton', // Single instance for the lifetime of the container
  Scoped = 'scoped', // Single instance per scope (e.g., per request)
}

/**
 * Service descriptor interface
 */
export interface ServiceDescriptor<T = any> {
  name: string
  factory: (...deps: any[]) => T
  dependencies?: string[]
  lifetime: ServiceLifetime
  instance?: T
  scopeId?: string
}

/**
 * Scope interface for scoped services
 */
export interface ServiceScope {
  scopeId: string
  services: Map<string, any>
  disposed: boolean
}

/**
 * Dependency Injection Container
 * Manages service registration, resolution, and lifetime
 */
export class ServiceContainer {
  private services = new Map<string, ServiceDescriptor>()
  private instances = new Map<string, any>()
  private scopes = new Map<string, ServiceScope>()
  private resolutionStack: string[] = []
  private disposed = false

  /**
   * Register a transient service
   */
  registerTransient<T>(
    name: string,
    factory: (...deps: any[]) => T,
    dependencies: string[] = []
  ): this {
    return this.register(name, factory, dependencies, ServiceLifetime.Transient)
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    name: string,
    factory: (...deps: any[]) => T,
    dependencies: string[] = []
  ): this {
    return this.register(name, factory, dependencies, ServiceLifetime.Singleton)
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(
    name: string,
    factory: (...deps: any[]) => T,
    dependencies: string[] = []
  ): this {
    return this.register(name, factory, dependencies, ServiceLifetime.Scoped)
  }

  /**
   * Register a service with specified lifetime
   */
  register<T>(
    name: string,
    factory: (...deps: any[]) => T,
    dependencies: string[] = [],
    lifetime: ServiceLifetime = ServiceLifetime.Transient
  ): this {
    if (this.disposed) {
      throw new Error('Cannot register services in disposed container')
    }

    if (this.services.has(name)) {
      if (process.env.NODE_ENV === ENVIRONMENTS.DEVELOPMENT) {
        console.warn(`Service '${name}' is already registered. Overwriting.`)
      }
    }

    this.services.set(name, {
      name,
      factory,
      dependencies,
      lifetime,
    })

    return this
  }

  /**
   * Register a service instance directly
   */
  registerInstance<T>(name: string, instance: T): this {
    if (this.disposed) {
      throw new Error('Cannot register services in disposed container')
    }

    this.services.set(name, {
      name,
      factory: () => instance,
      dependencies: [],
      lifetime: ServiceLifetime.Singleton,
      instance,
    })

    this.instances.set(name, instance)
    return this
  }

  /**
   * Resolve a service by name
   */
  resolve<T>(name: string, scopeId?: string): T {
    if (this.disposed) {
      throw new Error('Cannot resolve services from disposed container')
    }

    // Check for circular dependencies
    if (this.resolutionStack.includes(name)) {
      throw new Error(
        `Circular dependency detected: ${this.resolutionStack.join(' -> ')} -> ${name}`
      )
    }

    const descriptor = this.services.get(name)
    if (!descriptor) {
      throw new Error(`Service '${name}' is not registered`)
    }

    try {
      this.resolutionStack.push(name)
      return this.createInstance(descriptor, scopeId)
    } finally {
      this.resolutionStack.pop()
    }
  }

  /**
   * Create a new scope for scoped services
   */
  createScope(): ServiceScope {
    const scopeId = this.generateScopeId()
    const scope: ServiceScope = {
      scopeId,
      services: new Map(),
      disposed: false,
    }
    this.scopes.set(scopeId, scope)
    return scope
  }

  /**
   * Dispose a scope and all its services
   */
  disposeScope(scopeId: string): void {
    const scope = this.scopes.get(scopeId)
    if (!scope || scope.disposed) {
      return
    }

    // Dispose services that have dispose methods
    for (const [name, instance] of scope.services) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose()
        } catch (error) {
          console.error(`Error disposing scoped service '${name}':`, error)
        }
      }
    }

    scope.services.clear()
    scope.disposed = true
    this.scopes.delete(scopeId)
  }

  /**
   * Check if a service is registered
   */
  isRegistered(name: string): boolean {
    return this.services.has(name)
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys())
  }

  /**
   * Get service descriptor
   */
  getServiceDescriptor(name: string): ServiceDescriptor | undefined {
    return this.services.get(name)
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    // Dispose all singleton instances
    for (const [name, instance] of this.instances) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          instance.dispose()
        } catch (error) {
          console.error(`Error disposing singleton service '${name}':`, error)
        }
      }
    }

    // Dispose all scopes
    for (const scopeId of this.scopes.keys()) {
      this.disposeScope(scopeId)
    }

    this.services.clear()
    this.instances.clear()
    this.scopes.clear()
    this.resolutionStack = []
  }

  /**
   * Dispose the container
   */
  dispose(): void {
    if (this.disposed) {
      return
    }

    this.clear()
    this.disposed = true
  }

  /**
   * Create service instance based on lifetime
   */
  private createInstance<T>(descriptor: ServiceDescriptor<T>, scopeId?: string): T {
    switch (descriptor.lifetime) {
      case ServiceLifetime.Singleton:
        return this.createSingletonInstance(descriptor)

      case ServiceLifetime.Scoped:
        return this.createScopedInstance(descriptor, scopeId)

      case ServiceLifetime.Transient:
      default:
        return this.createTransientInstance(descriptor, scopeId)
    }
  }

  /**
   * Create singleton instance
   */
  private createSingletonInstance<T>(descriptor: ServiceDescriptor<T>): T {
    if (descriptor.instance) {
      return descriptor.instance
    }

    const instance = this.instantiateService(descriptor)
    descriptor.instance = instance
    this.instances.set(descriptor.name, instance)
    return instance
  }

  /**
   * Create scoped instance
   */
  private createScopedInstance<T>(descriptor: ServiceDescriptor<T>, scopeId?: string): T {
    if (!scopeId) {
      throw new Error(
        `Scoped service '${descriptor.name}' requires a scope ID. Use createScope() first.`
      )
    }

    const scope = this.scopes.get(scopeId)
    if (!scope) {
      throw new Error(`Scope '${scopeId}' does not exist`)
    }

    if (scope.disposed) {
      throw new Error(`Scope '${scopeId}' is disposed`)
    }

    const existingInstance = scope.services.get(descriptor.name)
    if (existingInstance) {
      return existingInstance
    }

    const instance = this.instantiateService(descriptor, scopeId)
    scope.services.set(descriptor.name, instance)
    return instance
  }

  /**
   * Create transient instance
   */
  private createTransientInstance<T>(descriptor: ServiceDescriptor<T>, scopeId?: string): T {
    return this.instantiateService(descriptor, scopeId)
  }

  /**
   * Instantiate service with dependency resolution
   */
  private instantiateService<T>(descriptor: ServiceDescriptor<T>, scopeId?: string): T {
    const dependencies =
      descriptor.dependencies?.map(depName => this.resolve(depName, scopeId)) || []

    try {
      return descriptor.factory(...dependencies)
    } catch (error) {
      throw new Error(`Error creating instance of service '${descriptor.name}': ${error}`)
    }
  }

  /**
   * Generate unique scope ID
   */
  private generateScopeId(): string {
    return `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Global container instance - Singleton pattern
 */
class GlobalServiceContainer extends ServiceContainer {
  private static instance: GlobalServiceContainer

  static getInstance(): GlobalServiceContainer {
    if (!GlobalServiceContainer.instance) {
      GlobalServiceContainer.instance = new GlobalServiceContainer()
    }
    return GlobalServiceContainer.instance
  }

  private constructor() {
    super()
  }
}

// Export the global container instance
export const container = GlobalServiceContainer.getInstance()

/**
 * Decorator for automatic service registration
 */
export function Injectable(name?: string, lifetime: ServiceLifetime = ServiceLifetime.Transient) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const serviceName = name || constructor.name

    // Register the service in the global container
    container.register(
      serviceName,
      (...deps: any[]) => new constructor(...deps),
      [], // Dependencies should be handled via parameter decorators
      lifetime
    )

    return constructor
  }
}

/**
 * Decorator for dependency injection
 */
export function Inject(serviceName: string) {
  return function (target: any, _propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Store dependency information for later use
    const existingDeps = Reflect.getMetadata('dependencies', target) || []
    existingDeps[parameterIndex] = serviceName
    Reflect.defineMetadata('dependencies', existingDeps, target)
  }
}

/**
 * Service locator pattern helper
 */
export class ServiceLocator {
  private static container = GlobalServiceContainer.getInstance()

  static resolve<T>(name: string): T {
    return this.container.resolve<T>(name)
  }

  static isRegistered(name: string): boolean {
    return this.container.isRegistered(name)
  }

  static setContainer(_newContainer: ServiceContainer): void {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION) {
      throw new Error('Cannot replace container in production environment')
    }
    // Note: This is a simplified implementation. In real scenarios,
    // you might want more sophisticated container replacement logic.
  }
}

// Helper functions for common registration patterns
export const registerService = {
  transient: <T>(name: string, factory: (...deps: any[]) => T, deps: string[] = []) =>
    container.registerTransient(name, factory, deps),

  singleton: <T>(name: string, factory: (...deps: any[]) => T, deps: string[] = []) =>
    container.registerSingleton(name, factory, deps),

  scoped: <T>(name: string, factory: (...deps: any[]) => T, deps: string[] = []) =>
    container.registerScoped(name, factory, deps),

  instance: <T>(name: string, instance: T) => container.registerInstance(name, instance),
}

export default ServiceContainer
