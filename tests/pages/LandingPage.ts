import type { Page } from "@playwright/test"

/** docs/index.html: the GitHub Pages landing page. */
export class LandingPage {
  constructor(readonly page: Page) {}

  get demoLinks() {
    return this.page.getByRole("list").getByRole("link")
  }

  async goto() {
    await this.page.goto("./")
  }

  /** Each demo link's name and the absolute URL it resolves to. */
  async demos() {
    return this.demoLinks.evaluateAll((links) =>
      links.map((link) => ({
        name: link.querySelector("strong")?.textContent ?? link.textContent!.trim(),
        url: link instanceof HTMLAnchorElement ? link.href : ""
      }))
    )
  }

  async open(url: string) {
    await this.page.goto(url)
  }

  get mainHeading() {
    return this.page.getByRole("heading").first()
  }
}
