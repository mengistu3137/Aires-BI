import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: "auto",
      devOptions: {
        enabled: true,
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icons/*.png"],
      manifest: {
        name: "Aires-BI — Business Intelligence & Field Survey",
        short_name: "Aires-BI",
        description: "Field survey collection and competitor price intelligence platform.",
        theme_color: "#A41821",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          // 1. SPECIFIC RULE FOR PRODUCTS: Give 3,424 items enough time to download on mobile
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/v1/products"),
            handler: "NetworkFirst",
            options: {
              cacheName: "aires-products-cache",
              networkTimeoutSeconds: 20, // 20 seconds instead of 4 seconds
              cacheableResponse: {
                statuses: [0, 200], // Only cache valid successful responses, never errors
              },
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          // 2. GENERAL RULE FOR ALL OTHER API ENDPOINTS (users, stores, etc.)
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/v1/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "aires-api-cache",
              networkTimeoutSeconds: 10, // Bumped from 4s to 10s for mobile stability
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});