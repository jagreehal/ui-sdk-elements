import type { Page } from "@playwright/test"
import { AgentBridge } from "../components/AgentBridge"
import { StepGrid } from "../components/StepGrid"

/** examples/pulse: the groovebox. */
export class PulsePage {
  constructor(readonly page: Page) {}

  get grid() {
    return new StepGrid(this.page.getByRole("grid", { name: "Steps" }))
  }

  get agent() {
    return new AgentBridge(this.page, "pulse")
  }

  get playButton() {
    return this.page.getByRole("button", { name: "Play" })
  }

  get outputLevel() {
    return this.page.getByRole("meter", { name: "Output", exact: true })
  }

  get tempoReadout() {
    return this.page.getByRole("group", { name: "Tempo" }).locator('[data-slot="slider-value"]')
  }

  get loadedEntries() {
    return this.page.getByText(/^Entries loaded:/)
  }

  async goto(hash = "") {
    await this.page.goto(`examples/pulse/${hash}`)
    // Pulse exposes its agent bridge as boot's last step, after every listener is attached.
    await this.agent.ready()
  }

  async play() {
    await this.playButton.click()
  }

  async choosePattern(letter: "A" | "B" | "C" | "D") {
    await this.page.getByRole("radiogroup", { name: "Active pattern" }).getByRole("radio", { name: letter }).click()
  }

  async reload() {
    await this.page.reload()
    await this.agent.ready()
  }

  shareHash() {
    return this.page.evaluate(() => location.hash)
  }

  /** One track of one pattern as the share link encodes it: 16 steps as 4 hex digits, step 1 in the lowest bit. */
  async linkedTrack(pattern: "A" | "B" | "C" | "D", row: number) {
    const params = new URLSearchParams((await this.shareHash()).slice(1))
    const segment = params.get("p")?.split(".")["ABCD".indexOf(pattern)] ?? ""
    return segment.slice(row * 4, row * 4 + 4)
  }

  /** The brand token and what two components actually paint with it. */
  async paintedAccent() {
    return this.page.evaluate(() => ({
      token: getComputedStyle(document.documentElement).getPropertyValue("--ds-accent").trim(),
      onCell: getComputedStyle(document.querySelector('[role="gridcell"][aria-selected="true"]')!).backgroundColor,
      playBorder: getComputedStyle(document.querySelector("button[aria-pressed]")!).borderColor
    }))
  }
}
