import { story } from "executable-stories-playwright"
import { expect, test } from "./fixtures"

story.feature({
  title: "A generated page: Spec in, accessible interactive HTML out",
  narrative:
    "docs/generated.html is sampleSpec from src/sample-spec.ts run through specToPage. The content is plain HTML (first paint, SEO); " +
    "the CDN loader upgrades only the ui-* tags on the page; runtime.ts wires json-render state, on.press and $bindState to ui-sdk properties.",
  tags: ["catalog", "runtime", "loader"]
})

test("the content is in the HTML before any JavaScript runs", async ({ generatedPageWithoutJs: page }, testInfo) => {
  story.init(testInfo)
  story.given("a browser with JavaScript turned off")
  story.when("it opens the generated page")
  await page.goto()
  story.then("the headline, the three repeated feature cards and the monthly prices are all there")
  await expect(page.headline).toHaveText("Launch on-brand pages in minutes")
  await expect(page.price("Accessible by default")).toBeVisible()
  await expect(page.price("$12 / editor / month")).toBeVisible()
  story.and("the annual prices are in the HTML but hidden until state says so")
  await expect(page.price("$120 / editor / year")).toBeAttached()
  await expect(page.price("$120 / editor / year")).toBeHidden()
  await story.screenshot({ page: page.page, alt: "Generated page with JavaScript off", fullPage: true })
})

test("the loader fetches only the components the page uses", async ({ generatedPage }, testInfo) => {
  story.init(testInfo)
  const chunks = generatedPage.recordEntryChunks()
  story.given("the generated page uses Switch, Accordion and Dialog")
  story.when("it loads")
  await generatedPage.goto()
  await generatedPage.waitForComponents(["ui-switch", "ui-accordion", "ui-dialog"])
  story.then("their entry chunks and the json-render runtime are fetched, nothing else from the catalog")
  await expect.poll(() => [...chunks]).toEqual(expect.arrayContaining(["switch", "accordion", "dialog", "runtime"]))
  story.table({ label: "Entry chunks fetched", columns: ["Chunk"], rows: [...chunks].sort().map((c) => [c]) })
  for (const unused of ["tabs", "slider", "select", "menu", "tooltip", "popover", "toggle"])
    expect(chunks.has(unused), unused).toBe(false)
})

test("the json-render runtime stays small", async ({ generatedPage }, testInfo) => {
  story.init(testInfo)
  story.given("the CDN build swaps zod for an inert stub: the runtime only reads state, it never validates")
  story.when("the generated page loads its runtime")
  const bytes = await generatedPage.runtimeBytes()
  story.kv({ label: "runtime chunk (bytes, uncompressed)", value: bytes })
  story.then("it is under 20 kB (it was 130 kB with zod bundled)")
  expect(bytes).toBeLessThan(20_000)
})

test("a Cta opens a Dialog through state, and closing it writes state back", async ({ generatedPage }, testInfo) => {
  story.init(testInfo)
  story.given('"Book a demo" is a Cta with on.press → setState /demoOpen, and the Dialog binds open to /demoOpen')
  await generatedPage.goto()
  story.when("the Cta is pressed straight away, before the lazy-loaded runtime has arrived")
  await generatedPage.bookDemo()
  story.then(
    "the click is replayed once the runtime hydrates: the dialog opens and focus moves inside it (ui-sdk focus trap)"
  )
  await expect(generatedPage.demoDialog).toBeVisible()
  await expect(generatedPage.dialogDone).toBeFocused()
  await story.screenshot({ page: generatedPage.page, alt: "Book a demo dialog open" })
  story.when("Escape is pressed")
  await generatedPage.dismissDialog()
  story.then("the dialog closes")
  await expect(generatedPage.demoDialog).toBeHidden()
  story.when("the Cta is pressed again")
  await generatedPage.bookDemo()
  story.then("it reopens: the openchange event set /demoOpen back to false, so the second setState is a real change")
  await expect(generatedPage.demoDialog).toBeVisible()
})

test("a bound Switch swaps the visible pricing, by mouse and by keyboard", async ({ generatedPage }, testInfo) => {
  story.init(testInfo)
  story.given("the Switch binds checked to /annual; the two plan grids are visible on /annual = false and = true")
  await generatedPage.goto()
  await expect(generatedPage.price("$12 / editor / month")).toBeVisible()
  story.when("the switch is clicked")
  await generatedPage.toggleAnnualBilling()
  story.then("annual prices show and monthly prices hide")
  await expect(generatedPage.annualBilling).toBeChecked()
  await expect(generatedPage.price("$120 / editor / year")).toBeVisible()
  await expect(generatedPage.price("$12 / editor / month")).toBeHidden()
  await story.screenshot({ page: generatedPage.page, alt: "Annual pricing" })
  story.when("Space is pressed on the focused switch")
  await generatedPage.toggleAnnualBillingWithKeyboard()
  story.then("monthly prices are back")
  await expect(generatedPage.annualBilling).not.toBeChecked()
  await expect(generatedPage.price("$12 / editor / month")).toBeVisible()
})

test("the FAQ accordion is named and works from the keyboard", async ({ generatedPage }, testInfo) => {
  story.init(testInfo)
  story.given('the FAQ, named "Questions", opens on "Who is it for?"')
  await generatedPage.goto()
  await expect(generatedPage.faq).toBeVisible()
  await expect(generatedPage.faqQuestion("Who is it for?")).toHaveAttribute("aria-expanded", "true")
  story.when("the second question is focused and Enter is pressed")
  await generatedPage.openFaqWithKeyboard("Do we need developers?")
  story.then("it expands and its answer is readable")
  await expect(generatedPage.faqQuestion("Do we need developers?")).toHaveAttribute("aria-expanded", "true")
  await expect(generatedPage.price("Only to add components to the design system.")).toBeVisible()
  await story.screenshot({ page: generatedPage.page, alt: "Second FAQ open" })
})
