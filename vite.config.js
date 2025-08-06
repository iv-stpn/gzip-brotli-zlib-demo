import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/gzip-brotli-zlib-demo/' : '/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['fflate', 'pako'],
          brotli: ['brotli-wasm']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['brotli-wasm']
  },
  publicDir: 'public'
})
