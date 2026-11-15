import "../../src/theme.css"
import "./style.css"
import "../../src/loader.ts"
import { toast } from "@ui-sdk/web"
import { createAgent, registerTools } from "@ui-sdk/web/agent"
import { sampleSpec } from "../../src/sample-spec.ts"
import { renderSpec } from "../../src/render-spec.ts"
import { stepGridHtml } from "../../src/components/step-grid.ts"
import { brandTokens, contrast, type Brand } from "./tokens.ts"

const $ = <T = object>(selector: string) => document.querySelector<HTMLElement & T>(selector)!

/** ui-sdk reports a change as a CustomEvent whose detail holds the new value. */
function onChange<T>(target: HTMLElement, listener: (value: T) => void) {
  target.addEventListener("valuechange", (event) => {
    if (event instanceof CustomEvent) listener(event.detail.value)
  })
}

const FONTS = {
  sora: '"Sora", ui-sans-serif, system-ui, sans-serif',
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: '"Fraunces", ui-serif, Georgia, serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace'
} satisfies Record<Brand["font"], string>

const isFont = (name: string): name is Brand["font"] => name in FONTS

const brand: Brand = { accent: "#0f766e", mode: "light", radius: 8, font: "sora" }

function readHash() {
  const params = new URLSearchParams(location.hash.slice(1))
  const accent = params.get("a")
  if (accent && /^[0-9a-f]{6}$/i.test(accent)) brand.accent = `#${accent.toLowerCase()}`
  if (params.get("m") === "dark") brand.mode = "dark"
  const radius = Number(params.get("r") ?? NaN)
  if (radius >= 0 && radius <= 20) brand.radius = radius
  const font = params.get("f")
  if (font && isFont(font)) brand.font = font
}

function apply() {
  const tokens = { ...brandTokens(brand), "--ds-font": FONTS[brand.font] }
  const preview = $("#preview")
  for (const [name, value] of Object.entries(tokens)) preview.style.setProperty(name, value)
  preview.style.colorScheme = brand.mode

  $("#tokens").textContent = `:root {\n${Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n")}\n  color-scheme: ${brand.mode};\n}`

  const checks: [string, string, string, number][] = [
    ["Text on page", tokens["--ds-ink"], tokens["--ds-paper"], 4.5],
    ["Muted text on page", tokens["--ds-ink-soft"], tokens["--ds-paper"], 4.5],
    ["Text on accent", tokens["--ds-on-accent"], tokens["--ds-accent"], 4.5],
    ["Accent on page (controls)", tokens["--ds-accent"], tokens["--ds-paper"], 3]
  ]
  $("#checks").innerHTML = checks
    .map(([label, fg, bg, need]) => {
      const ratio = contrast(fg, bg)
      const pass = ratio >= need
      return `<li data-pass="${pass}"><span class="chip" style="background:${bg};color:${fg}">Aa</span><span>${label}</span><strong>${ratio.toFixed(1)}:1</strong><span class="verdict">${pass ? "Pass" : `Needs ${need}:1`}</span></li>`
    })
    .join("")

  history.replaceState(
    null,
    "",
    `#${new URLSearchParams({ a: brand.accent.slice(1), m: brand.mode, r: String(brand.radius), f: brand.font })}`
  )
}

async function boot() {
  readHash()
  apply()
  await renderSpec(sampleSpec, $("#page"))
  await Promise.all(
    ["ui-color-picker", "ui-segmented-control", "ui-slider", "ui-select", "ui-step-grid"].map((tag) =>
      customElements.whenDefined(tag)
    )
  )

  const accent = $<{ value: string }>("#accent")
  const mode = $<{ value: string }>("#mode")
  const radius = $<{ value: number }>("#radius")
  const font = $<{ value: string }>("#font")
  accent.value = brand.accent
  mode.value = brand.mode
  radius.value = brand.radius
  font.value = brand.font

  onChange<string>(accent, (value) => {
    brand.accent = value
    apply()
  })
  onChange<Brand["mode"]>(mode, (value) => {
    brand.mode = value
    apply()
  })
  onChange<number>(radius, (value) => {
    brand.radius = value
    apply()
  })
  onChange<Brand["font"]>(font, (value) => {
    brand.font = value
    apply()
  })

  $("#copy").addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("#tokens").textContent ?? "").catch(() => {})
    toast("Tokens copied", { description: "Paste them after theme.css. No component CSS changes." })
  })

  const grid = $<{ tracks: string[]; value: string[] }>("#mini-grid")
  const tracks = ["Design", "Build", "Review", "Launch"]
  grid.innerHTML = stepGridHtml(tracks, 8)
  grid.tracks = tracks
  grid.value = ["0:0", "0:1", "1:2", "1:3", "1:4", "2:5", "3:6", "3:7"]
  onChange<string[]>(grid, (value) => (grid.value = value))

  const agent = createAgent({ allow: (step) => (step.confirm ? window.confirm(step.confirm) : true) })
  registerTools(agent, { allow: () => true })
  Object.assign(window, { studio: { agent, brand } })
}

void boot()
