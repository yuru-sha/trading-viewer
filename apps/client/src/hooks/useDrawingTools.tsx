// DEPRECATED: This file is maintained for backward compatibility
// Use the new modular hooks from './drawing/' instead

// Re-export the refactored hook for seamless migration
export { useDrawingTools } from './drawing'
export * from './drawing'

// Default export for backward compatibility
import { useDrawingTools } from './drawing'
export default useDrawingTools
