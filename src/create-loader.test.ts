import assert from "node:assert/strict"
import { test } from "node:test"
import { createLoader } from "./create-loader.ts"

const load = async () => ({})

test("a tag maps to the longest entry prefix it starts with", () => {
  const loader = createLoader({ entries: { "ui-menu": load, "ui-menubar": load, "acme-badge": load } })
  assert.equal(loader.entryForTag("ui-menu"), "ui-menu")
  assert.equal(loader.entryForTag("ui-menu-item"), "ui-menu")
  assert.equal(loader.entryForTag("ui-menubar"), "ui-menubar", "ui-menubar is its own entry, not ui-menu's part")
  assert.equal(loader.entryForTag("acme-badge"), "acme-badge", "any prefix works, not only ui-")
})

test("tags no entry owns are left alone", () => {
  const loader = createLoader({ entries: { "ui-menu": load } })
  assert.equal(loader.entryForTag("ui-menus"), null, "a prefix must end at a hyphen")
  assert.equal(loader.entryForTag("div"), null)
  assert.equal(loader.entryForTag("acme-badge"), null)
})
