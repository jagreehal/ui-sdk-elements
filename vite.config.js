import { fileURLToPath, URL } from "node:url"
import { defineConfig, loadEnv } from "vite"
import tailwindcss from "@tailwindcss/vite"
import { generateApiPlugin } from "./vite-plugin-generate.ts"

const src = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    // A multi-page site, like GitHub Pages serves it: unknown paths are 404s, not index.html.
    appType: "mpa",
    plugins: [tailwindcss(), generateApiPlugin()],
    resolve: {
      alias: [
        {
          find: "ui-sdk-elements/theme.css",
          replacement: `${src}/theme.css`
        },
        {
          find: /^ui-sdk-elements\/(.+)$/,
          replacement: `${src}/entries/$1.ts`
        }
      ]
    },
    server: {
      proxy: {
        "/ollama": {
          target: "http://127.0.0.1:11434",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ollama/, "")
        }
      }
    }
  }
})
