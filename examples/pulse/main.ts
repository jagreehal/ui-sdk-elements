import "../../src/theme.css"
import "./style.css"
import { getLoadedEntries, onEntriesLoaded } from "../../src/loader.ts"
import { registerShortcut, toast } from "@ui-sdk/web"
import { createAgent, registerTools } from "@ui-sdk/web/agent"
import { stepGridHtml } from "../../src/components/step-grid.ts"
import { Engine, TRACKS, type Kit } from "./audio.ts"

type El<T = object> = HTMLElement & T
type Change<T> = { value: T; reason?: string }

const $ = <T = object>(selector: string) => document.querySelector<El<T>>(selector)!

/** ui-sdk reports changes (valuechange, pressedchange, action) as a CustomEvent whose detail holds the value. */
function onChange<T>(target: HTMLElement, type: string, listener: (change: Change<T>) => void) {
  target.addEventListener(type, (event) => {
    if (event instanceof CustomEvent) listener(event.detail)
  })
}
const STEPS = 16
const PRESETS: string[][] = [
  [
    "x...x...x...x...",
    "....x.......x...",
    "............x..x",
    "..x...x...x...x.",
    ".......x.......x",
    "x..x..x...x.x..."
  ],
  [
    "x..x..x...x..x..",
    "....x.......x...",
    "....x..x....x...",
    "x.xxx.xxx.xxx.x.",
    ".......x........",
    "x.x...x.x..x.x.."
  ],
  [
    "x.........x.....",
    "........x.......",
    "........x......x",
    "x.x.x.x.x.x.x.x.",
    "......x.......x.",
    "x...x..x..x...x."
  ],
  [
    "x.......x.......",
    "................",
    "................",
    "....x.......x...",
    "................",
    "x......x....x..."
  ]
]

const engine = new Engine()
const patterns: string[][] = PRESETS.map(toCells)
let current = 0
let on = new Set(patterns[0])

function toCells(rows: string[]) {
  return rows.flatMap((row, r) => [...row].flatMap((c, col) => (c === "x" ? [`${r}:${col}`] : [])))
}

/* —— Markup the loader upgrades —— */

const grid = $<{ value: string[]; tracks: string[]; playhead: number }>("#grid")
grid.innerHTML = stepGridHtml(TRACKS, STEPS)
$(".ruler").innerHTML = Array.from(
  { length: STEPS },
  (_, i) => `<li${i % 4 ? "" : ' class="beat"'}>${i + 1}</li>`
).join("")

const slider = (id: string, label: string, min: number, max: number, value: number, vertical = false) => `
  <ui-slider id="${id}" aria-label="${label}" class="dial${vertical ? " fader" : ""}" min="${min}" max="${max}" default-value="${value}"${vertical ? ' orientation="vertical"' : ""}>
    <span class="dial-label" aria-hidden="true">${vertical ? label.replace(/ level$/, "") : label}</span>
    <ui-slider-value></ui-slider-value>
    <ui-slider-control><ui-slider-track><ui-slider-indicator></ui-slider-indicator><ui-slider-thumb aria-label="${label}"></ui-slider-thumb></ui-slider-track></ui-slider-control>
  </ui-slider>`

$("#mixer").innerHTML = TRACKS.map(
  (track, row) => `
  <div class="strip">
    ${slider(`level-${row}`, `${track} level`, 0, 100, Math.round(engine.voices[row]!.level * 100), true)}
    <ui-toggle class="mute" data-row="${row}"><button aria-label="Mute ${track}">M</button></ui-toggle>
  </div>`
).join("")

$("#voice").innerHTML =
  "<ui-segmented-control-indicator></ui-segmented-control-indicator>" +
  TRACKS.map((track, row) => `<ui-segmented-control-item value="${row}">${track}</ui-segmented-control-item>`).join("")
$("#voice-knobs").innerHTML = [
  slider("pitch", "Pitch", -12, 12, 0),
  slider("decay", "Decay", 30, 200, 100),
  slider("send", "Echo send", 0, 100, 35)
].join("")

/* —— State: patterns, tempo and kit live in the URL, so a link is the beat —— */

const hex = (cells: string[]) =>
  TRACKS.map((_, row) => {
    let bits = 0
    for (let col = 0; col < STEPS; col++) if (cells.includes(`${row}:${col}`)) bits |= 1 << col
    return bits.toString(16).padStart(4, "0")
  }).join("")

const unhex = (text: string) =>
  TRACKS.flatMap((_, row) => {
    const bits = parseInt(text.slice(row * 4, row * 4 + 4), 16) || 0
    return Array.from({ length: STEPS }, (_, col) => col).flatMap((col) => (bits & (1 << col) ? [`${row}:${col}`] : []))
  })

let saveTimer: ReturnType<typeof setTimeout> | undefined
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const params = new URLSearchParams({
      t: String(engine.bpm),
      s: String(Math.round(engine.swing * 100)),
      k: engine.kit,
      p: patterns.map(hex).join(".")
    })
    history.replaceState(null, "", `#${params}`)
  }, 150)
}

function load() {
  const params = new URLSearchParams(location.hash.slice(1))
  const p = params.get("p")?.split(".")
  if (p?.length === 4 && p.every((text) => /^[0-9a-f]{24}$/.test(text)))
    p.forEach((text, i) => (patterns[i] = unhex(text)))
  const bpm = Number(params.get("t"))
  if (bpm >= 60 && bpm <= 180) engine.bpm = bpm
  const swing = Number(params.get("s") ?? NaN)
  if (swing >= 0 && swing <= 60) engine.swing = swing / 100
  const kit = params.get("k")
  if (kit === "analog" || kit === "crisp" || kit === "dust") engine.kit = kit
}

/* —— Wiring —— */

function showPattern(index: number) {
  current = index
  on = new Set(patterns[index])
  grid.value = patterns[index]!
  const control = $<{ value: string }>("#pattern")
  if (control.value !== String(index)) control.value = String(index)
}

function setCells(cells: string[]) {
  patterns[current] = cells
  on = new Set(cells)
  grid.value = cells
  save()
}

function setPlaying(playing: boolean) {
  const toggle = $<{ pressed: boolean }>("#play")
  if (toggle.pressed !== playing) toggle.pressed = playing
  if (playing) {
    void engine.start()
    // An agent can press Play before the person has used the page, and the browser holds the sound until they do.
    setTimeout(() => {
      if (engine.playing || !toggle.pressed) return
      setPlaying(false)
      toast("Press Play to hear it", { description: "Your browser starts sound once you have used the page." })
    }, 500)
  } else {
    engine.stop()
    queue.length = 0
    grid.playhead = -1
  }
}

function randomize() {
  const chance = (row: number, col: number) =>
    [
      col % 4 === 0 ? 0.85 : 0.1,
      col === 4 || col === 12 ? 0.95 : 0.05,
      col === 12 ? 0.45 : 0.08,
      col % 2 === 0 ? 0.75 : 0.25,
      col % 8 >= 6 ? 0.35 : 0.03,
      0.32
    ][row]!
  setCells(
    TRACKS.flatMap((_, row) =>
      Array.from({ length: STEPS }, (_, col) => col).flatMap((col) =>
        Math.random() < chance(row, col) ? [`${row}:${col}`] : []
      )
    )
  )
  toast(`Pattern ${"ABCD"[current]} randomized`, { description: "Press R again, or shape it by hand." })
}

engine.isOn = (row, step) => on.has(`${row}:${step}`)

const queue: { step: number; time: number }[] = []
engine.onStep = (step, time) => queue.push({ step, time })

async function boot() {
  load()
  await Promise.all(
    ["ui-step-grid", "ui-toggle", "ui-slider", "ui-segmented-control", "ui-menu"].map((tag) =>
      customElements.whenDefined(tag)
    )
  )

  grid.tracks = [...TRACKS]
  showPattern(0)
  onChange<string[]>(grid, "valuechange", ({ value, reason }) => {
    const added = value.find((cell) => !on.has(cell))
    setCells(value)
    if (added && !engine.playing && reason !== "imperative") engine.audition(Number(added.split(":")[0]))
  })

  onChange<boolean>($("#play"), "pressedchange", ({ value }) => setPlaying(value))
  onChange<string>($("#pattern"), "valuechange", ({ value }) => showPattern(Number(value)))

  const tempo = $<{ value: number }>("#tempo")
  tempo.value = engine.bpm
  onChange<number>(tempo, "valuechange", ({ value }) => {
    engine.bpm = value
    engine.applySpace()
    save()
  })
  const swing = $<{ value: number }>("#swing")
  swing.value = Math.round(engine.swing * 100)
  onChange<number>(swing, "valuechange", ({ value }) => {
    engine.swing = value / 100
    save()
  })

  TRACKS.forEach((_, row) => {
    onChange<number>($(`#level-${row}`), "valuechange", ({ value }) => {
      engine.voices[row]!.level = value / 100
    })
  })
  for (const mute of document.querySelectorAll<El>(".mute")) {
    onChange<boolean>(mute, "pressedchange", ({ value }) => {
      engine.voices[Number(mute.dataset.row)]!.muted = value
    })
  }

  let voice = 5
  const knobs = {
    pitch: $<{ value: number }>("#pitch"),
    decay: $<{ value: number }>("#decay"),
    send: $<{ value: number }>("#send")
  }
  const showVoice = () => {
    const v = engine.voices[voice]!
    knobs.pitch.value = v.pitch
    knobs.decay.value = Math.round(v.decay * 100)
    knobs.send.value = Math.round(v.send * 100)
  }
  onChange<string>($("#voice"), "valuechange", ({ value }) => {
    voice = Number(value)
    showVoice()
  })
  onChange<number>(knobs.pitch, "valuechange", ({ value }) => (engine.voices[voice]!.pitch = value))
  onChange<number>(knobs.decay, "valuechange", ({ value }) => (engine.voices[voice]!.decay = value / 100))
  onChange<number>(knobs.send, "valuechange", ({ value }) => (engine.voices[voice]!.send = value / 100))
  showVoice()

  onChange<string>($("#echo"), "valuechange", ({ value }) => {
    engine.delayDivision = Number(value)
    engine.applySpace()
  })
  onChange<number>($("#feedback"), "valuechange", ({ value }) => {
    engine.feedback = value / 100
    engine.applySpace()
  })

  const kit = $<{ value: string }>("#kit")
  kit.value = engine.kit
  onChange<Kit>(kit, "valuechange", ({ value }) => {
    engine.kit = value
    engine.applyKit()
    save()
    toast(`${engine.kit[0]!.toUpperCase()}${engine.kit.slice(1)} kit`)
  })

  onChange<string>($("#pattern-menu"), "action", async ({ value: action }) => {
    if (action === "randomize") randomize()
    if (action === "clear") {
      setCells([])
      toast(`Pattern ${"ABCD"[current]} cleared`)
    }
    if (action === "copy-next") {
      const next = (current + 1) % 4
      patterns[next] = [...patterns[current]!]
      save()
      toast(`Copied ${"ABCD"[current]} to ${"ABCD"[next]}`)
    }
    if (action === "share") {
      save()
      await new Promise((resolve) => setTimeout(resolve, 160))
      await navigator.clipboard?.writeText(location.href).catch(() => {})
      toast("Share link copied", { description: "The link holds all four patterns, tempo, swing and kit." })
    }
  })

  registerShortcut("p", () => setPlaying(!engine.playing), { description: "Play or stop" })
  registerShortcut("r", randomize, { description: "Randomize the pattern" })
  for (const n of [1, 2, 3, 4])
    registerShortcut(String(n), () => showPattern(n - 1), { description: `Pattern ${"ABCD"[n - 1]}` })

  requestAnimationFrame(frame)
  save()

  // Offered once the grid knows its tracks, so an agent's first step can name them.
  const agent = createAgent({ allow: (step) => (step.confirm ? window.confirm(step.confirm) : true) })
  registerTools(agent, { allow: () => true })
  Object.assign(window, { pulse: { agent, engine, setPlaying } })
}

/* —— Playhead, scope and level, drawn from the audio clock —— */

const canvas = document.querySelector<HTMLCanvasElement>("#scope")!
const pen = canvas.getContext("2d")!
const level = $<{ value: number }>("#level")
const calm = matchMedia("(prefers-reduced-motion: reduce)")
let wave: Float32Array<ArrayBuffer> | undefined
let bins: Uint8Array<ArrayBuffer> | undefined
let lastLevel = 0
let lastDraw = 0

function frame(now: number) {
  requestAnimationFrame(frame)
  const ctx = engine.context
  if (ctx) {
    while (queue.length && queue[0]!.time <= ctx.currentTime) grid.playhead = queue.shift()!.step
  }
  if (calm.matches && now - lastDraw < 160) return
  lastDraw = now
  draw(now)
}

function draw(now: number) {
  const ratio = devicePixelRatio || 1
  const { clientWidth: w, clientHeight: h } = canvas
  if (canvas.width !== Math.round(w * ratio)) {
    canvas.width = Math.round(w * ratio)
    canvas.height = Math.round(h * ratio)
  }
  pen.setTransform(ratio, 0, 0, ratio, 0, 0)
  pen.clearRect(0, 0, w, h)
  const style = getComputedStyle(canvas)
  const accent = style.getPropertyValue("--ds-accent").trim()
  const ink = style.getPropertyValue("--ds-ink-soft").trim()

  const analyser = engine.context && engine.analyser
  if (!analyser) {
    pen.strokeStyle = ink
    pen.globalAlpha = 0.5
    pen.beginPath()
    pen.moveTo(0, h / 2)
    pen.lineTo(w, h / 2)
    pen.stroke()
    pen.globalAlpha = 1
    return
  }
  wave ??= new Float32Array(analyser.fftSize)
  bins ??= new Uint8Array(analyser.frequencyBinCount)
  analyser.getFloatTimeDomainData(wave)
  analyser.getByteFrequencyData(bins)

  const bars = 48
  const barWidth = w / bars
  pen.fillStyle = accent
  for (let i = 0; i < bars; i++) {
    const bin = Math.floor((Math.pow(i / bars, 2) * bins.length) / 2)
    const v = bins[bin]! / 255
    pen.globalAlpha = 0.12 + v * 0.35
    pen.fillRect(i * barWidth + 1, h - v * h * 0.9, barWidth - 2, v * h * 0.9)
  }
  pen.globalAlpha = 1

  let sum = 0
  pen.strokeStyle = accent
  pen.lineWidth = 2
  pen.beginPath()
  for (let i = 0; i < wave.length; i++) {
    const x = (i / (wave.length - 1)) * w
    const y = h / 2 - wave[i]! * h * 0.42
    if (i) pen.lineTo(x, y)
    else pen.moveTo(x, y)
    sum += wave[i]! * wave[i]!
  }
  pen.stroke()

  if (now - lastLevel > 100) {
    lastLevel = now
    const db = 20 * Math.log10(Math.sqrt(sum / wave.length) || 1e-6)
    level.value = Math.max(0, Math.min(100, Math.round(((db + 42) / 42) * 100)))
  }
}

/* —— Agents: the same components, by name, through ui-sdk's bridge —— */

const loadedOut = $("#loaded")
onEntriesLoaded((entries) => (loadedOut.textContent = `Entries loaded: ${entries.join(", ")}`))
loadedOut.textContent = `Entries loaded: ${getLoadedEntries().join(", ")}`

void boot()
