import { ApplicationBootstrap } from './bootstrap.js'
import { log } from './infrastructure/services/logger'

// Main entry point
async function main() {
  try {
    const app = new ApplicationBootstrap()
    await app.initialize()
    await app.start()
  } catch (error) {
    log.system.error('Failed to start server:', error)
    process.exit(1)
  }
}

main()

export default main
