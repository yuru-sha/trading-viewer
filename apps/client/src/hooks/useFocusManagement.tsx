import { useRef, useEffect, useCallback } from 'react'

export interface FocusableElement {
  element: HTMLElement
  selector: string
  priority: number
}

export interface FocusManagerConfig {
  trapFocus?: boolean
  restoreFocus?: boolean
  autoFocus?: boolean
  skipLinks?: boolean
}

/**
 * WCAG 2.1 準拠のフォーカス管理フック
 *
 * Features:
 * - キーボードナビゲーション (Tab, Shift+Tab, Arrow keys)
 * - フォーカストラップ (モーダル用)
 * - フォーカス復元
 * - スキップリンク対応
 * - ARIA 属性自動設定
 */
export const useFocusManagement = (config: FocusManagerConfig = {}) => {
  const containerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const focusableElementsRef = useRef<HTMLElement[]>([])

  const { trapFocus = false, restoreFocus = true, autoFocus = false, skipLinks = true } = config

  // フォーカス可能な要素のセレクター (WCAG 準拠)
  const focusableSelectors = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex^="-"])',
    'details > summary:first-of-type',
    'audio[controls]',
    'video[controls]',
  ].join(', ')

  // フォーカス可能な要素を取得
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]

    // 非表示要素を除外
    return elements
      .filter(element => {
        const style = window.getComputedStyle(element)
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          !element.hidden &&
          element.offsetParent !== null
        )
      })
      .sort((a, b) => {
        // tabindex 順でソート
        const aTabIndex = parseInt(a.getAttribute('tabindex') || '0')
        const bTabIndex = parseInt(b.getAttribute('tabindex') || '0')

        if (aTabIndex === 0 && bTabIndex === 0) return 0
        if (aTabIndex === 0) return 1
        if (bTabIndex === 0) return -1

        return aTabIndex - bTabIndex
      })
  }, [])

  // 要素にフォーカスを移動
  const focusElement = useCallback((element: HTMLElement, options?: FocusOptions) => {
    try {
      element.focus(options)

      // ARIA live region で通知 (スクリーンリーダー対応)
      const announcement =
        element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent?.slice(0, 50)

      if (announcement) {
        announceToScreenReader(`Focused: ${announcement}`)
      }
    } catch (error) {
      console.warn('Failed to focus element:', element, error)
    }
  }, [])

  // スクリーンリーダーへのアナウンス
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)
    setTimeout(() => document.body.removeChild(announcement), 1000)
  }, [])

  // 次の要素にフォーカス
  const focusNext = useCallback(() => {
    const elements = getFocusableElements()
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement)
    const nextIndex = (currentIndex + 1) % elements.length

    if (elements[nextIndex]) {
      focusElement(elements[nextIndex])
    }
  }, [getFocusableElements, focusElement])

  // 前の要素にフォーカス
  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements()
    const currentIndex = elements.indexOf(document.activeElement as HTMLElement)
    const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1

    if (elements[prevIndex]) {
      focusElement(elements[prevIndex])
    }
  }, [getFocusableElements, focusElement])

  // 最初の要素にフォーカス
  const focusFirst = useCallback(() => {
    const elements = getFocusableElements()
    if (elements[0]) {
      focusElement(elements[0])
    }
  }, [getFocusableElements, focusElement])

  // 最後の要素にフォーカス
  const focusLast = useCallback(() => {
    const elements = getFocusableElements()
    const lastElement = elements[elements.length - 1]
    if (lastElement) {
      focusElement(lastElement)
    }
  }, [getFocusableElements, focusElement])

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) return

      const { key, shiftKey, ctrlKey, altKey, metaKey } = event

      // 修飾キー同時押しの場合はスキップ
      if (ctrlKey || altKey || metaKey) return

      switch (key) {
        case 'Tab':
          if (trapFocus) {
            event.preventDefault()
            shiftKey ? focusPrevious() : focusNext()
          }
          break

        case 'ArrowDown':
        case 'ArrowRight':
          // 垂直/水平ナビゲーション
          if (event.target && isInNavigationContext(event.target as HTMLElement)) {
            event.preventDefault()
            focusNext()
          }
          break

        case 'ArrowUp':
        case 'ArrowLeft':
          if (event.target && isInNavigationContext(event.target as HTMLElement)) {
            event.preventDefault()
            focusPrevious()
          }
          break

        case 'Home':
          if (event.target && isInNavigationContext(event.target as HTMLElement)) {
            event.preventDefault()
            focusFirst()
          }
          break

        case 'End':
          if (event.target && isInNavigationContext(event.target as HTMLElement)) {
            event.preventDefault()
            focusLast()
          }
          break

        case 'Escape':
          // フォーカストラップからの脱出
          if (trapFocus && restoreFocus) {
            restoreFocusToPrevious()
          }
          break
      }
    },
    [trapFocus, focusNext, focusPrevious, focusFirst, focusLast, restoreFocus]
  )

  // ナビゲーション対象の要素かチェック
  const isInNavigationContext = (element: HTMLElement): boolean => {
    const navigationRoles = ['navigation', 'menu', 'menubar', 'listbox', 'tree', 'tablist']
    const role = element.getAttribute('role')

    return (
      navigationRoles.includes(role || '') ||
      element.closest('[role="navigation"], nav, [role="menu"], [role="menubar"]') !== null ||
      element.closest('.navigation, .menu, .tabs') !== null
    )
  }

  // フォーカスを前の要素に復元
  const restoreFocusToPrevious = useCallback(() => {
    if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
      focusElement(previousFocusRef.current)
      previousFocusRef.current = null
    }
  }, [focusElement])

  // フォーカストラップの設定
  useEffect(() => {
    const container = containerRef.current
    if (!container || !trapFocus) return

    // 現在のフォーカスを保存
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement
    }

    // 自動フォーカス
    if (autoFocus) {
      const firstElement = getFocusableElements()[0]
      if (firstElement) {
        focusElement(firstElement)
      }
    }

    // キーボードリスナー追加
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)

      // フォーカス復元
      if (restoreFocus) {
        restoreFocusToPrevious()
      }
    }
  }, [
    trapFocus,
    autoFocus,
    restoreFocus,
    handleKeyDown,
    getFocusableElements,
    focusElement,
    restoreFocusToPrevious,
  ])

  // フォーカス要素リストの更新
  useEffect(() => {
    const updateFocusableElements = () => {
      focusableElementsRef.current = getFocusableElements()
    }

    // DOM 変更の監視
    const observer = new MutationObserver(updateFocusableElements)

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['tabindex', 'disabled', 'hidden', 'aria-hidden'],
      })
    }

    updateFocusableElements()

    return () => observer.disconnect()
  }, [getFocusableElements])

  // スキップリンクの生成
  const createSkipLink = useCallback(
    (target: string, label: string) => {
      return {
        href: `#${target}`,
        'aria-label': label,
        className:
          'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg',
        onFocus: () => announceToScreenReader(`Skip link: ${label}`),
      }
    },
    [announceToScreenReader]
  )

  return {
    // Refs
    containerRef,

    // フォーカス制御
    focusElement,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    restoreFocusToPrevious,

    // 状態取得
    getFocusableElements: () => focusableElementsRef.current,

    // スキップリンク
    createSkipLink,

    // アクセシビリティ
    announceToScreenReader,
  }
}

// スキップリンクコンポーネント
export const SkipLinks: React.FC<{ links: Array<{ href: string; label: string }> }> = ({
  links,
}) => (
  <div className='skip-links'>
    {links.map((link, index) => (
      <a
        key={index}
        href={link.href}
        className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:text-sm focus:no-underline'
      >
        {link.label}
      </a>
    ))}
  </div>
)

export default useFocusManagement
