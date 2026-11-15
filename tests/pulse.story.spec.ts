import { story } from "executable-stories-playwright"
import { expect, test } from "./fixtures"

story.feature({
  title: "Pulse: a groovebox from stock components, one composed component and a brand made of tokens",
  narrative:
    "examples/pulse uses ui-sdk's menubar, toolbar, toggle, slider, segmented control, tabs, meter and toast as they ship, themed by theme.css. " +
    "The step grid is ui-step-grid, a component this package composes from ui-sdk core (createGridFocus + definePrimitive). " +
    "Pulse's look is only --ds-* overrides. Every sound is synthesized with Web Audio.",
  tags: ["examples", "compose", "brand", "agents"]
})

test("it plays: the playhead sweeps the composed grid and the meter reads the output", async ({
  pulsePage
}, testInfo) => {
  story.init(testInfo)
  story.given("Pulse with pattern A")
  await pulsePage.goto()
  await expect(pulsePage.grid.cell("Kick", 1)).toHaveAttribute("aria-selected", "true")
  story.when("Play is pressed")
  await pulsePage.play()
  story.then("the playhead moves across steps on the audio clock")
  await expect(pulsePage.grid.playhead).toBeAttached()
  const first = await pulsePage.grid.playhead.getAttribute("col")
  await expect.poll(() => pulsePage.grid.playhead.getAttribute("col")).not.toBe(first)
  story.and("the output meter shows signal")
  await expect.poll(async () => Number(await pulsePage.outputLevel.getAttribute("aria-valuenow"))).toBeGreaterThan(0)
  await story.screenshot({ page: pulsePage.page, alt: "Pulse playing pattern A" })
})

test("the step grid is one tab stop: arrows move, Space toggles, and the URL keeps the beat", async ({
  pulsePage,
  page
}, testInfo) => {
  story.init(testInfo)
  story.given("pattern D, where Kick step 2 is off")
  await pulsePage.goto()
  await pulsePage.choosePattern("D")
  await expect(pulsePage.grid.cell("Kick", 2)).toHaveAttribute("aria-selected", "false")
  story.when("Kick step 1 is focused, then Right arrow and Space")
  await pulsePage.grid.focusCell("Kick", 1)
  await page.keyboard.press("ArrowRight")
  await expect(pulsePage.grid.cell("Kick", 2)).toBeFocused()
  await page.keyboard.press("Space")
  story.then("step 2 turns on, as a selected grid cell")
  await expect(pulsePage.grid.cell("Kick", 2)).toHaveAttribute("aria-selected", "true")
  story.and("Down arrow moves to the Snare row in the same column")
  await page.keyboard.press("ArrowDown")
  await expect(pulsePage.grid.cell("Snare", 2)).toBeFocused()
  story.and("the share link now encodes it: Kick in pattern D goes from 0101 (steps 1 and 9) to 0103")
  await expect.poll(() => pulsePage.linkedTrack("D", 0)).toBe("0103")
  story.when("the page is reloaded from its URL")
  await pulsePage.reload()
  await pulsePage.choosePattern("D")
  story.then("the beat is still there: the link is the beat")
  await expect(pulsePage.grid.cell("Kick", 2)).toHaveAttribute("aria-selected", "true")
})

test("an agent programs a beat by name, through the same components", async ({ pulsePage }, testInfo) => {
  story.init(testInfo)
  story.given("ui-sdk's agent bridge on the page (createAgent)")
  await pulsePage.goto()
  const snapshot = await pulsePage.agent.snapshot()
  story.then("every control has a name an agent can use")
  expect(snapshot.filter((entry) => !entry.label)).toEqual([])
  story.table({
    label: "What the agent sees",
    columns: ["Component", "Label"],
    rows: snapshot.map((e) => [e.component, e.label ?? ""])
  })
  story.when('it sets the Kick track to "x.x.x.x.x.x.x.x." and the tempo to 128')
  const result = await pulsePage.agent.act([
    { ref: "Steps", action: "setTrack", args: ["Kick", "x.x.x.x.x.x.x.x."] },
    { ref: "Tempo", action: "setValue", args: [128] }
  ])
  expect(result.ok, result.error?.message).toBe(true)
  story.then("the grid, the tempo readout and the share link all follow")
  await expect(pulsePage.grid.hits("Kick")).toHaveCount(8)
  await expect(pulsePage.tempoReadout).toHaveText("128")
  await expect.poll(() => pulsePage.shareHash()).toContain("t=128")
  await story.screenshot({ page: pulsePage.page, alt: "Kick programmed by the agent" })
})

test("the brand is tokens only, and the loader fetched just this page's entries", async ({ pulsePage }, testInfo) => {
  story.init(testInfo)
  story.given("Pulse overrides --ds-* tokens and nothing else")
  await pulsePage.goto()
  story.then("the composed grid and the stock toggle both paint with the brand accent")
  await expect.poll(async () => (await pulsePage.paintedAccent()).onCell).toBe("rgb(255, 106, 43)")
  const painted = await pulsePage.paintedAccent()
  story.kv({
    label: "--ds-accent, an on cell, the Play border",
    value: [painted.token, painted.onCell, painted.playBorder]
  })
  expect(painted.playBorder).toBe("rgb(255, 106, 43)")
  story.and("the page loaded the entries its tags use, and none it doesn't")
  await expect(pulsePage.loadedEntries).toContainText("step-grid")
  for (const used of ["slider", "segmented-control", "menubar", "meter"])
    await expect(pulsePage.loadedEntries).toContainText(used)
  story.kv({ label: "Loaded", value: (await pulsePage.loadedEntries.textContent()) ?? "" })
  for (const unused of ["dialog", "select", "color-picker", "accordion"])
    await expect(pulsePage.loadedEntries).not.toContainText(unused)
})
