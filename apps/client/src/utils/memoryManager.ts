/**
 * メモリ管理ユーティリティ
 * イベントリスナー、タイマー、WebSocket接続等のクリーンアップを統合管理
 */

import { log } from '../services/logger'

type CleanupFunction = () => void
type TimerHandle = NodeJS.Timeout | number

export class MemoryManager {
  private static instance: MemoryManager | null = null
  private cleanupFunctions: Map<string, CleanupFunction[]> = new Map()
  private timers: Map<string, TimerHandle[]> = new Map()
  private eventListeners: Map<
    string,
    Array<{
      element: EventTarget
      event: string
      handler: EventListener
    }>
  > = new Map()

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager()
    }
    return MemoryManager.instance
  }

  /**
   * コンポーネント用のメモリ管理スコープを作成
   */
  createScope(scopeId: string): MemoryScope {
    return new MemoryScope(scopeId, this)
  }

  /**
   * クリーンアップ関数を登録
   */
  registerCleanup(scopeId: string, cleanup: CleanupFunction): void {
    if (!this.cleanupFunctions.has(scopeId)) {
      this.cleanupFunctions.set(scopeId, [])
    }
    this.cleanupFunctions.get(scopeId)!.push(cleanup)
  }

  /**
   * タイマーを登録（自動クリーンアップ対象）
   */
  registerTimer(scopeId: string, timer: TimerHandle): void {
    if (!this.timers.has(scopeId)) {
      this.timers.set(scopeId, [])
    }
    this.timers.get(scopeId)!.push(timer)
  }

  /**
   * イベントリスナーを登録（自動クリーンアップ対象）
   */
  registerEventListener(
    scopeId: string,
    element: EventTarget,
    event: string,
    handler: EventListener
  ): void {
    if (!this.eventListeners.has(scopeId)) {
      this.eventListeners.set(scopeId, [])
    }
    this.eventListeners.get(scopeId)!.push({ element, event, handler })
    element.addEventListener(event, handler)
  }

  /**
   * 特定スコープのクリーンアップを実行
   */
  cleanup(scopeId: string): void {
    log.business.info('Cleaning up memory scope', {
      operation: 'memory_cleanup',
      scopeId,
    })

    // カスタムクリーンアップ関数を実行
    const cleanups = this.cleanupFunctions.get(scopeId)
    if (cleanups) {
      cleanups.forEach((cleanup, index) => {
        try {
          cleanup()
        } catch (error) {
          log.business.error('Error during cleanup', error as Error, {
            operation: 'cleanup_function',
            scopeId,
            index,
          })
        }
      })
      this.cleanupFunctions.delete(scopeId)
    }

    // タイマーをクリア
    const timers = this.timers.get(scopeId)
    if (timers) {
      timers.forEach(timer => {
        if (typeof timer === 'number') {
          clearTimeout(timer)
          clearInterval(timer)
        } else {
          clearTimeout(timer)
          clearInterval(timer)
        }
      })
      this.timers.delete(scopeId)
    }

    // イベントリスナーを削除
    const listeners = this.eventListeners.get(scopeId)
    if (listeners) {
      listeners.forEach(({ element, event, handler }) => {
        try {
          element.removeEventListener(event, handler)
        } catch (error) {
          log.business.error('Error removing event listener', error as Error, {
            operation: 'remove_event_listener',
            scopeId,
            event,
          })
        }
      })
      this.eventListeners.delete(scopeId)
    }
  }

  /**
   * 全スコープのクリーンアップ（アプリ終了時など）
   */
  cleanupAll(): void {
    log.business.info('Cleaning up all memory scopes', {
      operation: 'memory_cleanup_all',
      scopeCount: this.cleanupFunctions.size,
    })

    for (const scopeId of this.cleanupFunctions.keys()) {
      this.cleanup(scopeId)
    }
  }

  /**
   * メモリ使用状況の診断情報を取得
   */
  getDiagnostics(): {
    totalScopes: number
    scopesWithCleanups: number
    scopesWithTimers: number
    scopesWithListeners: number
    totalCleanupFunctions: number
    totalTimers: number
    totalEventListeners: number
  } {
    const totalCleanupFunctions = Array.from(this.cleanupFunctions.values()).reduce(
      (sum, cleanups) => sum + cleanups.length,
      0
    )

    const totalTimers = Array.from(this.timers.values()).reduce(
      (sum, timers) => sum + timers.length,
      0
    )

    const totalEventListeners = Array.from(this.eventListeners.values()).reduce(
      (sum, listeners) => sum + listeners.length,
      0
    )

    return {
      totalScopes: new Set([
        ...this.cleanupFunctions.keys(),
        ...this.timers.keys(),
        ...this.eventListeners.keys(),
      ]).size,
      scopesWithCleanups: this.cleanupFunctions.size,
      scopesWithTimers: this.timers.size,
      scopesWithListeners: this.eventListeners.size,
      totalCleanupFunctions,
      totalTimers,
      totalEventListeners,
    }
  }
}

/**
 * 特定スコープ用のメモリ管理インターフェース
 */
export class MemoryScope {
  constructor(
    private scopeId: string,
    private manager: MemoryManager
  ) {}

  /**
   * クリーンアップ関数を登録
   */
  onCleanup(cleanup: CleanupFunction): void {
    this.manager.registerCleanup(this.scopeId, cleanup)
  }

  /**
   * 管理対象タイマーを作成
   */
  setTimeout(callback: () => void, delay: number): TimerHandle {
    const timer = setTimeout(callback, delay)
    this.manager.registerTimer(this.scopeId, timer)
    return timer
  }

  setInterval(callback: () => void, delay: number): TimerHandle {
    const timer = setInterval(callback, delay)
    this.manager.registerTimer(this.scopeId, timer)
    return timer
  }

  /**
   * 管理対象イベントリスナーを追加
   */
  addEventListener(element: EventTarget, event: string, handler: EventListener): void {
    this.manager.registerEventListener(this.scopeId, element, event, handler)
  }

  /**
   * このスコープのクリーンアップを実行
   */
  cleanup(): void {
    this.manager.cleanup(this.scopeId)
  }
}

/**
 * React フック用のメモリ管理ユーティリティ
 */
export function useMemoryManager(scopeId?: string) {
  const manager = MemoryManager.getInstance()
  const scope = manager.createScope(scopeId || `component-${Date.now()}-${Math.random()}`)

  // useEffect のクリーンアップ関数として使用
  const cleanup = () => scope.cleanup()

  return {
    scope,
    cleanup,
    // 便利メソッド
    setTimeout: (callback: () => void, delay: number) => scope.setTimeout(callback, delay),
    setInterval: (callback: () => void, delay: number) => scope.setInterval(callback, delay),
    addEventListener: (element: EventTarget, event: string, handler: EventListener) =>
      scope.addEventListener(element, event, handler),
    onCleanup: (fn: CleanupFunction) => scope.onCleanup(fn),
  }
}

/**
 * アプリレベルでのメモリ管理初期化
 */
export function initializeMemoryManager(): void {
  const manager = MemoryManager.getInstance()

  // アプリ終了時のクリーンアップを登録
  if (typeof window !== 'undefined') {
    const cleanup = () => {
      log.business.info('App shutdown - cleaning up all memory', {
        operation: 'app_shutdown_cleanup',
        ...manager.getDiagnostics(),
      })
      manager.cleanupAll()
    }

    window.addEventListener('beforeunload', cleanup)
    window.addEventListener('unload', cleanup)

    // 可視性変更時にもクリーンアップ（モバイル対応）
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        log.business.info('App hidden - checking memory usage', {
          operation: 'app_visibility_check',
          ...manager.getDiagnostics(),
        })
      }
    })
  }

  // 開発環境での診断情報出力
  if (process.env.NODE_ENV === 'development') {
    // 定期的にメモリ使用状況を診断
    setInterval(() => {
      const diagnostics = manager.getDiagnostics()
      if (diagnostics.totalScopes > 10) {
        // 閾値は調整可能
        log.performance.warn('High memory scope count detected', {
          operation: 'memory_diagnostics',
          ...diagnostics,
        })
      }
    }, 30000) // 30秒間隔
  }
}
