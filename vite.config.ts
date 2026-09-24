import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site under /Suvadu/, so built asset
  // URLs need that prefix. The dev server stays at the root.
  base: command === 'build' ? '/Suvadu/' : '/',
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
}))
