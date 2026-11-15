# Agent notes

## ui-sdk

Before using ui-sdk, follow the ui-sdk skill if it's installed, and read `node_modules/@ui-sdk/web/docs/llms.txt`. To build a new component, also search `node_modules/@ui-sdk/web/docs/core.md` by heading, and read `rendering.md` next to it.

## ui-sdk-elements

This package’s interaction behavior is ui-sdk’s. Follow the ui-sdk skill and docs for keyboard, focus, ARIA, and composition. Use this package for theme tokens (`src/theme.css`) and distribution.

Distribution is the package's core: `src/create-loader.ts` (`createLoader`, any tag prefix → entry) and `src/vite.ts` (`elementsCdn()`, builds a CDN from a folder of entries). This package's own CDN is one instance: `src/loader.ts` and `vite.cdn.config.js`. `examples/acme-cdn` proves the same plugin for someone else's components; keep its stories passing when either file changes.

## Branded components

- Style only through `--ds-*` tokens in `src/theme.css`; a brand is token overrides, never forked component CSS. Use the semantic tokens (`--ds-surface`, `--ds-on-accent`, `--ds-scrim`), not `--ds-white`, for surfaces and text on the accent.
- A component ui-sdk doesn't ship is composed from `@ui-sdk/core` in `src/components/<name>.ts` (copy `step-grid.ts`), exposed by `src/entries/<name>.ts` with a `ui-<name>` tag so the loader finds it, styled in `theme.css`, and given `agent.actions`.
- Name every control (root `aria-label` on sliders, tabs and accordions) so `createAgent().snapshot()` has no unnamed entries; `examples/*` stories check this.

## Generative pages (catalog)

To construct a page from components (json-render style):

1. Read `src/catalog.ts` or call `catalog.prompt()` — only those types are allowed.
2. Emit a flat Spec: `{ root, elements }` where `children` are string keys into `elements`.
3. Render with `renderSpec(spec, mount)` from `src/render-spec.ts` (expands composites into valid `ui-*` trees).
4. Do not eagerly import every entry — inject markup and let `src/loader.ts` load only the tags present on the page.

Demo: `/agent.html` (`provider/model` via `/api/generate` → Spec → dynamic entry load). Configure with `UI_SDK_MODEL` (e.g. `opencode-go/beam-free`) and provider keys in `.env`.

Shareable static demos live in `docs/` (GitHub Pages); `pnpm pages` builds them, and CI publishes them on `main`.

## Checks and releases

- Use pnpm (`packageManager` is pinned). `pnpm quality` runs types, oxlint (with the anti-slop rules in `tools/oxlint`), oxfmt, unit tests and the Playwright stories. Fix lint by changing the code; a type assertion needs a `// SAFETY:` comment naming the checked invariant.
- Stories follow `tests/`: specs ask `fixtures.ts` for page objects (`tests/pages/`) and components (`tests/components/`), assert web-first, and fail on any browser error or same-origin 4xx/5xx.
- Every user-facing change gets a changeset (`pnpm changeset`). Releases go through the Release workflow, never `npm publish` from a laptop.
