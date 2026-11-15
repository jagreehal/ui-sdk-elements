import { resolve } from "node:path"
import { defineConfig } from "vite"
import { elementsCdn } from "../../src/vite.ts"

// Acme's CDN: their entries (stock ui-sdk tags and their own), this package's theme, then Acme's brand.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    elementsCdn({
      entries: "entries/*.ts",
      theme: [resolve(import.meta.dirname, "../../src/theme.css"), "brand.css"],
      outDir: resolve(import.meta.dirname, "../../docs/acme/cdn")
    })
  ]
})
