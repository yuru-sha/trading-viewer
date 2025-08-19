import { ApplicationBootstrap } from '../../bootstrap.js'

// Test application setup
let testApp: ApplicationBootstrap | null = null
let appPromise: Promise<ApplicationBootstrap> | null = null

export async function getTestApp(): Promise<ApplicationBootstrap> {
  if (!appPromise) {
    appPromise = (async () => {
      if (!testApp) {
        testApp = new ApplicationBootstrap()
        await testApp.initialize()
      }
      return testApp
    })()
  }
  return appPromise
}

export async function getExpressApp() {
  const bootstrap = await getTestApp()
  return bootstrap.getApp()
}