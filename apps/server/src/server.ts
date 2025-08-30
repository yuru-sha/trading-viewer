import { ApplicationBootstrap } from './bootstrap.js'

// Create test application instance
const testApp = new ApplicationBootstrap()

// Initialize the application for testing
let appInitialized = false
export const initializeApp = async () => {
  if (!appInitialized) {
    await testApp.initialize()
    appInitialized = true
  }
  return testApp
}

// Export the Express app for testing
export const app = testApp.getApp()
