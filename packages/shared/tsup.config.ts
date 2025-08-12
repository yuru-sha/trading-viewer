import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Disable DTS generation, we'll handle it separately
  clean: true,
  splitting: false,
  sourcemap: true,
  target: 'es2022',
  external: ['zod'],
})
