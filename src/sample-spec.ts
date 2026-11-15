import type { Spec } from "@json-render/core"

/** Hand-written marketing page; renders without a model. */
export const sampleSpec: Spec = {
  root: "page",
  state: {
    annual: false,
    demoOpen: false,
    features: [
      {
        id: "brand",
        title: "On-brand by construction",
        body: "Pages can only use components from your design system, so every page matches your tokens."
      },
      {
        id: "a11y",
        title: "Accessible by default",
        body: "Dialogs, tabs and accordions get keyboard, focus and ARIA behaviour from ui-sdk."
      },
      {
        id: "light",
        title: "Only the code you use",
        body: "The loader fetches the modules for the components on the page, nothing else."
      }
    ]
  },
  elements: {
    page: { type: "Stack", props: { gap: "lg" }, children: ["hero", "features", "pricing", "proof", "faq"] },
    hero: {
      type: "Hero",
      props: {
        eyebrow: "For marketing teams",
        title: "Launch on-brand pages in minutes",
        subtitle:
          "Describe the page. It is built from your design system, accessible, and ships only the code it uses.",
        ctaLabel: "Start free",
        ctaHref: "https://github.com/jagreehal/ui-sdk-elements",
        secondaryLabel: null,
        secondaryHref: null
      },
      children: ["hero-demo"]
    },
    "hero-demo": {
      type: "Cta",
      props: { label: "Book a demo", href: null, variant: "secondary" },
      on: { press: { action: "setState", params: { statePath: "/demoOpen", value: true } } },
      children: []
    },
    pricing: {
      type: "Section",
      props: { title: "Pricing", intro: null },
      children: ["billing", "plans-monthly", "plans-annual"]
    },
    billing: {
      type: "Switch",
      props: { label: "Pay annually (2 months free)", checked: { $bindState: "/annual" } },
      children: []
    },
    "plans-monthly": {
      type: "Grid",
      props: { columns: 2 },
      visible: { $state: "/annual", eq: false },
      children: ["team-m", "biz-m"]
    },
    "plans-annual": {
      type: "Grid",
      props: { columns: 2 },
      visible: { $state: "/annual", eq: true },
      children: ["team-a", "biz-a"]
    },
    "team-m": {
      type: "Card",
      props: { eyebrow: "Team", title: "$12 / editor / month", body: "Unlimited pages, your full design system." },
      children: []
    },
    "biz-m": {
      type: "Card",
      props: { eyebrow: "Business", title: "$29 / editor / month", body: "Approvals, SSO and audit log." },
      children: []
    },
    "team-a": {
      type: "Card",
      props: { eyebrow: "Team", title: "$120 / editor / year", body: "Unlimited pages, your full design system." },
      children: []
    },
    "biz-a": {
      type: "Card",
      props: { eyebrow: "Business", title: "$290 / editor / year", body: "Approvals, SSO and audit log." },
      children: []
    },
    features: { type: "Section", props: { title: "Why teams switch", intro: null }, children: ["feature-grid"] },
    "feature-grid": {
      type: "Grid",
      props: { columns: 3 },
      repeat: { statePath: "/features", key: "id" },
      children: ["feature-card"]
    },
    "feature-card": {
      type: "Card",
      props: { eyebrow: null, title: { $item: "title" }, body: { $item: "body" } },
      children: []
    },
    proof: { type: "Section", props: { title: null, intro: null }, children: ["quotes"] },
    quotes: { type: "Grid", props: { columns: 2 }, children: ["q1", "q2"] },
    q1: {
      type: "Quote",
      props: {
        quote: "We shipped our launch page the same afternoon, without a design review.",
        author: "Ana Ruiz",
        role: "Head of Growth, Northwind"
      },
      children: []
    },
    q2: {
      type: "Quote",
      props: {
        quote: "Brand stopped being a bottleneck. Every page already looks like us.",
        author: "Sam Okafor",
        role: "Brand Lead, Lumen"
      },
      children: []
    },
    faq: { type: "Section", props: { title: "Questions", intro: null }, children: ["faq-list", "demo"] },
    "faq-list": {
      type: "Accordion",
      props: {
        defaultValue: "who",
        items: [
          {
            value: "who",
            title: "Who is it for?",
            content: "Marketing and content teams who need pages fast, within the brand."
          },
          {
            value: "dev",
            title: "Do we need developers?",
            content: "Only to add components to the design system. Pages are generated from them."
          }
        ]
      },
      children: []
    },
    demo: {
      type: "Dialog",
      props: {
        triggerLabel: null,
        title: "Book a demo",
        description: "We will email you within one working day.",
        confirmLabel: "Done",
        open: { $bindState: "/demoOpen" }
      },
      children: []
    }
  }
}
