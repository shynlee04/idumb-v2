import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Story 12-01: Dynamic port — reads from env var set by dashboard.ts, falls back to 3001
const backendPort = process.env.VITE_BACKEND_PORT || "3001"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      "/ws": {
        target: `ws://localhost:${backendPort}`,
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
