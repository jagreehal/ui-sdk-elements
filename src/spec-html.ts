import {
  evaluateVisibility,
  getByPath,
  resolveElementProps,
  resolveRepeatItemStatePath,
  resolveRepeatStatePath,
  type PropResolutionContext,
  type Spec
} from "@json-render/core"

/**
 * json-render renderer that outputs an HTML string (no DOM, no framework).
 * Same contract as @json-render/react etc.: a registry maps catalog types to
 * components; core resolves props ($state, $item...), `visible` and `repeat`.
 * One renderer for the live preview (`renderSpec`) and static publishing
 * (`specToPage`, runs in Node). Spec text is model output: everything is
 * escaped and hrefs are allow-listed.
 */

/** A JSON value: what a Spec's props hold once json-render has resolved $state, $item and the rest. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** A component's resolved props. */
export type Props = { [key: string]: Json | undefined }

/** Markup that is already escaped; plain strings passed as children are text and get escaped. */
class Html {
  readonly html: string
  // A plain field, not a parameter property: Node runs this file with type stripping only.
  constructor(html: string) {
    this.html = html
  }
}

type Attrs = Record<string, string | boolean | number | null | undefined>
type Child = Html | string

const raw = (html: string) => new Html(html)

export function escapeHtml(value: string | number | boolean | null | undefined): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  )
}

/** Only http(s), mailto, tel, root-relative, fragment or plain relative paths; anything else → "#". */
export function safeHref(value: Json | undefined): string {
  const href = String(value ?? "").trim()
  if (!href) return "#"
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href
  if (/^[/#?.]/.test(href) && !href.startsWith("//")) return href
  return /^[\w-]+(\/|$)/.test(href) && !href.includes(":") ? href : "#"
}

function h(tag: string, attrs: Attrs = {}, children: Child[] = []): Html {
  let out = `<${tag}`
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue
    out += value === true ? ` ${key}` : ` ${key}="${escapeHtml(value)}"`
  }
  out += ">"
  for (const child of children) out += child instanceof Html ? child.html : escapeHtml(child)
  return raw(`${out}</${tag}>`)
}

const gaps = new Map([
  ["sm", "0.5rem"],
  ["md", "1rem"],
  ["lg", "1.5rem"]
])
const str = (value: Json | undefined, fallback = "") =>
  value === null || value === undefined ? fallback : String(value)
/** Like str, but an absent value stays absent, so its attribute isn't written. */
const optional = (value: Json | undefined) => (value === null || value === undefined ? undefined : String(value))

/** A list prop's items. */
function listOf<T>(value: Json | undefined): T[] {
  // SAFETY: catalog.ts fixes each list prop's item shape with zod, and Specs reach the renderer after catalog.validate.
  return Array.isArray(value) ? (value as T[]) : []
}

/** A link when there is an href; otherwise a button for on.press (wired by runtime.ts). */
function cta(label: Json | undefined, href: Json | undefined, variant: Json | undefined) {
  const attrs = { "data-slot": "cta", "data-variant": variant === "secondary" ? "secondary" : "primary" }
  return href
    ? h("a", { ...attrs, href: safeHref(href) }, [str(label, "Learn more")])
    : h("button", { ...attrs, type: "button" }, [str(label, "Learn more")])
}

function flex(direction: "row" | "column", props: Props, children: Html[]) {
  const gap = gaps.get(str(props.gap, "md")) ?? "1rem"
  return h("div", { style: `display:flex;flex-direction:${direction};flex-wrap:wrap;gap:${gap};` }, children)
}

export type Component = (props: Props, children: Html[]) => Html
export type Registry = Record<string, Component>

export const registry = {
  Stack: (props, children) => flex("column", props, children),
  Row: (props, children) => flex("row", props, children),
  Text: (props) => {
    const tone = str(props.tone, "body")
    if (tone === "title") {
      return h("h2", { style: "margin:0;font-size:1.35rem;font-weight:600;" }, [str(props.content)])
    }
    const color = tone === "muted" ? "color:var(--ds-ink-soft);" : ""
    return h("p", { style: `margin:0;font-size:0.95rem;line-height:1.5;${color}` }, [str(props.content)])
  },

  // —— Marketing composites (plain HTML + theme; no entry module needed) ——
  Hero: (props, children) =>
    h("section", { "data-slot": "hero" }, [
      ...(props.eyebrow ? [h("p", { "data-slot": "hero-eyebrow" }, [str(props.eyebrow)])] : []),
      h("h1", { "data-slot": "hero-title" }, [str(props.title)]),
      ...(props.subtitle ? [h("p", { "data-slot": "hero-subtitle" }, [str(props.subtitle)])] : []),
      ...(props.ctaLabel || props.secondaryLabel || children.length
        ? [
            h("div", { "data-slot": "hero-actions" }, [
              ...(props.ctaLabel ? [cta(props.ctaLabel, props.ctaHref, "primary")] : []),
              ...(props.secondaryLabel ? [cta(props.secondaryLabel, props.secondaryHref, "secondary")] : []),
              ...children
            ])
          ]
        : [])
    ]),
  Section: (props, children) =>
    h("section", { "data-slot": "section" }, [
      ...(props.title ? [h("h2", { "data-slot": "section-title" }, [str(props.title)])] : []),
      ...(props.intro ? [h("p", { "data-slot": "section-intro" }, [str(props.intro)])] : []),
      h("div", { "data-slot": "section-body" }, children)
    ]),
  Grid: (props, children) => {
    const columns = [2, 3, 4].includes(Number(props.columns)) ? Number(props.columns) : 3
    return h("div", { "data-slot": "grid", style: `--cols:${columns}` }, children)
  },
  Card: (props, children) =>
    h("article", { "data-slot": "card" }, [
      ...(props.eyebrow ? [h("p", { "data-slot": "card-eyebrow" }, [str(props.eyebrow)])] : []),
      h("h3", { "data-slot": "card-title" }, [str(props.title)]),
      ...(props.body ? [h("p", { "data-slot": "card-body" }, [str(props.body)])] : []),
      ...children
    ]),
  Cta: (props) => cta(props.label, props.href, props.variant),
  Quote: (props) =>
    h("figure", { "data-slot": "quote" }, [
      h("blockquote", {}, [str(props.quote)]),
      h("figcaption", {}, [h("strong", {}, [str(props.author)]), ...(props.role ? [`, ${str(props.role)}`] : [])])
    ]),

  // —— Interactive ui-sdk components (loader fetches their entry modules) ——
  Toggle: (props) =>
    h("ui-toggle", { "default-pressed": props.pressed === true }, [
      h("button", { type: "button" }, [str(props.label, "Toggle")])
    ]),
  Switch: (props) =>
    h(
      "label",
      { style: "display:flex;align-items:center;justify-content:space-between;gap:1rem;font-size:0.875rem;" },
      [
        str(props.label, "Setting"),
        h("ui-switch", { "default-checked": props.checked === true }, [h("ui-switch-thumb")])
      ]
    ),
  Checkbox: (props) =>
    h("label", { style: "display:flex;align-items:center;gap:0.5rem;font-size:0.875rem;" }, [
      h("ui-checkbox", { "default-checked": props.checked === true }, [
        h("ui-checkbox-indicator", { "aria-hidden": true }, ["✓"])
      ]),
      str(props.label, "Option")
    ]),
  Select: (props) => {
    const options = listOf<{ value: string; label: string }>(props.options)
    return h(
      "ui-select",
      { placeholder: optional(props.placeholder), "default-value": optional(props.value ?? props.defaultValue) },
      [
        h("ui-select-label", {}, [str(props.label, "Select")]),
        h("ui-select-trigger", {}, [h("button", { type: "button" }, [h("ui-select-value"), " ▾"])]),
        h(
          "ui-select-content",
          {},
          options.map((option) =>
            h("ui-select-item", { value: option.value }, [option.label, h("ui-select-item-indicator")])
          )
        )
      ]
    )
  },
  Tabs: (props) => {
    const tabs = listOf<{ value: string; label: string; content: string }>(props.tabs)
    return h("ui-tabs", { "default-value": str(props.defaultValue, tabs[0]?.value ?? "") }, [
      h(
        "ui-tabs-list",
        { "aria-label": str(props.label, "Tabs") },
        tabs.map((tab) => h("ui-tabs-tab", { value: tab.value }, [h("button", { type: "button" }, [tab.label])]))
      ),
      ...tabs.map((tab) => h("ui-tabs-panel", { value: tab.value }, [tab.content]))
    ])
  },
  Dialog: (props) =>
    h("ui-dialog", {}, [
      ...(props.triggerLabel
        ? [h("ui-dialog-trigger", {}, [h("button", { type: "button" }, [str(props.triggerLabel)])])]
        : []),
      h("ui-dialog-backdrop", { hidden: true }),
      h("ui-dialog-content", { hidden: true }, [
        h("ui-dialog-title", {}, [str(props.title, "Dialog")]),
        ...(props.description ? [h("ui-dialog-description", {}, [str(props.description)])] : []),
        h("ui-dialog-close", {}, [
          h("button", { type: "button", "data-variant": "solid" }, [str(props.confirmLabel, "Close")])
        ])
      ])
    ]),
  Popover: (props) =>
    h("ui-popover", {}, [
      h("ui-popover-trigger", {}, [h("button", { type: "button" }, [str(props.triggerLabel, "Open")])]),
      h("ui-popover-content", { side: "bottom", align: "start", "side-offset": 8 }, [
        h("ui-popover-title", {}, [str(props.title, "Details")]),
        ...(props.description ? [h("ui-popover-description", {}, [str(props.description)])] : []),
        h("ui-popover-close", {}, [h("button", { type: "button", "data-variant": "solid" }, ["Done"])])
      ])
    ]),
  Menu: (props) => {
    const items = listOf<{ value: string; label: string; danger?: boolean | null }>(props.items)
    return h("ui-menu", {}, [
      h("ui-menu-trigger", {}, [h("button", { type: "button" }, [str(props.triggerLabel, "Menu")])]),
      h(
        "ui-menu-content",
        {},
        items.map((item) =>
          h("ui-menu-item", { value: item.value, "data-variant": item.danger ? "danger" : undefined }, [item.label])
        )
      )
    ])
  },
  Tooltip: (props) =>
    h("ui-tooltip", {}, [
      h("ui-tooltip-trigger", {}, [h("button", { type: "button", "aria-label": str(props.label, "Hint") }, ["★"])]),
      h("ui-tooltip-content", {}, [str(props.hint)])
    ]),
  Slider: (props) => {
    const label = str(props.label, "Value")
    return h("ui-slider", { "default-value": str(props.defaultValue, "50"), style: "display:block;min-width:12rem;" }, [
      h(
        "div",
        {
          style:
            "display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;font-size:0.875rem;"
        },
        [h("span", { style: "font-weight:500;" }, [label]), h("ui-slider-value")]
      ),
      h("ui-slider-control", {}, [
        h("ui-slider-track", {}, [h("ui-slider-indicator"), h("ui-slider-thumb", { "aria-label": label })])
      ])
    ])
  },
  Accordion: (props) => {
    const items = listOf<{ value: string; title: string; content: string }>(props.items)
    const defaultValue = optional(props.defaultValue) ?? items[0]?.value
    return h(
      "ui-accordion",
      { "default-value": defaultValue, "aria-label": str(props.label, "Questions") },
      items.map((item) =>
        h("ui-accordion-item", { value: item.value }, [
          h("ui-accordion-header", {}, [
            h("h4", {}, [h("ui-accordion-trigger", {}, [h("button", { type: "button" }, [item.title, " ▾"])])])
          ]),
          h("ui-accordion-panel", { hidden: item.value !== defaultValue }, [item.content])
        ])
      )
    )
  }
} satisfies Registry

const components = new Map<string, Component>(Object.entries(registry))

function renderElement(spec: Spec, key: string, ctx: PropResolutionContext, ancestors: Set<string>): Html[] {
  if (ancestors.has(key)) throw new Error(`Cycle in spec at "${key}"`)
  const element = spec.elements[key]
  if (!element) return [] // json-render skips missing children rather than failing the page
  // Outside repeat, keep state-driven elements in the HTML (hidden) so runtime.ts can show them later.
  // shortcut: inside `repeat`, visible/on.press/$bindState are resolved once at render and never update; tag repeated items with their index path if a catalog needs live repeated content.
  const live = ctx.repeatBasePath === undefined && needsRuntime(element)
  const visible = evaluateVisibility(element.visible, ctx)
  if (!visible && !live) return []
  const component = components.get(element.type)
  if (!component) throw new Error(`Unknown component type "${element.type}"`)

  const path = new Set(ancestors).add(key)
  const props = propsOf(element, ctx)
  const renderChildren = (scope: PropResolutionContext) =>
    (element.children ?? []).flatMap((child) => renderElement(spec, child, scope, path))

  let children: Html[]
  if (element.repeat) {
    const statePath = resolveRepeatStatePath(element.repeat.statePath, ctx.repeatBasePath)
    const items = statePath ? getByPath(ctx.stateModel, statePath) : undefined
    children = (Array.isArray(items) ? items : []).flatMap((item, index) =>
      renderChildren({
        ...ctx,
        repeatItem: item,
        repeatIndex: index,
        repeatBasePath: resolveRepeatItemStatePath(statePath!, index)
      })
    )
  } else {
    children = renderChildren(ctx)
  }
  const html = component(props, children).html
  if (!live) return [raw(html)]
  // Tag the component's root element so the runtime can find it.
  const mark = ` data-jr-key="${escapeHtml(key)}"${visible ? "" : " hidden"}`
  return [raw(html.replace(/^<[\w-]+/, (tag) => tag + mark))] // function replacer: keys may contain "$'"
}

function propsOf(element: Spec["elements"][string], ctx: PropResolutionContext): Props {
  // SAFETY: Spec props are JSON (model output or a literal) checked by catalog.validate, and resolving $state/$item yields values from the JSON state model.
  return resolveElementProps(element.props ?? {}, ctx) as Props
}

/** Does this element need the client runtime (state-driven visibility, actions or $bindState)? */
export function needsRuntime(element: Spec["elements"][string]): boolean {
  return (
    element.visible !== undefined ||
    element.on !== undefined ||
    JSON.stringify(element.props ?? {}).includes('"$bindState"')
  )
}

export function specToHtml(spec: Spec, state: NonNullable<Spec["state"]> = spec.state ?? {}): string {
  return renderElement(spec, spec.root, { stateModel: state }, new Set())
    .map((node) => node.html)
    .join("")
}

/** Full static document: content is in the HTML (SEO, first paint); the CDN loader upgrades ui-* tags. */
export function specToPage(spec: Spec, options: { title: string; assetsBase: string }): string {
  const base = options.assetsBase.replace(/\/?$/, "/")
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(options.title)}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" />
    <link rel="stylesheet" href="${escapeHtml(base)}theme.css" />
    <script type="module" src="${escapeHtml(base)}loader.js"></script>
    <style>body{margin:0;background:var(--ds-paper);color:var(--ds-ink);font-family:var(--ds-font)}main{max-width:72rem;margin:0 auto;padding:2rem 1.25rem 4rem}</style>
  </head>
  <body>
    <main>${specToHtml(spec)}</main>${
      Object.values(spec.elements).some(needsRuntime)
        ? `\n    <script type="application/json" id="json-render-spec">${JSON.stringify(spec).replace(/</g, "\\u003c")}</script>`
        : ""
    }
  </body>
</html>
`
}
