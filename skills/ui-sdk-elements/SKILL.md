---
name: ui-sdk-elements
description: Ship branded web components from a CDN with ui-sdk-elements. Use when someone wants ui-sdk components on a page with no build step, wants to build their own component CDN (stock ui-sdk tags, their own custom elements, or both) with elementsCdn() or createLoader, re-brands components with --ds-* tokens, composes a new component from @ui-sdk/core, or renders agent-generated pages from the json-render catalog.
---

# ui-sdk-elements

Components load the first time their tag appears on a page, so a page pays only for what it uses. ui-sdk owns keyboard, focus and ARIA; this package owns the theme and how components ship.

## Put components on a page

Two tags, then ui-sdk markup. Pin a version (`ui-sdk-elements@0.1`) to keep a page on the release you tested.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ui-sdk-elements@0.1/dist/cdn/theme.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/ui-sdk-elements@0.1/dist/cdn/loader.js"></script>
```

Write each component's markup as ui-sdk documents it (https://ui-sdk.dev/docs): parts nested inside the root, native `<button>` and `<input>` inside the parts that wrap them. Name every control: an `aria-label` on a slider, tabs or accordion root, a label part elsewhere. Change events (`valuechange`, `openchange`, `pressedchange`) don't bubble: listen on the element.

## Build a CDN of your own components

1. Make a folder with one module per component. The file name is the tag prefix it defines: `ui-dialog.ts` containing `import "@ui-sdk/web/dialog"`, or `acme-badge.ts` that defines `<acme-badge>`.
2. Add `elementsCdn()` to a Vite config:

   ```js
   import { defineConfig } from "vite"
   import { elementsCdn } from "ui-sdk-elements/vite"

   export default defineConfig({
     plugins: [elementsCdn({ entries: "entries/*.ts", theme: ["node_modules/ui-sdk-elements/dist/theme.css", "brand.css"] })],
   })
   ```

3. `vite build` writes `dist/cdn/` (`loader.js`, `theme.css`, a chunk per entry). Host it on any static host and point the two tags at it.

Outside Vite, call `createLoader({ entries: { "acme-badge": () => import("./acme-badge.js") } }).start(document)` from `ui-sdk-elements/create-loader`.

## Re-brand

Override `--ds-*` tokens after the theme: `--ds-accent`, `--ds-on-accent` (text on the accent), `--ds-ink`, `--ds-paper`, `--ds-surface`, `--ds-line`, `--ds-radius` and the rest listed in the README. Never restyle a component's parts to change the brand. Check contrast: text 4.5:1, controls 3:1.

## Generate a page

Read `catalog.prompt()` from `ui-sdk-elements/catalog`, emit a flat json-render Spec with only those types, check it with `catalog.validate`, and render it with `specToPage(spec, { title, assetsBase })` (static HTML) or `renderSpec(spec, mount)` (live DOM).
