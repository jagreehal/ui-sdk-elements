import type { Locator } from "@playwright/test"

/** The composed `ui-step-grid`, rooted at its grid so it works in Pulse and in the studio sampler. */
export class StepGrid {
  constructor(readonly root: Locator) {}

  cell(track: string, step: number) {
    return this.root.getByRole("gridcell", { name: `${track} step ${step}`, exact: true })
  }

  /** The track's cells that are on (`aria-selected`). */
  hits(track: string) {
    return this.root.getByRole("gridcell", { name: new RegExp(`^${track} step \\d+$`), selected: true })
  }

  /** Cells under the playhead; the playhead is presentation, so it lives in a data attribute. */

  get playhead() {
    return this.root.locator("[data-playhead]").first()
  }

  async toggle(track: string, step: number) {
    await this.cell(track, step).click()
  }

  async focusCell(track: string, step: number) {
    await this.cell(track, step).focus()
  }
}
