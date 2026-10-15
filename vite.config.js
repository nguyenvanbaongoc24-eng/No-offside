import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

let gitCommitSha = ''
try {
  gitCommitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
} catch {}

const appVersion = process.env.VERCEL_GIT_COMMIT_SHA
  ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 10)
  : (gitCommitSha || ('build_' + Date.now().toString(36)))

const buildTime = new Date().toISOString()

function versionMetadataPlugin() {
  return {
    name: 'version-metadata-generator',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          version: appVersion,
          buildTime,
          commit: process.env.VERCEL_GIT_COMMIT_SHA || gitCommitSha || 'unknown'
        }, null, 2)
      })
    }
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    versionMetadataPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        globIgnores: ['**/version.json', '**/api/**'],
        navigateFallbackDenylist: [/^\/api\//, /^\/version\.json/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
})

