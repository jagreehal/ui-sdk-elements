import type { Page } from "@playwright/test"
import { AgentBridge } from "../components/AgentBridge"
import { StepGrid } from "../components/StepGrid"

/** examples/studio: Brand Studio. */
export class StudioPage {
  constructor(readonly page: Page) {}

  get agent() {
    return new AgentBridge(this.page, "studio")
  }

  get preview() {
    return this.page.getByRole("main")
  }

  get primaryCta() {
    return this.preview.getByRole("link", { name: "Start free" })
  }

  get accentHex() {
    return this.page.getByRole("textbox", { name: "Accent hex" })
  }

  get tokens() {
    return this.page.locator("#tokens")
  }

  get copied() {
    return this.page.getByText("Tokens copied")
  }

  get miniGrid() {
    return new StepGrid(this.page.getByRole("grid", { name: "Release plan" }))
  }

  async goto(hash = "") {
    await this.page.goto(`examples/studio/${hash}`)
    // The studio exposes its agent bridge as boot's last step, after every listener is attached.
    await this.agent.ready()
  }

  async pickPreset(hex: string) {
    await this.page.locator(`ui-color-picker-swatch-item[value="${hex}"]`).click()
  }

  async setMode(mode: "Light" | "Dark") {
    await this.page.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name: mode }).click()
  }

  async typeAccent(hex: string) {
    await this.accentHex.fill(hex)
    await this.accentHex.press("Enter")
  }

  async copyTokens() {
    await this.page.getByRole("button", { name: "Copy CSS" }).click()
  }

  async showComponents() {
    await this.page.getByRole("tab", { name: "Components" }).click()
  }

  contrastCheck(label: string) {
    return this.page.getByRole("listitem").filter({ hasText: label })
  }

  async contrastTable() {
    return this.page
      .locator("#checks li")
      .evaluateAll((items) =>
        items.map((li) => [
          li.children[1]!.textContent!,
          li.querySelector("strong")!.textContent!,
          li.querySelector(".verdict")!.textContent!
        ])
      )
  }

  backgroundOf(locator: "cta" | "preview") {
    const target = locator === "cta" ? this.primaryCta : this.preview
    return target.evaluate((el) => getComputedStyle(el).backgroundColor)
  }

  /** Sum of the preview background's RGB channels: under ~120 reads as a dark page. */
  async previewDarkness() {
    const rgb = (await this.backgroundOf("preview")).match(/\d+/g)!.slice(0, 3).map(Number)
    return rgb.reduce((a, b) => a + b, 0)
  }

  shareHash() {
    return this.page.evaluate(() => location.hash)
  }
}
