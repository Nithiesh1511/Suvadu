import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Local-only bind; public access is handled via the ngrok tunnel.
    host: '127.0.0.1',
    port: 5173,
    open: true,
    // Allow requests proxied in through the reserved ngrok domain.
    allowedHosts: ['obsessive-starship-matter.ngrok-free.dev'],
  },
})
