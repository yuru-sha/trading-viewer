import React from 'react'
import { Input as UIInput } from '@trading-viewer/ui'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  variant?: 'default' | 'filled'
  size?: 'sm' | 'md' | 'lg'
}

const Input: React.FC<InputProps> = ({ size, ...props }) => {
  return <UIInput {...props} {...(size !== undefined && { size })} />
}

export default Input
