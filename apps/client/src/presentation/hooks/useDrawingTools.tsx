// DEPRECATED: This file is maintained for backward compatibility
// Use the new modular hooks from '@/presentation/hooks/drawing/' instead

// Re-export the refactored hook for seamless migration
export { useDrawingTools } from '@/presentation/hooks/drawing'
export * from '@/presentation/hooks/drawing'

// Default export for backward compatibility
import { useDrawingTools } from '@/presentation/hooks/drawing'
export default useDrawingTools
