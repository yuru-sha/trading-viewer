import React from 'react'
import {
  Sun,
  Moon,
  Home,
  Database,
  BarChart3,
  Search,
  Heart,
  HelpCircle,
  Menu,
  X,
  RefreshCw,
  TrendingUp,
  Play,
  Pause,
  Settings,
  User,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Edit,
  Trash2,
  Download,
  Upload,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Loader,
  Target,
  BookOpen,
} from 'lucide-react'

// アイコンマップ - 汎用的なアイコンコンポーネント
const iconMap = {
  sun: Sun,
  moon: Moon,
  home: Home,
  database: Database,
  barChart3: BarChart3,
  search: Search,
  heart: Heart,
  helpCircle: HelpCircle,
  menu: Menu,
  x: X,
  refreshCw: RefreshCw,
  trendingUp: TrendingUp,
  play: Play,
  pause: Pause,
  settings: Settings,
  user: User,
  logIn: LogIn,
  logOut: LogOut,
  eye: Eye,
  eyeOff: EyeOff,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  plus: Plus,
  minus: Minus,
  edit: Edit,
  trash2: Trash2,
  download: Download,
  upload: Upload,
  copy: Copy,
  externalLink: ExternalLink,
  alertTriangle: AlertTriangle,
  checkCircle: CheckCircle,
  xCircle: XCircle,
  info: Info,
  loader: Loader,
  target: Target,
  bookOpen: BookOpen,
} as const

// Icon コンポーネントのプロパティ
export interface IconProps {
  name: keyof typeof iconMap
  className?: string
  size?: number
  color?: string
  strokeWidth?: number
}

// 汎用的な Icon コンポーネント
const Icon: React.FC<IconProps> = ({
  name,
  className = 'w-4 h-4',
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
  ...props
}) => {
  const IconComponent = iconMap[name]

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`)
    return null
  }

  return (
    <IconComponent
      className={className}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      {...props}
    />
  )
}

export default Icon
