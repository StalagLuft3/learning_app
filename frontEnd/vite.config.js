import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT) || 5173
  },
  optimizeDeps: {
    include: ['@ukic/react']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'ukic-react': ['@ukic/react']
        }
      }
    }
  }
})
