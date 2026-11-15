import type { Page } from "@playwright/test"

/** docs/components.html: every themed component, through the CDN loader. */
export class ShowcasePage {
  constructor(readonly page: Page) {}

  get heading() {
    return this.page.getByRole("heading", { name: "Component showcase" })
  }

  get settingsTabs() {
    return this.page.getByRole("tablist", { name: "Settings" })
  }

  tab(name: string) {
    return this.settingsTabs.getByRole("tab", { name })
  }

  async moveToLastTab() {
    await this.tab("Account").click()
    await this.page.keyboard.press("End")
  }

  /** How far (px) the tab list pokes out of its card, and the tab out of the list's visible area. 0 means it fits. */
  async tabOverflow(name: string) {
    const card = this.settingsTabs.locator(
      "xpath=ancestor::*[contains(@class,'card') or self::article or self::section][1]"
    )
    const [cardBox, listBox, tabBox] = await Promise.all([
      card.boundingBox(),
      this.settingsTabs.boundingBox(),
      this.tab(name).boundingBox()
    ])
    return {
      listOutOfCard: Math.max(0, Math.round(listBox!.x + listBox!.width - (cardBox!.x + cardBox!.width))),
      tabOutOfList: Math.max(
        0,
        Math.round(tabBox!.x + tabBox!.width - (listBox!.x + listBox!.width)),
        Math.round(listBox!.x - tabBox!.x)
      )
    }
  }

  /** Vertical distance (px) between a slider's thumb centre and its track centre. 0 means it sits on the line. */
  async thumbOffset(sliderName: string) {
    const slider = this.page.getByRole("group", { name: sliderName })
    const [thumb, track] = await Promise.all([
      slider.locator('[data-slot="slider-thumb"]').boundingBox(),
      slider.locator('[data-slot="slider-track"]').boundingBox()
    ])
    return Math.round(thumb!.y + thumb!.height / 2 - (track!.y + track!.height / 2))
  }

  get shareDialog() {
    return this.page.getByRole("dialog")
  }

  async openShareDialog() {
    await this.page.getByRole("button", { name: "Share link" }).click()
  }

  /** Space (px) between the dialog's description and its first action. */
  async dialogActionGap() {
    const [description, action] = await Promise.all([
      this.shareDialog.locator('[data-slot="dialog-description"]').boundingBox(),
      this.shareDialog.getByRole("button").last().boundingBox()
    ])
    return Math.round(action!.y - (description!.y + description!.height))
  }

  async goto() {
    await this.page.goto("components.html")
    // The loader upgrades tags after load; interact only once every ui-* element is defined.
    await this.page.waitForFunction(
      () => ![...document.querySelectorAll(":not(:defined)")].some((el) => el.localName.startsWith("ui-"))
    )
  }

  /** ui-* tags on the page that haven't upgraded yet. */
  async undefinedUiTags() {
    return this.page.evaluate(() => [
      ...new Set(
        [...document.querySelectorAll(":not(:defined)")]
          .map((el) => el.localName)
          .filter((tag) => tag.startsWith("ui-"))
      )
    ])
  }
}
