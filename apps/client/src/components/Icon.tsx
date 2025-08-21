import React from 'react'
import { Icon as UIIcon, type IconProps as UIIconProps } from '@trading-viewer/ui'

export type IconProps = UIIconProps

const Icon: React.FC<IconProps> = props => {
  return <UIIcon {...props} />
}

export default Icon
