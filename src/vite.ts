import { globSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"

export type ElementsCdnOptions = {
  /** Entry modules as a glob relative to the Vite root, one per component, like `"src/entries/*.ts"`. */
  entries: string
  /** The tag prefix an entry defines, from its file name. Defaults to the name itself: `acme-badge.ts` → `acme-badge`. */
  tag?: (fileName: string) => string
  /** Stylesheets joined in order into `theme.css` beside `loader.js`, like this package's theme then your brand tokens. */
  theme?: string | string[]
  /** Load the json-render runtime on pages that embed a Spec. */
  runtime?: boolean
  /** Output folder, relative to the Vite root. Defaults to `dist/cdn`. */
  outDir?: string
}

const ENTRY = "ui-sdk-elements:cdn-loader"
const RESOLVED = `\0${ENTRY}`
const here = path.dirname(fileURLToPath(import.meta.url))
// Runs from src/ in this repo and from dist/ once published.
const own = (name: string) => path.join(here, `${name}${import.meta.url.endsWith(".ts") ? ".ts" : ".js"}`)

/**
 * Builds a CDN for your own components: `loader.js`, one chunk per entry, and `theme.css`. A page then needs two tags,
 * and the loader fetches each component the first time its tag appears.
 */
export function elementsCdn(options: ElementsCdnOptions): Plugin {
  let root = process.cwd()
  return {
    name: "ui-sdk-elements:cdn",
    // Before Vite's resolver, so the zod stub applies to json-render's import.
    enforce: "pre",
    config(config) {
      root = path.resolve(config.root ?? process.cwd())
      return {
        build: {
          outDir: options.outDir ?? "dist/cdn",
          emptyOutDir: true,
          lib: { entry: ENTRY, formats: ["es"], fileName: () => "loader.js" },
          rolldownOptions: {
            output: { entryFileNames: "loader.js", chunkFileNames: "assets/[name]-[hash].js", minify: true }
          }
        }
      }
    },
    async resolveId(source, importer) {
      // Vite resolves a library entry against the root first, so the virtual id can arrive as a path.
      if (source === ENTRY || source.endsWith(`${path.sep}${ENTRY}`)) return RESOLVED
      // An entry exists to define its tags, so it always keeps its side effects, even under "sideEffects": false.
      if (importer === RESOLVED) {
        const resolved = await this.resolve(source, importer, { skipSelf: true })
        return resolved && { ...resolved, moduleSideEffects: true }
      }
      // json-render builds zod schemas at module top level and the runtime never validates, so only its zod is stubbed.
      if (source === "zod" && importer?.includes(`${path.sep}@json-render${path.sep}`)) return own("cdn-zod-stub")
      return null
    },
    load(id) {
      if (id !== RESOLVED) return null
      const files = globSync(options.entries, { cwd: root }).sort()
      if (!files.length) this.error(`ui-sdk-elements: no entries match "${options.entries}" in ${root}`)
      const tag = options.tag ?? ((fileName: string) => fileName)
      const entries = files.map((file) => {
        const name = tag(path.basename(file, path.extname(file)))
        return `    ${JSON.stringify(name)}: () => import(${JSON.stringify(path.resolve(root, file))}),`
      })
      return [
        `import { createLoader } from ${JSON.stringify(own("create-loader"))}`,
        "const loader = createLoader({",
        "  entries: {",
        ...entries,
        "  },",
        ...(options.runtime ? [`  runtime: () => import(${JSON.stringify(own("runtime"))}),`] : []),
        "})",
        'if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => loader.start(document), { once: true })',
        "else loader.start(document)",
        "export default loader"
      ].join("\n")
    },
    generateBundle() {
      if (!options.theme) return
      const source = [options.theme].flat().map((file) => readFileSync(path.resolve(root, file), "utf8"))
      this.emitFile({ type: "asset", fileName: "theme.css", source: source.join("\n") })
    }
  }
}
