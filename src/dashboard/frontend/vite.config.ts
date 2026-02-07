/**
 * Vite configuration for iDumb Dashboard frontend
 */

import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to backend
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // Proxy WebSocket to backend
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@shared": resolve(__dirname, "../shared"),
    },
  },
})
