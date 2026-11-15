import { test as base, expect, type Page } from "@playwright/test"
import { WebMcp, installWebMcpDouble } from "./components/WebMcp"
import { AcmePage } from "./pages/AcmePage"
import { GeneratedPage } from "./pages/GeneratedPage"
import { LandingPage } from "./pages/LandingPage"
import { PulsePage } from "./pages/PulsePage"
import { ShowcasePage } from "./pages/ShowcasePage"
import { StudioPage } from "./pages/StudioPage"

type Options = {
  /** Install the WebMCP double, so `registerTools` has a `document.modelContext` to register with. */
  webmcp: boolean
  /** One narrow regex for browser errors a test expects; everything else fails the test. */
  allowedErrors: RegExp | undefined
}

type Fixtures = {
  browserErrors: void
  landingPage: LandingPage
  acmePage: AcmePage
  generatedPage: GeneratedPage
  generatedPageWithoutJs: GeneratedPage
  showcasePage: ShowcasePage
  pulsePage: PulsePage
  studioPage: StudioPage
  webMcp: WebMcp
}

// Runs need no network: fonts are cosmetic, and the tests must not depend on Google's CDN.
const stubFonts = (page: Page) =>
  page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ contentType: "text/css", body: "" }))

export const test = base.extend<Options & Fixtures>({
  webmcp: [false, { option: true }],
  allowedErrors: [undefined, { option: true }],

  page: async ({ page, webmcp }, use) => {
    await stubFonts(page)
    if (webmcp) await installWebMcpDouble(page)
    await use(page)
  },

  // Fails any story whose page logs an error, throws, or gets a 4xx/5xx from the site itself (a broken link or asset on Pages).
  browserErrors: [
    async ({ page, allowedErrors, baseURL }, use) => {
      const errors: string[] = []
      const origin = new URL(baseURL!).origin
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`console.error: ${message.text()}`)
      })
      page.on("response", (response) => {
        if (response.url().startsWith(origin) && response.status() >= 400)
          errors.push(`${response.status()}: ${response.url()}`)
      })
      await use()
      expect(
        errors.filter((error) => !allowedErrors?.test(error)),
        "unexpected browser errors"
      ).toEqual([])
    },
    { auto: true }
  ],

  landingPage: async ({ page }, use) => use(new LandingPage(page)),
  acmePage: async ({ page }, use) => use(new AcmePage(page)),
  generatedPage: async ({ page }, use) => use(new GeneratedPage(page)),
  generatedPageWithoutJs: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await context.newPage()
    await stubFonts(page)
    await use(new GeneratedPage(page))
    await context.close()
  },
  showcasePage: async ({ page }, use) => use(new ShowcasePage(page)),
  pulsePage: async ({ page }, use) => use(new PulsePage(page)),
  studioPage: async ({ page }, use) => use(new StudioPage(page)),
  webMcp: async ({ page }, use) => use(new WebMcp(page))
})

export { expect }
