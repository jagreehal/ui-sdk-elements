import { defineConfig } from "vite"
import { elementsCdn } from "./src/vite.ts"

// This package's own CDN, built with the same plugin anyone uses for theirs.
export default defineConfig({
  plugins: [
    elementsCdn({
      entries: "src/entries/*.ts",
      tag: (fileName) => `ui-${fileName}`,
      theme: "src/theme.css",
      runtime: true
    })
  ]
})
