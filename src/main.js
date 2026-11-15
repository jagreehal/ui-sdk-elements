import "./styles.css"

import "ui-sdk-elements/accordion"
import "ui-sdk-elements/checkbox"
import "ui-sdk-elements/dialog"
import "ui-sdk-elements/field"
import "ui-sdk-elements/input"
import "ui-sdk-elements/menu"
import "ui-sdk-elements/popover"
import "ui-sdk-elements/select"
import "ui-sdk-elements/slider"
import "ui-sdk-elements/switch"
import "ui-sdk-elements/tabs"
import "ui-sdk-elements/toggle"
import "ui-sdk-elements/tooltip"

const log = document.querySelector("#event-log")

function note(message) {
  if (!log) return
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
  const line = document.createElement("p")
  line.className = "font-mono text-xs text-ink-soft"
  line.textContent = `${time}  ${message}`
  log.prepend(line)
  while (log.children.length > 6) log.lastElementChild?.remove()
}

document.querySelector("#formatting")?.addEventListener(
  "pressedchange",
  (event) => {
    if (!(event instanceof CustomEvent) || !(event.target instanceof HTMLElement)) return
    note(`Toggle “${event.target.textContent?.trim()}” → ${event.detail.value}`)
  },
  { capture: true }
)

document.querySelector("#notify")?.addEventListener("checkedchange", (event) => {
  if (!(event instanceof CustomEvent)) return
  note(`Notifications → ${event.detail.value ? "on" : "off"}`)
})

document.querySelector("#role")?.addEventListener("valuechange", (event) => {
  if (!(event instanceof CustomEvent)) return
  note(`Role → ${event.detail.value}`)
})

document.querySelector("#file-menu")?.addEventListener("action", (event) => {
  if (!(event instanceof CustomEvent)) return
  note(`Menu → ${event.detail.value}`)
})

document.querySelector("#volume")?.addEventListener("valuechange", (event) => {
  if (!(event instanceof CustomEvent)) return
  note(`Volume → ${event.detail.value}`)
})
