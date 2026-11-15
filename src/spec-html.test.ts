import assert from "node:assert/strict"
import { test } from "node:test"
import { catalog, sampleSpec } from "./catalog.ts"
import { safeHref, specToHtml, specToPage } from "./spec-html.ts"

test("sample spec passes the catalog and renders without a DOM", () => {
  assert.equal(catalog.validate(sampleSpec).success, true)
  const html = specToHtml(sampleSpec)
  assert.equal(html.match(/data-slot="card"/g)?.length, 7, "3 repeated feature cards + 4 pricing cards")
  assert.match(html, /Accessible by default/, "$item resolves from state")
  assert.match(
    html,
    /<ui-accordion default-value="who" aria-label="Questions"/,
    "accordions are named for screen readers and agents"
  )
  assert.doesNotMatch(
    html,
    /<ui-select-item-indicator>✓/,
    "select checks are drawn by the theme, not part of item names"
  )
  assert.match(html, /<ui-dialog/)
})

test("visible conditions read state (hidden but kept for the runtime)", () => {
  const spec = {
    root: "r",
    state: { plan: "free" },
    elements: {
      r: { type: "Stack", props: { gap: null }, children: ["pro", "free"] },
      pro: {
        type: "Text",
        props: { content: "PRO", tone: null },
        visible: { $state: "/plan", eq: "pro" },
        children: []
      },
      free: {
        type: "Text",
        props: { content: "FREE", tone: null },
        visible: { $state: "/plan", eq: "free" },
        children: []
      }
    }
  }
  const html = specToHtml(spec)
  assert.match(html, /<p data-jr-key="pro" hidden/)
  assert.match(html, /<p data-jr-key="free" style/)
})

test("model text is escaped and unsafe hrefs are dropped", () => {
  const spec = {
    root: "c",
    elements: {
      c: {
        type: "Cta",
        props: { label: '<img src=x onerror="alert(1)">', href: "javascript:alert(1)", variant: null },
        children: []
      }
    }
  }
  const html = specToHtml(spec)
  assert.doesNotMatch(html, /<img/)
  assert.match(html, /href="#"/)
  for (const bad of ["javascript:x", "JavaScript:x", "//evil.com", "data:text/html,x", " vbscript:x"])
    assert.equal(safeHref(bad), "#", bad)
  for (const ok of ["https://a.com", "/pricing", "#demo", "mailto:a@b.co", "signup"]) assert.equal(safeHref(ok), ok, ok)
})

test("static page links the CDN theme and loader", () => {
  const page = specToPage(sampleSpec, { title: "T</title>", assetsBase: "https://cdn.example.com/ui" })
  assert.match(page, /https:\/\/cdn\.example\.com\/ui\/loader\.js/)
  assert.match(page, /<title>T&lt;\/title&gt;<\/title>/)
})

test("state-driven elements are tagged for the runtime; static ones are not", () => {
  const html = specToHtml(sampleSpec)
  assert.match(html, /<div data-jr-key="plans-annual" hidden/, "annual plans hidden but present")
  assert.match(html, /<div data-jr-key="plans-monthly" data-slot="grid"/, "monthly plans visible")
  assert.match(
    html,
    /<button data-jr-key="hero-demo" data-slot="cta"[^>]*type="button"/,
    "Cta without href is a button"
  )
  assert.match(html, /<ui-dialog data-jr-key="demo">/)
  assert.doesNotMatch(html, /<ui-dialog-trigger/, "triggerLabel null → no trigger")
  assert.doesNotMatch(html, /data-jr-key="(hero|features|q1)"/)
})

test("keys and embedded spec cannot break out of their context", () => {
  const spec = {
    root: "$'\"><x>",
    state: { s: "</script><script>alert(1)</script>" },
    elements: {
      "$'\"><x>": {
        type: "Text",
        props: { content: { $state: "/s" }, tone: null },
        visible: { $state: "/s" },
        children: []
      }
    }
  }
  const html = specToHtml(spec)
  assert.doesNotMatch(html, /<x>|<script>/)
  const page = specToPage(spec, { title: "t", assetsBase: "/" })
  assert.equal(page.match(/<\/script>/g)?.length, 2, "only the loader and spec script tags close")
  assert.match(page, /id="json-render-spec"/)
  assert.doesNotMatch(
    specToPage(
      { root: "a", elements: { a: { type: "Text", props: { content: "x", tone: null }, children: [] } } },
      { title: "t", assetsBase: "/" }
    ),
    /json-render-spec/,
    "no runtime for static pages"
  )
})
