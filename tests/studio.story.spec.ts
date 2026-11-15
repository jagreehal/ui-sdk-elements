import { story } from "executable-stories-playwright"
import { expect, test } from "./fixtures"

story.feature({
  title: "Brand Studio: one set of tokens re-skins every component and every generated page",
  narrative:
    "examples/studio derives every --ds-* token from four choices (accent, mode, corners, typeface), applies them to a preview, " +
    "and checks WCAG contrast as you go. The preview holds a page the catalog generates (sampleSpec through renderSpec) and a sampler of components, " +
    "including the composed ui-step-grid. The token block it shows is the whole re-brand.",
  tags: ["examples", "brand", "catalog", "agents"]
})

test("picking an accent and dark mode re-skins the generated page", async ({ studioPage }, testInfo) => {
  story.init(testInfo)
  story.given("the studio with the default teal brand, showing the catalog's sample page")
  await studioPage.goto()
  await expect.poll(() => studioPage.backgroundOf("cta")).toBe("rgb(15, 118, 110)")
  await story.screenshot({ page: studioPage.page, alt: "Default brand" })
  story.when("the rose preset is picked and Mode is set to Dark")
  await studioPage.pickPreset("#e11d48")
  await studioPage.setMode("Dark")
  story.then("the generated page's call to action and background follow the tokens")
  await expect.poll(() => studioPage.backgroundOf("cta")).toBe("rgb(225, 29, 72)")
  await expect.poll(() => studioPage.previewDarkness()).toBeLessThan(120)
  await story.screenshot({ page: studioPage.page, alt: "Rose, dark" })
})

test("contrast is checked as you go, and text on the accent picks the side that reads", async ({
  studioPage
}, testInfo) => {
  story.init(testInfo)
  story.given("light mode")
  await studioPage.goto()
  story.when("a pale yellow accent is typed into the hex field")
  await studioPage.typeAccent("#facc15")
  story.then("the yellow is flagged for controls on a light page")
  await expect(studioPage.contrastCheck("Accent on page")).toHaveAttribute("data-pass", "false")
  story.and("text on the accent switches to dark ink, so it still passes")
  await expect(studioPage.contrastCheck("Text on accent")).toHaveAttribute("data-pass", "true")
  await expect(studioPage.tokens).toContainText("--ds-on-accent: #0b0c0d;")
  story.table({ label: "Contrast", columns: ["Pair", "Ratio", "Verdict"], rows: await studioPage.contrastTable() })
})

test("a link reproduces a brand, and the token block is the whole re-brand", async ({ studioPage }, testInfo) => {
  story.init(testInfo)
  story.given("a studio link with violet, dark, 14px corners and Fraunces")
  await studioPage.goto("#a=7c3aed&m=dark&r=14&f=serif")
  story.then("the token block matches the link")
  for (const line of ["--ds-accent: #7c3aed;", "--ds-radius: 14px;", "Fraunces", "color-scheme: dark;"])
    await expect(studioPage.tokens).toContainText(line)
  story.code({ label: "Tokens", content: (await studioPage.tokens.textContent()) ?? "", lang: "css" })
  story.when("Copy CSS is pressed")
  await studioPage.copyTokens()
  story.then("a toast confirms it")
  await expect(studioPage.copied).toBeVisible()
  story.and("the composed step grid in the sampler wears the same brand")
  await studioPage.showComponents()
  await expect(studioPage.miniGrid.hits("Design")).toHaveCount(2)
  await story.screenshot({ page: studioPage.page, alt: "Violet dark brand on the component sampler" })
})

test("an agent re-brands the system by name", async ({ studioPage }, testInfo) => {
  story.init(testInfo)
  story.given("ui-sdk's agent bridge on the studio")
  await studioPage.goto()
  const snapshot = await studioPage.agent.snapshot()
  expect(snapshot.filter((entry) => !entry.label)).toEqual([])
  story.when('it sets Accent color to #4f46e5, Mode to dark and Typeface to "Plex Mono"')
  const result = await studioPage.agent.act([
    { ref: "Accent color", action: "setValue", args: ["#4f46e5"] },
    { ref: "Mode", action: "setValue", args: ["dark"] },
    { ref: "Typeface", action: "setValue", args: ["Plex Mono"] }
  ])
  expect(result.ok, result.error?.message).toBe(true)
  story.then("the preview, the tokens and the link all follow")
  await expect.poll(() => studioPage.backgroundOf("cta")).toBe("rgb(79, 70, 229)")
  await expect(studioPage.tokens).toContainText("IBM Plex Mono")
  await expect.poll(() => studioPage.shareHash()).toBe("#a=4f46e5&m=dark&r=8&f=mono")
})
