import React from 'react'
import { COMMON_ICONS, type IconProps } from '@trading-viewer/shared'
import { cn } from '../utils'

// Tree-shaking 最適化のために必要なアイコンのみを個別インポート
import {
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Bell,
  BellPlus,
  User,
  Users,
  LogIn,
  LogOut,
  Loader,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Play,
  Pause,
  Settings,
  HelpCircle,
  Search,
  Heart,
  Database,
  BookOpen,
  ExternalLink,
  Sun,
  Moon,
  // 追加でよく使われるアイコン
  Calendar,
  Clock,
  Filter,
  MoreHorizontal,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Save,
  Share,
  Star,
  Maximize,
  Minimize,
  Zap,
  Lock,
  Unlock,
  // チャート関連で不足しているアイコン
  Crosshair,
  Palette,
  ChartNoAxesGantt,
  ChartNoAxesCombined,
  AlignHorizontalDistributeCenter,
  TrendingUpDown,
  Volume2,
  Layers,
  Camera,
  PanelLeftClose,
  PanelLeftOpen,
  PanelBottomClose,
  PanelBottomOpen,
  // その他の不足アイコン
  Smartphone,
  Monitor,
  Tablet,
  Keyboard,
  // 絵文字置き換え用アイコン
  Package,
  Lightbulb,
} from 'lucide-react'

// アイコンマッピング（Tree-shaking 対応）
const iconMap = {
  // COMMON_ICONS からのマッピング
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Bell,
  BellPlus,
  User,
  Users,
  LogIn,
  LogOut,
  Loader,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Play,
  Pause,
  Settings,
  HelpCircle,
  Search,
  Heart,
  Database,
  BookOpen,
  ExternalLink,
  Sun,
  Moon,
  // よく使われる追加アイコン
  Calendar,
  Clock,
  Filter,
  MoreHorizontal,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Save,
  Share,
  Star,
  Maximize,
  Minimize,
  Zap,
  Lock,
  Unlock,
  // チャート関連アイコン
  Crosshair,
  Palette,
  ChartNoAxesGantt,
  ChartNoAxesCombined,
  AlignHorizontalDistributeCenter,
  TrendingUpDown,
  Volume2,
  Layers,
  Camera,
  PanelLeftClose,
  PanelLeftOpen,
  PanelBottomClose,
  PanelBottomOpen,
  // デバイス系アイコン
  Smartphone,
  Monitor,
  Tablet,
  Keyboard,
  // 絵文字置き換え用アイコン
  Package,
  Lightbulb,
  // エイリアス対応
  trending: TrendingUp, // 'trending' アイコンを TrendingUp にマップ
  // COMMON_ICONS エイリアス
  delete: Trash2, // 'delete' アイコンを Trash2 にマップ
  add: Plus, // 'add' アイコンを Plus にマップ
  trash: Trash2, // 'trash' アイコンを Trash2 にマップ
  lock: Lock, // 'lock' アイコンを Lock にマップ
  keyboard: Keyboard, // 'keyboard' アイコンを Keyboard にマップ
  x: X, // 'x' アイコンを X にマップ
  down: ChevronDown, // 'down' アイコンを ChevronDown にマップ
} as const

export const Icon: React.FC<IconProps> = ({ name, size = 16, className, color }) => {
  // Check if it's a common icon name first
  const iconName = name in COMMON_ICONS ? COMMON_ICONS[name as keyof typeof COMMON_ICONS] : name

  // Tree-shaking 対応のアイコン取得
  const IconComponent = iconMap[iconName as keyof typeof iconMap]

  if (!IconComponent) {
    // eslint-disable-next-line no-console
    console.warn(
      `Icon "${iconName}" not found in iconMap. Add it to the import list for tree-shaking optimization.`
    )
    return null
  }

  return (
    <IconComponent
      size={size}
      color={color ?? 'currentColor'}
      {...(className && { className: cn(className) })}
    />
  )
}

export default Icon
