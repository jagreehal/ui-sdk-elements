import { story } from "executable-stories-playwright"
import { expect, test } from "./fixtures"

story.feature({
  title: "WebMCP: a browser's own agent drives the examples through ui-sdk's tools",
  narrative:
    "Both examples call registerTools(agent), which registers snapshot, query and act on document.modelContext. " +
    "Bundled Chromium has no WebMCP, so this lane installs a double that behaves like Chrome's (JSON-string schemas and input). " +
    "Each test checks what the user sees after a tool call, not only the tool's answer.",
  tags: ["agents", "webmcp"]
})

test.use({ webmcp: true })

test("Pulse offers ui-sdk's three tools with parseable schemas", async ({ pulsePage, webMcp }, testInfo) => {
  story.init(testInfo)
  story.given("Pulse in a browser with document.modelContext")
  await pulsePage.goto()
  await pulsePage.agent.ready()
  story.then("snapshot, query and act are registered")
  const tools = await webMcp.tools()
  expect(tools.map((tool) => tool.name)).toEqual(["act", "query", "snapshot"])
  story.and("act's input schema asks for steps")
  const act: { required?: string[] } = JSON.parse(tools.find((tool) => tool.name === "act")!.inputSchema)
  expect(act.required).toContain("steps")
  story.table({
    label: "Tools",
    columns: ["Name", "Description"],
    rows: tools.map((tool) => [tool.name, tool.description.slice(0, 90)])
  })
})

test("a browser agent programs Pulse's grid through act", async ({ pulsePage, webMcp }, testInfo) => {
  story.init(testInfo)
  story.given("Pulse, pattern A")
  await pulsePage.goto()
  await pulsePage.agent.ready()
  story.when('the browser agent calls act to set Hat to "xxxxxxxxxxxxxxxx"')
  const result = await webMcp.act([{ ref: "Steps", action: "setTrack", args: ["Hat", "xxxxxxxxxxxxxxxx"] }])
  expect(result.ok).toBe(true)
  story.then("all sixteen Hat cells are on, as the user sees them")
  await expect(pulsePage.grid.hits("Hat")).toHaveCount(16)
})

test("a browser agent reads Pulse's beat from the snapshot and writes a new one in a single act call", async ({
  pulsePage,
  webMcp
}, testInfo) => {
  story.init(testInfo)
  story.given("Pulse, pattern A, as a browser agent first reads it")
  await pulsePage.goto()
  await pulsePage.agent.ready()
  const grid = (await webMcp.snapshot()).find((entry) => entry.component === "step-grid")!
  story.then("the snapshot names every track and shows its steps in the format setTrack takes")
  expect(grid.actions).toContain("setTrack")
  expect(grid.items?.map((item) => item.label)).toContain("Kick: x...x...x...x...")
  story.table({
    label: "The grid as the agent reads it",
    columns: ["Track", "Steps"],
    rows: grid.items!.map((item) => item.label.split(": "))
  })

  story.when("the agent sends one act call: tempo 86, a half-time beat, then Play")
  const result = await webMcp.act([
    { ref: "Tempo", action: "setValue", args: [86] },
    { ref: "Steps", action: "setTrack", args: ["Kick", "x.........x....."] },
    { ref: "Steps", action: "setTrack", args: ["Snare", "........x......."] },
    { ref: "Steps", action: "setTrack", args: ["Hat", "x.x.x.x.x.x.x.x."] },
    { ref: "Play", action: "setPressed", args: [true] }
  ])
  expect(result.ok).toBe(true)
  story.then("the user sees and hears it: the grid, the tempo and Play all changed")
  await expect(pulsePage.grid.hits("Kick")).toHaveCount(2)
  await expect(pulsePage.grid.hits("Hat")).toHaveCount(8)
  await expect(pulsePage.tempoReadout).toHaveText("86")
  await expect(pulsePage.playButton).toHaveAttribute("aria-pressed", "true")
  await expect(pulsePage.grid.playhead).toBeAttached()
  story.and("reading the snapshot again returns the beat the agent wrote")
  const after = (await webMcp.snapshot()).find((entry) => entry.component === "step-grid")!
  expect(after.items?.map((item) => item.label)).toContain("Snare: ........x.......")
  await story.screenshot({ page: pulsePage.page, alt: "A half-time beat written by a browser agent in one call" })
})

test("when the browser holds the sound back, Pulse says so instead of showing a silent Play", async ({
  pulsePage,
  webMcp,
  page
}, testInfo) => {
  story.init(testInfo)
  story.given("a browser that starts audio only after the person's first press, as Chrome does on a page not yet used")
  // Automated Chrome lets audio start anyway, so this stands in for the rule: resume() waits for a real pointer press.
  await page.addInitScript(() => {
    let used = false
    addEventListener("pointerdown", (event) => (used ||= event.isTrusted), true)
    const resume = AudioContext.prototype.resume
    AudioContext.prototype.resume = function () {
      return used ? resume.call(this) : new Promise<void>(() => {})
    }
  })
  await pulsePage.goto()
  await pulsePage.agent.ready()
  story.when("a browser agent presses Play before the person has touched the page")
  expect((await webMcp.act([{ ref: "Play", action: "setPressed", args: [true] }])).ok).toBe(true)
  story.then("Play goes back to off and a toast asks the person to press it")
  await expect(page.getByRole("listitem", { name: "Press Play to hear it" })).toBeVisible()
  await expect(pulsePage.playButton).toHaveAttribute("aria-pressed", "false")
  story.when("the person presses Play")
  await pulsePage.play()
  story.then("it plays")
  await expect(pulsePage.grid.playhead).toBeAttached()
})

test("a browser agent re-brands the studio through act", async ({ studioPage, webMcp }, testInfo) => {
  story.init(testInfo)
  story.given("Brand Studio in light teal")
  await studioPage.goto()
  await studioPage.agent.ready()
  story.when("the browser agent calls act to set Mode to dark")
  const result = await webMcp.act([{ ref: "Mode", action: "setValue", args: ["dark"] }])
  expect(result.ok).toBe(true)
  story.then("the preview turns dark")
  await expect.poll(() => studioPage.previewDarkness()).toBeLessThan(120)
})
