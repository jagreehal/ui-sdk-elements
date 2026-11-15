import type { Page } from "@playwright/test"

/** docs/acme: a page that uses only Acme's own CDN, built by elementsCdn(). */
export class AcmePage {
  constructor(readonly page: Page) {}

  get badge() {
    return this.page.locator("acme-badge")
  }

  get followToggle() {
    return this.page.getByRole("button", { name: "Follow" })
  }

  get trialDialog() {
    return this.page.getByRole("dialog", { name: "Start your Acme trial" })
  }

  /** Records which of Acme's CDN files the page fetches, by name without hash. */
  recordCdnFiles() {
    const files = new Set<string>()
    this.page.on("request", (request) => {
      const match = request.url().match(/\/acme\/cdn\/(?:assets\/)?([\w-]+?)(?:-[\w-]{8})?\.(js|css)$/)
      if (match) files.add(`${match[1]}.${match[2]}`)
    })
    return files
  }

  async goto() {
    await this.page.goto("acme/")
    await this.page.waitForFunction(() =>
      ["acme-badge", "ui-toggle", "ui-dialog"].every((tag) => customElements.get(tag))
    )
  }

  async startTrial() {
    await this.page.getByRole("button", { name: "Start trial" }).click()
  }

  async follow() {
    await this.followToggle.click()
  }

  async colorOf(target: "badge" | "toggle") {
    const locator = target === "badge" ? this.badge : this.followToggle
    return locator.evaluate((el) => getComputedStyle(el).backgroundColor)
  }
}
