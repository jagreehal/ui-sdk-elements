import { resolve } from "node:path"
import { defineConfig } from "vite"

// The examples as static pages for GitHub Pages: each page ships the loader, which fetches only the entries it uses.
export default defineConfig({
  root: resolve(import.meta.dirname, "examples"),
  base: "./",
  // Nothing in the examples validates a Spec; see src/cdn-zod-stub.ts.
  resolve: { alias: { zod: resolve(import.meta.dirname, "src/cdn-zod-stub.ts") } },
  build: {
    outDir: resolve(import.meta.dirname, "docs/examples"),
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        pulse: resolve(import.meta.dirname, "examples/pulse/index.html"),
        studio: resolve(import.meta.dirname, "examples/studio/index.html")
      }
    }
  }
})
