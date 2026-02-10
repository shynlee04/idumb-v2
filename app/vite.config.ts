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
    rollupOptions: {
      // Server-only modules leak into client bundle via createServerFn import chains.
      // TanStack Start's .server.ts stripping doesn't prevent Rollup from resolving
      // transitive imports (SDK → node:child_process, logging → node:fs/path).
      // Externalizing prevents "X is not exported by __vite-browser-external" errors.
      external: [
        "@opencode-ai/sdk",
        /^node:/,
      ],
      output: {
        // Monaco editor is ~4MB — isolate into its own chunk for on-demand loading
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
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
