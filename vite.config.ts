import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "robots.txt"],

      manifest: {
        name: "2RD Inventario — POS Enterprise",
        short_name: "2RD POS",
        description: "Sistema de inventario y punto de venta profesional",
        theme_color: "#1e293b",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/sales",  // El POS es la pantalla principal
        lang: "es-CO",
        categories: ["business", "productivity"],
        icons: [
          { src: "/icons/icon-72x72.png",   sizes: "72x72",   type: "image/png" },
          { src: "/icons/icon-96x96.png",   sizes: "96x96",   type: "image/png" },
          { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Nueva Venta",
            short_name: "Vender",
            description: "Abrir el POS para registrar una venta",
            url: "/sales",
            icons: [{ src: "/icons/shortcut-sale.png", sizes: "96x96" }],
          },
          {
            name: "Inventario",
            short_name: "Inventario",
            description: "Consultar el inventario de productos",
            url: "/inventory",
            icons: [{ src: "/icons/shortcut-inventory.png", sizes: "96x96" }],
          },
        ],
        screenshots: [
          {
            src: "/screenshots/pos.png",
            sizes: "1280x720",
            type: "image/png",
            label: "Pantalla POS",
          },
        ],
      },

      workbox: {
        // Archivos a pre-cachear (generados en build)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // Límite de tamaño por archivo (bytes) — archivos más grandes no se pre-cachean
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

        // Estrategias de caché por tipo de recurso
        runtimeCaching: [
          // Supabase API — Network First con fallback a caché
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60, // 5 minutos
              },
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase Auth — Network Only (nunca cachear tokens)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\/.*/,
            handler: "NetworkOnly",
          },
          // Imágenes de productos (Supabase Storage) — Cache First
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "product-images",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Fuentes de Google (si las hay)
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
            },
          },
          // Imágenes estáticas propias — Cache First
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
            },
          },
        ],

        // Background Sync para ventas offline
        // (el browser reintenta cuando recupera conexión)
        // No disponible en todos los browsers, pero mejora Safari/Firefox si lo tienen
        skipWaiting: true,
        clientsClaim: true,

        // Página offline de fallback
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/supabase\//,
        ],
      },

      devOptions: {
        enabled: false, // Desactivar en dev para no interferir con HMR
        type: "module",
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    // Separar chunks para mejor caché y performance
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separar por prioridad de carga: crítico → diferido → heavy
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react-router'))
              return 'vendor-react';
            if (id.includes('@tanstack/react-query'))
              return 'vendor-query';
            if (id.includes('@supabase'))
              return 'vendor-supabase';
            if (id.includes('recharts') || id.includes('d3-'))
              return 'vendor-charts';
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod'))
              return 'vendor-forms';
            if (id.includes('dexie') || id.includes('workbox'))
              return 'vendor-offline';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx'))
              return 'vendor-export';
            if (id.includes('@radix-ui'))
              return 'vendor-radix';
            if (id.includes('lucide'))
              return 'vendor-icons';
            return 'vendor-misc';
          }
          // Páginas pesadas como chunks separados
          if (id.includes('/pages/Dashboard'))   return 'page-dashboard';
          if (id.includes('/pages/Reports'))      return 'page-reports';
          if (id.includes('/pages/Accounting'))   return 'page-accounting';
        },
      },
    },
    // Alerta si un chunk supera 1MB
    chunkSizeWarningLimit: 1000,
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
