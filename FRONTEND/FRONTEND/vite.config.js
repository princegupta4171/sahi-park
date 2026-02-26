import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: false,
    proxy: {
      '/login': 'http://localhost:3000',
      '/register': 'http://localhost:3000',
      '/spaces': 'http://localhost:3000',
      '/provide': 'http://localhost:3000',
      '/book': 'http://localhost:3000',
      '/release': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/nearby-spaces': 'http://localhost:3000',
      '/payment': 'http://localhost:3000'
    }
  }
})
