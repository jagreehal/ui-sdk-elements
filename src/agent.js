import "./theme.css"
import "./loader.ts"
import { catalog, sampleSpec } from "./catalog.ts"
import { getLoadedEntries, onEntriesLoaded } from "./loader.ts"
import { listOllamaModels } from "./ollama.ts"
import { renderSpec } from "./render-spec.ts"
import { specToPage } from "./spec-html.ts"

const brief = document.querySelector("#brief")
const modelInput = document.querySelector("#model")
const modelList = document.querySelector("#model-list")
const status = document.querySelector("#status")
const loadedOut = document.querySelector("#loaded")
const specEditor = document.querySelector("#spec")
const preview = document.querySelector("#preview")
const generateBtn = document.querySelector("#generate")
const renderBtn = document.querySelector("#render")
const promptBtn = document.querySelector("#show-prompt")
const promptOut = document.querySelector("#prompt-out")
const staticBtn = document.querySelector("#open-static")

const DEFAULT_BRIEF =
  "Landing page for Fieldnote, a note-taking app for field researchers: hero with signup CTA, three feature cards, two customer quotes, an FAQ, and a 'Book a demo' dialog."

function setStatus(message, tone = "muted") {
  status.textContent = message
  status.dataset.tone = tone
}

function showLoaded(needed = []) {
  if (!loadedOut) return
  const loaded = getLoadedEntries()
  loadedOut.textContent =
    needed.length > 0
      ? `This page needed [${needed.join(", ")}] · loaded so far [${loaded.join(", ") || "none"}]`
      : `Loaded entry modules: [${loaded.join(", ") || "none"}]`
}

async function paint(spec) {
  setStatus("Injecting ui-* markup; loader fetching only what’s needed…")
  const result = await renderSpec(spec, preview)
  showLoaded(result.needed)
  setStatus(`Rendered. Dynamically loaded: ${result.needed.join(", ") || "none"}.`, "ok")
}

/** Accepts pasted model output too: falls back to the outermost {...}. */
function readSpecFromEditor() {
  const raw = specEditor.value
  try {
    return JSON.parse(raw)
  } catch {
    const start = raw.indexOf("{")
    const end = raw.lastIndexOf("}")
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1))
    throw new Error("Spec is not valid JSON")
  }
}

function setSuggestions(ids) {
  modelList.replaceChildren()
  for (const id of ids) {
    const option = document.createElement("option")
    option.value = id
    modelList.append(option)
  }
}

async function boot() {
  onEntriesLoaded(() => showLoaded())
  brief.value = DEFAULT_BRIEF
  specEditor.value = JSON.stringify(sampleSpec, null, 2)
  await paint(sampleSpec)

  try {
    const config = await fetch("/api/config").then((r) => r.json())
    modelInput.value = config.model
    const ollama = await listOllamaModels().catch(() => [])
    setSuggestions([...(config.suggestions || []), ...ollama])
    const keyNote = config.hasOpenCodeKey ? "OPENCODE_API_KEY set" : "OPENCODE_API_KEY missing"
    setStatus(`Ready · default ${config.model} · ${keyNote}`, "ok")
  } catch (error) {
    setStatus(`Config unavailable (${error instanceof Error ? error.message : error}).`, "warn")
  }
}

generateBtn.addEventListener("click", async () => {
  generateBtn.disabled = true
  const model = modelInput.value.trim()
  setStatus(`AI generating Spec with ${model}…`)
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: brief.value.trim() || DEFAULT_BRIEF
      })
    })
    const data = await response.json()
    if (!response.ok) {
      if (data.spec) specEditor.value = JSON.stringify(data.spec, null, 2)
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    specEditor.value = JSON.stringify(data.spec, null, 2)
    await paint(data.spec)
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error")
  } finally {
    generateBtn.disabled = false
  }
})

renderBtn.addEventListener("click", async () => {
  try {
    const parsed = readSpecFromEditor()
    const validated = catalog.validate(parsed)
    if (!validated.success) {
      setStatus(`Invalid Spec: ${validated.error?.message ?? "unknown"}`, "error")
      return
    }
    await paint(validated.data)
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error")
  }
})

promptBtn.addEventListener("click", () => {
  const prompt = catalog.prompt({ mode: "standalone" })
  promptOut.hidden = !promptOut.hidden
  if (!promptOut.hidden) promptOut.textContent = prompt
})

boot()

// Publish preview: the same Spec as a static page (content in the HTML, loader upgrades ui-* tags).
// shortcut: needs `npm run build` for /dist/cdn assets; a real publish step would write this file to a CDN.
staticBtn.addEventListener("click", () => {
  try {
    const spec = readSpecFromEditor()
    const html = specToPage(spec, { title: "Generated page", assetsBase: `${location.origin}/dist/cdn/` })
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }))
    window.open(url, "_blank")
    setTimeout(() => URL.revokeObjectURL(url), 60_000) // give the new tab time to load it
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error")
  }
})
