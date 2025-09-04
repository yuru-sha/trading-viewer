import React from 'react'
import { Icon as UIIcon } from '@trading-viewer/ui'
import type { IconProps } from '@trading-viewer/shared'

export type { IconProps }

const Icon: React.FC<IconProps> = ({ className, color, ...props }) => {
  return <UIIcon {...props} {...(className && { className })} {...(color && { color })} />
}

export default Icon
