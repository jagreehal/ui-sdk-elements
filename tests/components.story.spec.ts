import { story } from "executable-stories-playwright"
import { expect, test } from "./fixtures"

story.feature({
  title: "Hand-written markup, one script tag",
  narrative:
    "docs/components.html uses every themed component through the CDN loader, with no build step. Every ui-* tag must upgrade.",
  tags: ["loader", "components"]
})

test("every ui-* tag on the components page is upgraded", async ({ showcasePage }, testInfo) => {
  story.init(testInfo)
  story.given("the components showcase, which loads only ui/loader.js")
  await showcasePage.goto()
  await expect(showcasePage.heading).toBeVisible()
  story.then("the loader upgrades every ui-* element on the page")
  await expect.poll(() => showcasePage.undefinedUiTags()).toEqual([])
  await story.screenshot({ page: showcasePage.page, alt: "Components showcase", fullPage: true })
})

test("tabs stay inside a narrow card and wrap, so the selected tab is never clipped", async ({
  showcasePage
}, testInfo) => {
  story.init(testInfo)
  story.given("the Tabs card, narrower than its three tabs")
  await showcasePage.page.setViewportSize({ width: 1180, height: 800 })
  await showcasePage.goto()
  await expect(showcasePage.tab("Account")).toHaveAttribute("aria-selected", "true")
  story.when("End moves selection to the last tab, Billing")
  await showcasePage.moveToLastTab()
  await expect(showcasePage.tab("Billing")).toHaveAttribute("aria-selected", "true")
  story.then("the tab list stays inside the card and Billing is fully visible in it")
  await expect.poll(() => showcasePage.tabOverflow("Billing")).toEqual({ listOutOfCard: 0, tabOutOfList: 0 })
  await story.screenshot({ page: showcasePage.page, alt: "Billing selected in a narrow card" })
})

test("slider thumbs sit on their track", async ({ showcasePage }, testInfo) => {
  story.init(testInfo)
  story.given("the Volume slider; ui-sdk positions the thumb, the theme only sizes and paints it")
  await showcasePage.goto()
  story.then("the thumb's centre is on the track's centre line")
  await expect.poll(() => showcasePage.thumbOffset("Volume")).toBe(0)
})

test("a dialog's actions are spaced from its text", async ({ showcasePage }, testInfo) => {
  story.init(testInfo)
  story.given("the Share link dialog")
  await showcasePage.goto()
  story.when("it opens")
  await showcasePage.openShareDialog()
  await expect(showcasePage.shareDialog).toBeVisible()
  story.then("there is at least 16px between the description and the action")
  await expect.poll(() => showcasePage.dialogActionGap()).toBeGreaterThanOrEqual(16)
  await story.screenshot({ page: showcasePage.page, alt: "Share link dialog" })
})
