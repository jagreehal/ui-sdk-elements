/** Loads one component module; a dynamic `import()` of the entry that defines its tags. */
export type EntryImport = () => Promise<object>

/** Tag prefix → the entry that defines it, like `{ "ui-dialog": () => import("./dialog.ts") }`. */
export type EntryMap = Record<string, EntryImport>

/** The json-render runtime, loaded only when the page embeds a Spec (`<script id="json-render-spec">`). */
export type SpecRuntime = { hydrateDocument: () => void }

export type LoaderOptions = {
  entries: EntryMap
  runtime?: () => Promise<SpecRuntime>
}

export type Loader = {
  /** The entry for a tag: `ui-select-item` → `ui-select`. Longest prefix wins, so `ui-menubar` beats `ui-menu`. */
  entryForTag: (tag: string) => string | null
  /** Loads the entry for every tag in `root` and below. */
  scan: (root: Element) => void
  /** The entries a subtree needs, sorted. */
  entriesNeededIn: (root: ParentNode) => string[]
  /** Resolves once each entry has defined its tag; rejects naming the entries that failed to load. */
  whenEntriesReady: (entries: string[]) => Promise<void>
  getLoadedEntries: () => string[]
  onEntriesLoaded: (listener: (entries: string[]) => void) => () => void
  /** Scans the document, watches it for new tags and hydrates an embedded Spec. Returns a function that stops watching. */
  start: (document: Document) => () => void
}

/**
 * A loader for any set of custom elements: yours, ui-sdk's, or both. It fetches an entry the first time one of
 * its tags appears and never twice, so a page pays only for the components it uses.
 */
export function createLoader(options: LoaderOptions): Loader {
  const prefixes = Object.keys(options.entries).sort((a, b) => b.length - a.length)
  const loading = new Map<string, Promise<void>>()
  const loaded = new Set<string>()
  const listeners = new Set<(entries: string[]) => void>()
  const snapshot = () => [...loaded].sort()

  const entryForTag = (tag: string) => prefixes.find((prefix) => tag === prefix || tag.startsWith(`${prefix}-`)) ?? null

  const load = (entry: string) => {
    if (loaded.has(entry) || loading.has(entry)) return
    if (customElements.get(entry)) {
      loaded.add(entry)
      return
    }
    const promise = options.entries[entry]!()
      .then(() => {
        loaded.add(entry)
        for (const listener of listeners) listener(snapshot())
      })
      .catch((error: Error) => {
        loading.delete(entry)
        console.error(`Failed to load ${entry}`, error)
      })
    loading.set(entry, promise)
  }

  const entriesNeededIn = (root: ParentNode) => {
    const needed = new Set<string>()
    const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")]
    for (const element of elements) {
      const entry = entryForTag(element.localName)
      if (entry) needed.add(entry)
    }
    return [...needed].sort()
  }

  const scan = (root: Element) => {
    for (const entry of entriesNeededIn(root)) load(entry)
  }

  const whenEntriesReady = async (entries: string[]) => {
    // A failed import settles its loading promise too; whenDefined alone would wait forever.
    await Promise.all(entries.map((entry) => loading.get(entry)))
    const missing = entries.filter((entry) => !customElements.get(entry))
    if (missing.length) throw new Error(`Failed to load entries: ${missing.join(", ")}`)
  }

  const start = (document: Document) => {
    scan(document.documentElement)
    if (options.runtime && document.getElementById("json-render-spec")) hydrateSpec(document, options.runtime)
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof Element) scan(node)
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    return () => observer.disconnect()
  }

  return {
    entryForTag,
    scan,
    entriesNeededIn,
    whenEntriesReady,
    getLoadedEntries: snapshot,
    onEntriesLoaded(listener) {
      listeners.add(listener)
      listener(snapshot())
      return () => listeners.delete(listener)
    },
    start
  }
}

// Clicks on Spec buttons (a Cta with on.press) before the runtime arrives are queued and replayed, not lost.
function hydrateSpec(document: Document, runtime: () => Promise<SpecRuntime>) {
  const early: HTMLElement[] = []
  const queue = (event: Event) => {
    const target =
      event.target instanceof Element ? event.target.closest<HTMLElement>("button[data-jr-key], a[data-jr-key]") : null
    if (!target) return
    event.preventDefault()
    early.push(target)
  }
  document.addEventListener("click", queue, true)
  void runtime().then((module) => {
    module.hydrateDocument()
    document.removeEventListener("click", queue, true)
    for (const target of early) target.click()
  })
}
