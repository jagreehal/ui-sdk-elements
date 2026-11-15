# ui-sdk-elements

Ship your components as a CDN: two tags on any page, and each component loads the first time its tag appears.

`ui-sdk-elements` sits on [ui-sdk](https://ui-sdk.dev), which owns keyboard, focus and ARIA. This package adds what you need to ship them as a design system:

- **Your own CDN.** `elementsCdn()` builds `loader.js`, one chunk per component, and `theme.css` from a folder of entries: stock ui-sdk tags, your own components, or both, under any prefix.
- **A theme driven by tokens.** Every component reads `--ds-*` tokens, so a brand is a short file of overrides, never forked component CSS.
- **Components composed from ui-sdk core**, like `ui-step-grid`, that get the same keyboard, focus and agent support as ui-sdk's own.
- **Generated pages.** A json-render catalog an agent writes Specs against, rendered to static HTML (`specToPage`) or live DOM (`renderSpec`).

Not affiliated with or endorsed by Vercel.

**[Live demos](https://jagreehal.github.io/ui-sdk-elements/)** · [Your own CDN (Acme)](https://jagreehal.github.io/ui-sdk-elements/acme/) · [Pulse](https://jagreehal.github.io/ui-sdk-elements/examples/pulse/) · [Brand Studio](https://jagreehal.github.io/ui-sdk-elements/examples/studio/) · [Executable stories](https://jagreehal.github.io/ui-sdk-elements/report/)

## Use the hosted components

This package's own CDN: every component below, themed, from npm via jsDelivr. Pin a version to keep your pages on the release you tested.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ui-sdk-elements@0.1/dist/cdn/theme.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/ui-sdk-elements@0.1/dist/cdn/loader.js"></script>

<ui-toggle><button>Bold</button></ui-toggle>

<ui-dialog>
  <ui-dialog-trigger><button>Invite teammate</button></ui-dialog-trigger>
  <ui-dialog-backdrop hidden></ui-dialog-backdrop>
  <ui-dialog-content hidden>
    <ui-dialog-title>Invite a teammate</ui-dialog-title>
    <ui-dialog-close><button>Send invite</button></ui-dialog-close>
  </ui-dialog-content>
</ui-dialog>
```

The page above fetches the toggle and dialog chunks and nothing else. Tags added later, by a framework or an agent, load when they appear.

Components: `accordion`, `button`, `checkbox`, `color-picker`, `dialog`, `field`, `input`, `menu`, `menubar`, `meter`, `popover`, `segmented-control`, `select`, `slider`, `switch`, `tabs`, `toast`, `toggle`, `toolbar`, `tooltip`, and the composed `step-grid`. Markup for each is in the [ui-sdk docs](https://ui-sdk.dev/docs).

## Build your own CDN

Put one entry module per component in a folder. An entry's file name is the tag prefix it defines, so `ui-dialog.ts` serves `<ui-dialog>` and all its `ui-dialog-*` parts:

```
acme-cdn/
  entries/
    ui-dialog.ts     import "@ui-sdk/web/dialog"
    ui-toggle.ts     import "@ui-sdk/web/toggle"
    acme-badge.ts    your own custom element
  brand.css          your --ds-* tokens and component styles
  vite.config.js
```

```js
// vite.config.js
import { defineConfig } from "vite"
import { elementsCdn } from "ui-sdk-elements/vite"

export default defineConfig({
  plugins: [
    elementsCdn({
      entries: "entries/*.ts",
      theme: ["node_modules/ui-sdk-elements/dist/theme.css", "brand.css"],
    }),
  ],
})
```

`vite build` writes `dist/cdn/`: `loader.js`, `theme.css` and one chunk per entry in `assets/`. Host that folder anywhere static: GitHub Pages, S3, Cloudflare, or your own npm package through jsDelivr. A page then needs the same two tags as above, pointed at your URLs.

| Option | |
| --- | --- |
| `entries` | Glob for entry modules, relative to the Vite root. |
| `tag` | Maps a file name to its tag prefix. Defaults to the name itself; this repo uses `(name) => \`ui-${name}\``. |
| `theme` | One stylesheet or a list, joined in order into `theme.css`. |
| `runtime` | Load the json-render runtime on pages that embed a Spec. |
| `outDir` | Defaults to `dist/cdn`. |

Each entry keeps its side effects even when your `package.json` says `"sideEffects": false`, because an entry exists to define its tags. [`examples/acme-cdn`](./examples/acme-cdn) is a complete example, and its [live page](https://jagreehal.github.io/ui-sdk-elements/acme/) uses nothing but Acme's two files.

With another bundler, use the loader directly. Keys are tag prefixes, and the longest one wins (`ui-menubar` before `ui-menu`):

```ts
import { createLoader } from "ui-sdk-elements/create-loader"

createLoader({
  entries: {
    "ui-dialog": () => import("@ui-sdk/web/dialog"),
    "acme-badge": () => import("./acme-badge.ts"),
  },
}).start(document)
```

## Re-brand with tokens

A brand overrides tokens after the theme:

| Token | Role |
| --- | --- |
| `--ds-ink`, `--ds-ink-soft` | Text, muted text |
| `--ds-paper`, `--ds-paper-2` | Page and recessed backgrounds |
| `--ds-surface` | Raised surfaces: cards, popups, dialogs |
| `--ds-line` | Borders |
| `--ds-accent`, `--ds-accent-soft`, `--ds-accent-ink` | Brand color, its tint, text on the tint |
| `--ds-on-accent` | Text and icons on the accent |
| `--ds-scrim`, `--ds-warn`, `--ds-warn-soft` | Backdrops, warnings |
| `--ds-radius`, `--ds-radius-lg`, `--ds-font`, `--ds-font-mono`, `--ds-shadow` | Shape and type |

[Pulse](./examples/pulse/style.css) is a dark brand written this way. [Brand Studio](https://jagreehal.github.io/ui-sdk-elements/examples/studio/) derives the whole set from an accent, a mode, a radius and a typeface, checks WCAG contrast, and gives you the CSS.

## Compose a component

When ui-sdk doesn't ship a component, build it from `@ui-sdk/core` behaviors so it gets the same keyboard, focus, ARIA and agent support. [`src/components/step-grid.ts`](./src/components/step-grid.ts) is the template: a `definePrimitive` on `createGridFocus` (one tab stop, arrow keys, Space to toggle, `role="grid"`), `agent.actions` so agents can call `setTrack` and `clear`, and `createParts` to register its tags. Its styles live in the theme, so every brand restyles it, and a CDN entry ships it like any other.

```ts
import { stepGridHtml } from "ui-sdk-elements/step-grid"

grid.innerHTML = stepGridHtml(["Kick", "Snare", "Hat"], 16)
grid.tracks = ["Kick", "Snare", "Hat"]
grid.addEventListener("valuechange", (event) => (grid.value = event.detail.value))
```

## Use with a bundler

```bash
pnpm add ui-sdk-elements @ui-sdk/web @ui-sdk/core
```

```ts
import "ui-sdk-elements/theme.css"
import "ui-sdk-elements/dialog"
import "ui-sdk-elements/toggle"
```

`@ui-sdk/web` and `@ui-sdk/core` are peer dependencies; `vite` is an optional peer for `ui-sdk-elements/vite`. Every module ships types.

## Generated pages

The catalog is a [json-render](https://github.com/vercel-labs/json-render) vocabulary: Hero, Section, Grid, Card, Cta and Quote, plus the interactive components. An agent writes a flat Spec against it, and nothing outside the catalog renders.

```ts
import { compileSpecStream } from "@json-render/core"
import { catalog } from "ui-sdk-elements/catalog"
import { specToPage } from "ui-sdk-elements/spec-html"

const { text } = await generateText({ model, system: catalog.prompt(), prompt: brief })
const spec = compileSpecStream(text)
if (!catalog.validate(spec).success) throw new Error("invalid spec")
const html = specToPage(spec, { title: "Fieldnote", assetsBase: "https://cdn.jsdelivr.net/npm/ui-sdk-elements@0.1/dist/cdn/" })
```

`specToPage` runs in plain Node and puts the content in the HTML. Specs may use `state`, `visible`, `repeat`, `on.press → setState` and `$bindState`; the loader fetches the 8 kB runtime only for pages that need it. `renderSpec(spec, mount)` renders into a live page instead.

## Agents

Every control is named, so ui-sdk's agent bridge (`createAgent` from `@ui-sdk/web/agent`) can read and drive the components, and `registerTools` offers the same to a browser's agent over WebMCP. The examples and their stories show both.

## Develop

Requires Node 24 and pnpm.

```bash
pnpm install
pnpm exec playwright install chromium   # once
pnpm dev        # showcase, examples and the agent demo (copy .env.example to .env for /agent.html)
pnpm quality    # types, lint, format, unit tests, stories
```

| Command | |
| --- | --- |
| `pnpm build` | npm `dist/`, the CDN in `dist/cdn/`, types |
| `pnpm pages` | `docs/`: the site, this package's CDN, Acme's CDN and the examples |
| `pnpm test` | Renderer unit tests |
| `pnpm test:e2e` | Playwright executable stories against `docs/`, served under `/ui-sdk-elements/` as on Pages; writes `docs/report/` |
| `BASE_URL=https://jagreehal.github.io/ui-sdk-elements/ pnpm test:e2e` | The same stories against the live site |

Stories fail on any console error, page error or same-origin 4xx/5xx. Specs ask `tests/fixtures.ts` for page objects in `tests/pages/` and components in `tests/components/`.

### Releases

Add a changeset with each user-facing change (`pnpm changeset`); CI requires one on every pull request. On `main`, the Release workflow opens a release pull request, and merging it publishes to npm with provenance.

## License

Apache-2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
