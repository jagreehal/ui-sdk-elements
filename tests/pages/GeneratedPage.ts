import type { Page } from "@playwright/test"

/** docs/generated.html: sampleSpec from the catalog, rendered by specToPage. */
export class GeneratedPage {
  constructor(readonly page: Page) {}

  get headline() {
    return this.page.getByRole("heading", { level: 1 })
  }

  get bookDemoButton() {
    return this.page.getByRole("button", { name: "Book a demo" })
  }

  get demoDialog() {
    return this.page.getByRole("dialog", { name: "Book a demo" })
  }

  get dialogDone() {
    return this.demoDialog.getByRole("button", { name: "Done" })
  }

  get annualBilling() {
    return this.page.getByRole("switch", { name: "Pay annually (2 months free)" })
  }

  get faq() {
    return this.page.getByLabel("Questions", { exact: true })
  }

  async goto() {
    await this.page.goto("generated.html")
  }

  price(text: string) {
    return this.page.getByText(text)
  }

  faqQuestion(name: string) {
    return this.page.getByRole("button", { name })
  }

  async bookDemo() {
    await this.bookDemoButton.click()
  }

  async dismissDialog() {
    await this.page.keyboard.press("Escape")
  }

  async toggleAnnualBilling() {
    await this.annualBilling.click()
  }

  async toggleAnnualBillingWithKeyboard() {
    await this.annualBilling.press("Space")
  }

  async openFaqWithKeyboard(question: string) {
    await this.faqQuestion(question).focus()
    await this.page.keyboard.press("Enter")
  }

  /** Records which CDN entry chunks the page requests from now on. */
  recordEntryChunks() {
    const chunks = new Set<string>()
    this.page.on("request", (request) => {
      const name = request.url().match(/\/ui\/assets\/([a-z-]+)-[\w-]+\.js$/)?.[1]
      if (name) chunks.add(name)
    })
    return chunks
  }

  async waitForComponents(tags: string[]) {
    await this.page.waitForFunction((list) => list.every((tag) => customElements.get(tag)), tags)
  }

  async runtimeBytes() {
    const response = this.page.waitForResponse(/\/ui\/assets\/runtime-[\w-]+\.js$/)
    await this.goto()
    return (await (await response).body()).length
  }
}
