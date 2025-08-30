import { ApplicationBootstrap } from './bootstrap.js'

// Main entry point
async function main() {
  try {
    const app = new ApplicationBootstrap()
    await app.initialize()
    await app.start()
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

main()

export default main
