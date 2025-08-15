// UI component types and interfaces

// Common UI component props
export interface BaseComponentProps {
  className?: string
  children?: any // Generic for React, Vue, etc.
  id?: string
  'data-testid'?: string
}

// Button component types
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  icon?: any
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

// Input component types
export type InputType = 'text' | 'email' | 'password' | 'number' | 'search'
export type InputSize = 'sm' | 'md' | 'lg'

export interface InputProps extends BaseComponentProps {
  type?: InputType
  size?: InputSize
  placeholder?: string
  value?: string
  defaultValue?: string
  disabled?: boolean
  required?: boolean
  error?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
}

// Modal component types
export interface ModalProps extends BaseComponentProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
  overlay?: boolean
}

// Table component types
export interface TableColumn<T = any> {
  key: string
  title: string
  dataIndex: keyof T
  width?: number | string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (value: any, record: T, index: number) => any
}

export interface TableProps<T = any> extends BaseComponentProps {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  pagination?: {
    current: number
    total: number
    pageSize: number
    onChange: (page: number, pageSize: number) => void
  }
  rowKey?: keyof T | ((record: T) => string)
  onRow?: (record: T, index: number) => Record<string, any>
}

// Form component types
export interface FormFieldProps extends BaseComponentProps {
  label?: string
  required?: boolean
  error?: string
  help?: string
}

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationProps {
  type: NotificationType
  title: string
  message?: string
  duration?: number
  closable?: boolean
  onClose?: () => void
}

// Loading states
export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  overlay?: boolean
}

// Chart UI types
export interface ChartLegendItem {
  name: string
  color: string
  visible: boolean
  value?: string | number
}

export interface ChartTooltipData {
  time: string
  items: Array<{
    name: string
    value: string | number
    color: string
  }>
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeColors {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  info: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
}
