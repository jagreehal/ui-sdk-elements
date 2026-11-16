import type { Page } from "@playwright/test"

export type AgentArg = string | number | boolean
export type AgentStep = { ref: string; action: string; args?: AgentArg[] }
export type AgentEntry = {
  component: string
  label?: string
  ref: string
  offPage?: boolean
  actions?: string[]
  items?: { value: string; label: string }[]
}
export type ActResult = { ok: boolean; error?: { message: string } }

type Bridge = { agent: { snapshot(): AgentEntry[]; act(input: { steps: AgentStep[] }): Promise<ActResult> } }

/** The examples publish their bridge on window as boot's last step. */
declare global {
  interface Window {
    pulse?: Bridge
    studio?: Bridge
  }
}

type Example = "pulse" | "studio"

/** ui-sdk's agent bridge (`createAgent`) that an example exposes on `window[example]` once it is ready. */
export class AgentBridge {
  constructor(
    private readonly page: Page,
    private readonly example: Example
  ) {}

  async ready() {
    await this.page.waitForFunction((name) => name in window, this.example)
  }

  async snapshot(): Promise<AgentEntry[]> {
    await this.ready()
    return this.page.evaluate((name) => window[name]!.agent.snapshot().filter((entry) => !entry.offPage), this.example)
  }

  async act(steps: AgentStep[]): Promise<ActResult> {
    await this.ready()
    return this.page.evaluate(({ name, steps }) => window[name]!.agent.act({ steps }), { name: this.example, steps })
  }
}
