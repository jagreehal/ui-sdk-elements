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
