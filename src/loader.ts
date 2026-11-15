import { createLoader, type EntryMap } from "./create-loader.ts"

// This package's components: src/entries/<name>.ts defines the ui-<name> tags.
const entries: EntryMap = Object.fromEntries(
  Object.entries(import.meta.glob<object>("./entries/*.ts")).map(([path, load]) => [
    `ui-${path.slice(path.lastIndexOf("/") + 1, -".ts".length)}`,
    load
  ])
)

export const loader = createLoader({ entries, runtime: () => import("./runtime.ts") })

export const { entryForTag, scan, entriesNeededIn, whenEntriesReady, getLoadedEntries, onEntriesLoaded } = loader

if ("document" in globalThis) {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => loader.start(document), { once: true })
  else loader.start(document)
}
