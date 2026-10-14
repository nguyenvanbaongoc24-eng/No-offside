import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'No Offside',
        short_name: 'No Offside',
        description: 'Quản lý đội bóng nội bộ',
        theme_color: '#F5F7F6',
        background_color: '#FAFBF8',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: { rollupOptions: { output: { manualChunks: { react: ['react','react-dom'], motion: ['framer-motion'], supabase: ['@supabase/supabase-js'] } } } },
  server: {
    port: 5173,
    host: true
  }
})
