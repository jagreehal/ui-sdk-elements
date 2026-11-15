import { story } from "executable-stories-playwright"
import { expect, test } from "./fixtures"

story.feature({
  title: "Your own CDN: Acme ships its components with elementsCdn()",
  narrative:
    "examples/acme-cdn is a separate set of entries: stock ui-sdk tags (ui-dialog, ui-toggle, ui-select) and Acme's own acme-badge, " +
    "with Acme's brand tokens on top of this package's theme. elementsCdn() from ui-sdk-elements/vite builds it into loader.js, " +
    "one chunk per tag and theme.css. The page uses those two files and nothing from this package's own CDN.",
  tags: ["cdn", "loader", "brand"]
})

test("a page with two tags from Acme's CDN loads only the components it uses", async ({ acmePage }, testInfo) => {
  story.init(testInfo)
  const files = acmePage.recordCdnFiles()
  story.given("a page that links Acme's theme.css and loader.js, and uses acme-badge, ui-toggle and ui-dialog")
  story.when("it loads")
  await acmePage.goto()
  story.then("those three entries come from Acme's CDN, and ui-select, which the page doesn't use, is never fetched")
  await expect
    .poll(() => [...files])
    .toEqual(expect.arrayContaining(["loader.js", "theme.css", "acme-badge.js", "ui-toggle.js", "ui-dialog.js"]))
  expect(files.has("ui-select.js")).toBe(false)
  story.table({ label: "Fetched from Acme's CDN", columns: ["File"], rows: [...files].sort().map((file) => [file]) })
})

test("Acme's own component and the stock ones wear Acme's brand", async ({ acmePage }, testInfo) => {
  story.init(testInfo)
  story.given("Acme's brand sets --ds-accent to violet #6d28d9 and pill-shaped corners")
  await acmePage.goto()
  story.then("Acme's badge paints with it")
  await expect.poll(() => acmePage.colorOf("badge")).toBe("rgb(109, 40, 217)")
  story.when("the stock ui-sdk toggle is pressed")
  await acmePage.follow()
  await expect(acmePage.followToggle).toHaveAttribute("aria-pressed", "true")
  story.then("it fills with the same accent")
  await expect.poll(() => acmePage.colorOf("toggle")).toBe("rgb(109, 40, 217)")
  story.when("Start trial is pressed")
  await acmePage.startTrial()
  story.then("ui-sdk's dialog opens, from Acme's CDN")
  await expect(acmePage.trialDialog).toBeVisible()
  await story.screenshot({ page: acmePage.page, alt: "Acme's page, using only Acme's CDN" })
})
