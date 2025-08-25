import React from 'react'
import * as LucideIcons from 'lucide-react'
import { COMMON_ICONS, type IconProps } from '@trading-viewer/shared'
import { cn } from '../utils'

export const Icon: React.FC<IconProps> = ({ name, size = 16, className, color }) => {
  // Check if it's a common icon name first
  const iconName = name in COMMON_ICONS ? COMMON_ICONS[name as keyof typeof COMMON_ICONS] : name

  const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{
    size?: number
    className?: string
    color?: string
  }>

  if (!IconComponent) {
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
