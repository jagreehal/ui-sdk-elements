import {
  byCell,
  createChange,
  createGridFocus,
  definePrimitive,
  selects,
  type ChangeDetails,
  type GridCell
} from "@ui-sdk/core"
import { createParts } from "@ui-sdk/web"

// A branded component ui-sdk doesn't ship, composed from its core behaviors: one tab stop and arrow keys
// from createGridFocus, changes and agent actions from definePrimitive. Styled by theme.css like the rest.

type Reason = "item-press" | "keyboard" | "imperative"

type StepGridOptions = {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[], details: ChangeDetails<Reason>) => void
  tracks?: string[]
  steps?: number
  playhead?: number
}

type StepGridState = {
  value: string[]
  tracks: string[]
  steps: number
  playhead: number
  active: GridCell | null
}

const cellId = (row: number, col: number) => `${row}:${col}`

const stepGrid = definePrimitive({
  name: "step-grid",
  options: {
    value: "list",
    defaultValue: "list",
    onValueChange: "callback",
    tracks: "list",
    steps: "number",
    playhead: "number"
  },
  controlled: ["value"],
  state: (options: StepGridOptions): StepGridState => ({
    value: options.value ?? options.defaultValue ?? [],
    tracks: options.tracks ?? [],
    steps: options.steps ?? 16,
    playhead: options.playhead ?? -1,
    active: null
  }),
  sync: (options) => {
    const next: Partial<StepGridState> = { playhead: options.playhead ?? -1 }
    if (options.value !== undefined) next.value = options.value
    if (options.tracks !== undefined) next.tracks = options.tracks
    if (options.steps !== undefined) next.steps = options.steps
    return next
  },
  api: (context) => {
    const change = createChange(context)
    const grid = createGridFocus(context, {
      key: "active",
      rows: () => context.store.get().tracks.length,
      cols: () => context.store.get().steps
    })
    const set = (value: string[], reason: Reason, event?: Event) => change("value", value, { reason, event })
    const rowOf = (track: string) => {
      const { tracks } = context.store.get()
      const row = tracks.findIndex((name) => name.toLowerCase() === track.toLowerCase())
      if (row < 0) throw new Error(`No track "${track}". Tracks: ${tracks.join(", ")}`)
      return row
    }
    return {
      grid,
      isOn: (row: number, col: number) => context.store.get().value.includes(cellId(row, col)),
      toggle(row: number, col: number, event?: Event, reason: Reason = "imperative") {
        const id = cellId(row, col)
        const { value } = context.store.get()
        set(value.includes(id) ? value.filter((cell) => cell !== id) : [...value, id], reason, event)
      },
      /** Writes one track from a step string like "x...x...x...x..." (x or 1 is a hit). */
      setTrack(track: string, pattern: string) {
        const row = rowOf(track)
        const { value, steps } = context.store.get()
        const hits = [...pattern.replace(/\s/g, "")]
          .slice(0, steps)
          .flatMap((c, col) => (/[x1*]/i.test(c) ? [cellId(row, col)] : []))
        set([...value.filter((cell) => !cell.startsWith(`${row}:`)), ...hits], "imperative")
      },
      clear: () => set([], "imperative"),
      /** Each track as `Kick: x...x...` in setTrack's format, so an agent reads the pattern the way it writes one. */
      patterns: () => {
        const { value, tracks, steps } = context.store.get()
        return tracks.map((track, row) => {
          const hits = Array.from({ length: steps }, (_, col) => (value.includes(cellId(row, col)) ? "x" : "."))
          return { value: track, label: `${track}: ${hits.join("")}` }
        })
      }
    }
  },
  slots: (slot) => ({
    root: slot({
      role: "grid",
      keys: { none: "Focus stays on a cell, whose keydown handles the keys." },
      attrs: () => ({ "aria-multiselectable": "true" })
    }),
    row: slot<{ row: number }>({
      props: { row: "number" },
      role: "row"
    }),
    header: slot<{ row: number }>({
      props: { row: "number" },
      role: "rowheader"
    }),
    cell: slot<{ row: number; col: number }>({
      props: { row: "number", col: "number" },
      role: "gridcell",
      focus: "roving",
      selects: selects({ active: byCell }),
      keys: [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "mod+Home",
        "mod+End",
        "PageUp",
        "PageDown",
        " ",
        "Enter"
      ],
      attrs: (state, { props, api }) => {
        const on = state.value.includes(cellId(props.row, props.col))
        return {
          tabindex: api.grid.tabIndex(state, props),
          "aria-selected": String(on),
          "aria-label": `${state.tracks[props.row] ?? "Track"} step ${props.col + 1}`,
          "data-on": on ? "" : undefined,
          "data-playhead": state.playhead === props.col ? "" : undefined,
          "data-downbeat": props.col % 4 === 0 ? "" : undefined
        }
      },
      press: ({ api, props }, event) => api.toggle(props.row, props.col, event, "item-press"),
      on: {
        keydown: (event, { api, props }) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault()
            api.toggle(props.row, props.col, event, "keyboard")
            return
          }
          api.grid.keydown(event)
        },
        pointerdown: (event, { api, props }) => api.grid.focus(props, { reason: "item-press", event })
      },
      bind: (el, { api, props }) => api.grid.bind(el, props)
    })
  }),
  agent: { actions: ["toggle", "setTrack", "clear"], items: (api) => api.patterns() }
})

createParts(stepGrid, {
  root: { tag: "ui-step-grid", display: "block", api: ["toggle", "setTrack", "clear", "isOn"] },
  row: { tag: "ui-step-grid-row", display: "block" },
  header: { tag: "ui-step-grid-header", display: "block" },
  cell: { tag: "ui-step-grid-cell", display: "block" }
})

const escape = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

/** The rows and cells a `<ui-step-grid>` needs, one row per track: `grid.innerHTML = stepGridHtml(tracks, 16)`. */
function stepGridHtml(tracks: readonly string[], steps = 16) {
  return tracks
    .map(
      (track, row) =>
        `<ui-step-grid-row row="${row}"><ui-step-grid-header row="${row}">${escape(track)}</ui-step-grid-header>${Array.from(
          { length: steps },
          (_, col) => `<ui-step-grid-cell row="${row}" col="${col}"></ui-step-grid-cell>`
        ).join("")}</ui-step-grid-row>`
    )
    .join("")
}

export { stepGridHtml, type StepGridOptions }
