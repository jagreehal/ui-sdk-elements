import type { Page } from "@playwright/test"

import type { ActResult, AgentStep } from "./AgentBridge"

export type WebMcpTool = { name: string; description: string; inputSchema: string }

/** The input of ui-sdk's three tools: act takes steps, query takes text, within and kind, snapshot takes nothing. */
export type ToolInput = { steps?: AgentStep[]; text?: string; within?: string; kind?: string }

type ModelContext = {
  getTools(): Promise<WebMcpTool[]>
  executeTool(tool: { name: string }, input: string): Promise<string>
}

declare global {
  interface Document {
    modelContext?: ModelContext
  }
}

/**
 * Bundled Chromium has no `document.modelContext`, so the default lane installs this double before any page
 * script runs. It follows Chrome: `inputSchema` comes back as a JSON string, input goes in as JSON, and a
 * handler that throws surfaces as `UnknownError`.
 */
export async function installWebMcpDouble(page: Page) {
  await page.addInitScript(() => {
    type Tool = {
      name: string
      description: string
      inputSchema?: object
      execute(input: ToolInput): object | string | Promise<object | string>
    }
    const registry = new Map<string, Tool>()
    const fail = (name: string, message: string): never => {
      const error = new Error(message)
      error.name = name
      throw error
    }
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(tool: Tool, options?: { signal?: AbortSignal }) {
          if (registry.has(tool.name)) fail("InvalidStateError", `Duplicate: ${tool.name}`)
          registry.set(tool.name, tool)
          options?.signal?.addEventListener("abort", () => registry.delete(tool.name))
        },
        async getTools() {
          return [...registry.values()]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((tool) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: JSON.stringify(tool.inputSchema ?? {})
            }))
        },
        async executeTool(tool: { name: string }, inputJson: string) {
          let input: ToolInput
          try {
            input = JSON.parse(inputJson)
          } catch {
            return fail("UnknownError", "Failed to parse input arguments")
          }
          try {
            const result = await registry.get(tool.name)!.execute(input)
            return result instanceof Object ? JSON.stringify(result) : String(result)
          } catch {
            return fail(
              "UnknownError",
              "Tool was executed but the invocation failed. For example, the script function threw an error"
            )
          }
        }
      }
    })
  })
}

/** What a browser agent sees and calls through WebMCP. */
export class WebMcp {
  constructor(private readonly page: Page) {}

  async tools(): Promise<WebMcpTool[]> {
    return this.page.evaluate(() => document.modelContext!.getTools())
  }

  /** Calls `act` the way a browser agent does and parses its JSON answer. */
  async act(steps: AgentStep[]): Promise<ActResult> {
    const text = await this.page.evaluate(
      async ({ steps }) => {
        const context = document.modelContext!
        const tool = (await context.getTools()).find((t) => t.name === "act")
        if (!tool) throw new Error('No WebMCP tool "act"')
        return context.executeTool(tool, JSON.stringify({ steps }))
      },
      { steps }
    )
    const result: ActResult = JSON.parse(text)
    return result
  }
}
