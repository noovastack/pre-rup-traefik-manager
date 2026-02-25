import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5177,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': process.env.VITE_API_TARGET || 'http://localhost:8080',
    },
  },
})
