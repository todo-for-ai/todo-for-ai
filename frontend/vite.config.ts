import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 50111,
    host: '0.0.0.0',
    proxy: {
      '/todo-for-ai/api': {
        target: 'http://localhost:50110',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 50112,
    host: '0.0.0.0'
  }
})
