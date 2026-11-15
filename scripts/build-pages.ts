/**
 * Sync built CDN assets into docs/ for GitHub Pages and refresh generated.html.
 * Run after `pnpm build`; `pnpm pages` does both.
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { sampleSpec } from "../src/catalog.ts"
import { specToPage } from "../src/spec-html.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const cdn = join(root, "dist/cdn")
const docs = join(root, "docs")
const ui = join(docs, "ui")

if (!existsSync(join(cdn, "loader.js"))) {
  console.error("Missing dist/cdn/loader.js. Run pnpm build first.")
  process.exit(1)
}

mkdirSync(docs, { recursive: true })
rmSync(ui, { recursive: true, force: true }) // drop stale hashed chunks from earlier builds
cpSync(cdn, ui, { recursive: true })
writeFileSync(join(docs, ".nojekyll"), "")
writeFileSync(
  join(docs, "generated.html"),
  specToPage(sampleSpec, {
    title: "Sample catalog page · ui-sdk-elements",
    assetsBase: "./ui/"
  })
)

console.log("Wrote docs/ui/ and docs/generated.html")
