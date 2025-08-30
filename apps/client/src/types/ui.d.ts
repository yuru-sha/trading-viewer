declare module '@trading-viewer/ui' {
  import type { ReactNode } from 'react'

  export interface ButtonProps {
    children: ReactNode
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    onClick?: () => void
    className?: string
    type?: 'button' | 'submit' | 'reset'
  }

  export interface InputProps {
    value?: string
    onChange?: (value: string) => void
    placeholder?: string
    disabled?: boolean
    className?: string
    type?: 'text' | 'password' | 'email' | 'number'
  }

  export interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    title?: string
    className?: string
  }

  export interface LoadingProps {
    size?: 'sm' | 'md' | 'lg'
    text?: string
    className?: string
  }

  export const Button: React.FC<ButtonProps>
  export const Input: React.FC<InputProps>
  export const Modal: React.FC<ModalProps>
  export const Loading: React.FC<LoadingProps>
}
