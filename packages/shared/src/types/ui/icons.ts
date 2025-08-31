/**
 * Icon type definitions for the UI package
 */

// Lucide icon names type (without importing lucide-react in shared package)
export type LucideIconName = string

// Commonly used icons with semantic naming
export const COMMON_ICONS = {
  // Navigation
  home: 'Home',
  menu: 'Menu',
  close: 'X',
  back: 'ChevronLeft',
  forward: 'ChevronRight',
  up: 'ChevronUp',
  down: 'ChevronDown',

  // Actions
  add: 'Plus',
  remove: 'Minus',
  edit: 'Edit',
  delete: 'Trash2',
  copy: 'Copy',
  download: 'Download',
  upload: 'Upload',
  refresh: 'RefreshCw',

  // Trading & Finance
  chart: 'BarChart3',
  trending: 'TrendingUp',
  target: 'Target',
  bell: 'Bell',
  // Market categories
  japanStocks: 'JapaneseYen',
  worldStocks: 'Globe',
  crypto: 'Bitcoin',
  fx: 'ArrowLeftRight',
  bonds: 'Landmark',

  // User & Auth
  user: 'User',
  users: 'Users',
  login: 'LogIn',
  logout: 'LogOut',

  // UI States
  loading: 'Loader',
  success: 'CheckCircle',
  error: 'XCircle',
  warning: 'AlertTriangle',
  info: 'Info',

  // Visibility
  show: 'Eye',
  hide: 'EyeOff',

  // Media
  play: 'Play',
  pause: 'Pause',

  // Misc
  settings: 'Settings',
  help: 'HelpCircle',
  search: 'Search',
  heart: 'Heart',
  database: 'Database',
  book: 'BookOpen',
  external: 'ExternalLink',

  // Theme
  sun: 'Sun',
  moon: 'Moon',
} as const

export type CommonIconName = keyof typeof COMMON_ICONS
export type IconName = LucideIconName | CommonIconName

// Icon component props interface
export interface IconProps {
  name: IconName
  size?: number
  className?: string
  color?: string
}
