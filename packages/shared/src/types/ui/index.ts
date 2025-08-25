// UI types - components, styling, interactions
export * from './components'
export * from './drawing'
export * from './icons'
export * from './chart'

// Layout and navigation types
export interface MenuItem {
  key: string
  label: string
  icon?: string
  path?: string
  children?: MenuItem[]
  disabled?: boolean
}

export interface BreadcrumbItem {
  title: string
  path?: string
}

// Responsive breakpoints
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface ResponsiveValue<T> {
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}

// Animation types
export type AnimationType = 'fade' | 'slide' | 'scale' | 'rotate' | 'bounce'

export interface AnimationProps {
  type: AnimationType
  duration?: number
  delay?: number
  easing?: string
}

// Accessibility types
export interface AriaProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-disabled'?: boolean
  role?: string
  tabIndex?: number
}
