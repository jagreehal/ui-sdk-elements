import type { Spec } from "@json-render/core"
import { entriesNeededIn, getLoadedEntries, scan, whenEntriesReady } from "./loader.ts"
import { hydrate } from "./runtime.ts"
import { specToHtml } from "./spec-html.ts"

export type RenderResult = {
  needed: string[]
  loaded: string[]
}

/**
 * Inject a json-render Spec as real `ui-*` markup and wire its state/actions.
 * The auto-loader fetches only the entry modules those tags need.
 */
export async function renderSpec(spec: Spec, mount: HTMLElement): Promise<RenderResult> {
  mount.innerHTML = specToHtml(spec) // safe: specToHtml escapes all Spec text
  scan(mount)
  hydrate(mount, spec)
  const needed = entriesNeededIn(mount)
  await whenEntriesReady(needed)
  return { needed, loaded: getLoadedEntries() }
}
