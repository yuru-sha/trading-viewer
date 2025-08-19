import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  clean: true,
  external: ['react', 'react-dom'],
  target: 'es2020',
  minify: false,
  splitting: false,
})
