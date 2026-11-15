import { story } from "executable-stories-playwright"
import { expect, test } from "./fixtures"

story.feature({
  title: "The GitHub Pages site: every demo opens under /ui-sdk-elements/",
  narrative:
    "The stories serve docs/ under the same sub-path GitHub Pages uses, with real 404s. " +
    "Any broken link, missing asset or browser error fails the run, so what passes here works on jagreehal.github.io/ui-sdk-elements/.",
  tags: ["site", "pages"]
})

test("every demo linked from the landing page opens without errors", async ({ landingPage }, testInfo) => {
  story.init(testInfo)
  story.given("the landing page")
  await landingPage.goto()
  // The stories report is written by this very run, so it can't be visited yet; CI publishes it after the run.
  const demos = (await landingPage.demos()).filter(
    (demo) => !new URL(demo.url).pathname.startsWith("/ui-sdk-elements/report/")
  )
  story.note("The Executable stories link is skipped: this run is what writes the report.")
  expect(demos.length).toBeGreaterThanOrEqual(5)
  story.table({
    label: "Demos",
    columns: ["Demo", "Path"],
    rows: demos.map((demo) => [demo.name, new URL(demo.url).pathname])
  })
  story.when("each demo is opened in turn")
  for (const demo of demos) {
    expect(new URL(demo.url).pathname, `${demo.name} stays under the Pages sub-path`).toMatch(/^\/ui-sdk-elements\//)
    await landingPage.open(demo.url)
    await expect(landingPage.mainHeading, demo.name).toBeVisible()
  }
  story.then("every page renders a heading, with no 404s, console errors or page errors along the way")
})
