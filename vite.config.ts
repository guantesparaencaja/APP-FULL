import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
        manifest: {
          name: 'Guantes Para Encajar',
          short_name: 'Guantes',
          theme_color: '#070711',
          background_color: '#070711',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: '/gpte-app-icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: '/gpte-app-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: '/gpte-app-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('@sentry') || id.includes('@logrocket')) return 'monitoring';
              if (id.includes('@codetrix') || id.includes('@capacitor')) return 'capacitor';
              if (id.includes('framer-motion') || id.includes('motion')) return 'motion';
              return 'vendor';
            }
          },
        },
      },
    },
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
