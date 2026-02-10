import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { resolve } from "node:path"

export default defineConfig({
  root: resolve(__dirname),
  plugins: [
    tanstackStart({
      srcDirectory: ".",
      spa: { enabled: true },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname),
      "@shared": resolve(__dirname, "../src/dashboard/shared"),
    },
  },
  build: {
    outDir: resolve(__dirname, "../dist/app"),
    emptyOutDir: true,
  },
  server: {
    port: 5180,
    fs: {
      allow: [
        resolve(__dirname),        // app/ directory (Vite root)
        resolve(__dirname, ".."),  // project root (covers node_modules/)
      ],
    },
  },
})
