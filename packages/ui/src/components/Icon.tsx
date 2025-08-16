import React from 'react'
import * as LucideIcons from 'lucide-react'
import { cn } from '../utils'
import { IconProps, COMMON_ICONS, CommonIconName } from '@trading-viewer/shared'

export const Icon: React.FC<IconProps> = ({ name, size = 16, className, color }) => {
  // Check if it's a common icon name first
  const iconName = name in COMMON_ICONS ? COMMON_ICONS[name as CommonIconName] : name

  const IconComponent = LucideIcons[
    iconName as keyof typeof LucideIcons
  ] as React.ComponentType<any>

  if (!IconComponent) {
    console.warn(`Icon "${String(iconName)}" not found in lucide-react`)
    return null
  }

  return <IconComponent size={size} className={cn(className)} color={color} />
}

export default Icon
