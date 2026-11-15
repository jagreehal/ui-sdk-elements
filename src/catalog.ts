import { defineCatalog, defineSchema, type Spec } from "@json-render/core"
import { z } from "zod"

/**
 * Standard json-render renderer schema (same Spec shape as @json-render/react,
 * /svelte, /vue): flat elements, `visible`, `repeat`, top-level `state`.
 * Copied from @json-render/svelte/schema.ts. Only the setState built-in action
 * is offered: `runtime.ts` implements it (press → setState, $bindState ↔ ui-* props).
 */
export const schema = defineSchema(
  (s) => ({
    spec: s.object({
      root: s.string(),
      elements: s.record(
        s.object({
          type: s.ref("catalog.components"),
          props: s.propsOf("catalog.components"),
          children: s.array(s.string()),
          visible: { ...s.any(), ...s.optional() },
          repeat: { ...s.any(), ...s.optional() },
          on: { ...s.any(), ...s.optional() }
        })
      )
    }),
    catalog: s.object({
      components: s.map({
        props: s.zod(),
        slots: s.array(s.string()),
        description: s.string(),
        example: s.any()
      }),
      actions: s.map({
        params: s.zod(),
        description: s.string()
      })
    })
  }),
  {
    builtInActions: [
      {
        name: "setState",
        description:
          "Update a value in the state model at the given statePath. Params: { statePath: string, value: any }"
      }
    ],
    defaultRules: [
      "CRITICAL INTEGRITY CHECK: Before outputting ANY element that references children, you MUST have already output (or will output) each child as its own element. If an element has children: ['a', 'b'], then elements 'a' and 'b' MUST exist. A missing child element causes that entire branch of the UI to be invisible.",
      "SELF-CHECK: After generating all elements, mentally walk the tree from root. Every key in every children array must resolve to a defined element. If you find a gap, output the missing element immediately.",
      'REQUIRED FIELDS: Every element MUST include a "children" array. Leaf elements use an empty array: "children": []. Omitting "children" fails validation.',
      'CRITICAL: The "visible" field goes on the ELEMENT object, NOT inside "props". Correct: {"type":"<ComponentName>","props":{},"visible":{"$state":"/plan","eq":"pro"},"children":[...]}.',
      'When building repeating content (features, testimonials, plans), you MAY put the items in the top-level "state" field and use "repeat" on a container: { "type": "Grid", "props": {"columns": 3}, "repeat": { "statePath": "/features", "key": "id" }, "children": ["feature-card"] }. Inside repeated children use { "$item": "field" } to read a field of the current item.',
      'CRITICAL: The "on" field goes on the ELEMENT object, NOT inside "props". Only on.press exists (Cta, Toggle). NEVER put action/actionParams inside props.',
      'To open a Dialog from a Cta: put {"demoOpen": false} in state, give the Dialog props.open {"$bindState": "/demoOpen"} and triggerLabel null, and give the Cta href null and "on": {"press": {"action": "setState", "params": {"statePath": "/demoOpen", "value": true}}}.',
      'Interactive choices (e.g. monthly/annual pricing): bind Switch checked, Toggle pressed, Checkbox checked or Select value with {"$bindState": "/path"} and show the matching content with "visible": {"$state": "/path", "eq": value}.',
      "Marketing pages: start with a Hero, then Sections. Put Cards in a Grid. Use Cta for calls to action and Quote for testimonials. Use Accordion for FAQs.",
      "Write specific, concrete marketing copy for the brief. Never use lorem ipsum or placeholder text.",
      "Link hrefs must be https:// URLs, root-relative paths (/pricing) or fragments (#demo)."
    ]
  }
)

const nullableString = z.string().nullable()

export const catalog = defineCatalog(schema, {
  components: {
    // —— Marketing composites (plain HTML + theme.css; no entry module) ——
    Hero: {
      props: z.object({
        eyebrow: nullableString,
        title: z.string(),
        subtitle: nullableString,
        ctaLabel: nullableString,
        ctaHref: nullableString,
        secondaryLabel: nullableString,
        secondaryHref: nullableString
      }),
      slots: ["default"],
      description:
        "Top-of-page banner: big headline, supporting line, up to two call-to-action links. Children (e.g. a Cta that opens a Dialog) sit in the same row as the CTAs. Use once, first.",
      example: {
        eyebrow: "New",
        title: "Ship pages your brand team trusts",
        subtitle: "Generated from your design system, accessible by default.",
        ctaLabel: "Start free",
        ctaHref: "/signup",
        secondaryLabel: "Book a demo",
        secondaryHref: "#demo"
      }
    },
    Section: {
      props: z.object({ title: nullableString, intro: nullableString }),
      slots: ["default"],
      description: "Page section with an optional heading and intro paragraph; children go below.",
      example: { title: "Why teams switch", intro: "Three reasons." }
    },
    Grid: {
      props: z.object({ columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).nullable() }),
      slots: ["default"],
      description: "Responsive grid of equal columns (collapses on small screens). Put Cards or Quotes in it.",
      example: { columns: 3 }
    },
    Card: {
      props: z.object({ eyebrow: nullableString, title: z.string(), body: nullableString }),
      slots: ["default"],
      description: "Feature, plan or benefit card. Children (e.g. a Cta) render at the bottom.",
      example: { eyebrow: null, title: "On-brand by default", body: "Every page uses your tokens." }
    },
    Cta: {
      props: z.object({
        label: z.string(),
        href: nullableString,
        variant: z.enum(["primary", "secondary"]).nullable()
      }),
      slots: [],
      description:
        "Call-to-action styled as a button: a link when href is set, or a button that runs on.press (e.g. open a Dialog) when href is null.",
      example: { label: "Get started", href: "/signup", variant: "primary" }
    },
    Quote: {
      props: z.object({ quote: z.string(), author: z.string(), role: nullableString }),
      slots: [],
      description: "Customer testimonial.",
      example: { quote: "We launched in a day.", author: "Ana Ruiz", role: "Head of Growth, Northwind" }
    },

    // —— Layout, text and interactive ui-sdk components ——
    Stack: {
      props: z.object({
        gap: z.enum(["sm", "md", "lg"]).nullable()
      }),
      slots: ["default"],
      description: "Vertical layout container for page sections.",
      example: { gap: "md" }
    },
    Row: {
      props: z.object({
        gap: z.enum(["sm", "md", "lg"]).nullable()
      }),
      slots: ["default"],
      description: "Horizontal layout row for controls side by side.",
      example: { gap: "sm" }
    },
    Text: {
      props: z.object({
        content: z.string(),
        tone: z.enum(["body", "muted", "title"]).nullable()
      }),
      slots: [],
      description: "Plain text block. Use tone title for headings.",
      example: { content: "Welcome", tone: "title" }
    },
    Toggle: {
      props: z.object({
        label: z.string(),
        pressed: z.boolean().nullable()
      }),
      slots: [],
      description: "Pressable toggle button (aria-pressed). Use for Bold/Italic-style formatting.",
      example: { label: "Bold", pressed: false }
    },
    Switch: {
      props: z.object({
        label: z.string(),
        checked: z.boolean().nullable()
      }),
      slots: [],
      description: "On/off setting that applies immediately.",
      example: { label: "Notifications", checked: true }
    },
    Checkbox: {
      props: z.object({
        label: z.string(),
        checked: z.boolean().nullable()
      }),
      slots: [],
      description: "Independent yes/no choice with a visible label.",
      example: { label: "Weekly digest", checked: false }
    },
    Select: {
      props: z.object({
        label: z.string(),
        placeholder: z.string().nullable(),
        defaultValue: z.string().nullable(),
        value: z.string().nullable(),
        options: z.array(
          z.object({
            value: z.string(),
            label: z.string()
          })
        )
      }),
      slots: [],
      description: "Choose one value from a popup list.",
      example: {
        label: "Role",
        placeholder: "Choose a role",
        defaultValue: "editor",
        options: [
          { value: "viewer", label: "Viewer" },
          { value: "editor", label: "Editor" }
        ]
      }
    },
    Tabs: {
      props: z.object({
        label: z.string(),
        defaultValue: z.string(),
        tabs: z.array(
          z.object({
            value: z.string(),
            label: z.string(),
            content: z.string()
          })
        )
      }),
      slots: [],
      description: "Switch between related panels; one tab selected at a time.",
      example: {
        label: "Settings",
        defaultValue: "account",
        tabs: [
          { value: "account", label: "Account", content: "Profile settings." },
          { value: "billing", label: "Billing", content: "Plan and invoices." }
        ]
      }
    },
    Dialog: {
      props: z.object({
        triggerLabel: z.string().nullable(),
        title: z.string(),
        description: z.string().nullable(),
        confirmLabel: z.string().nullable(),
        open: z.boolean().nullable()
      }),
      slots: [],
      description:
        "Modal task over the page with focus trap and Escape to close. Opens from its own trigger button, or from a Cta when open is bound with $bindState (then set triggerLabel null).",
      example: {
        triggerLabel: "Share",
        title: "Share link",
        description: "Anyone with the link can view.",
        confirmLabel: "Done",
        open: null
      }
    },
    Popover: {
      props: z.object({
        triggerLabel: z.string(),
        title: z.string(),
        description: z.string().nullable()
      }),
      slots: [],
      description: "Small panel anchored to a trigger for details or light editing.",
      example: {
        triggerLabel: "Details",
        title: "Project",
        description: "Updated today."
      }
    },
    Menu: {
      props: z.object({
        triggerLabel: z.string(),
        items: z.array(
          z.object({
            value: z.string(),
            label: z.string(),
            danger: z.boolean().nullable()
          })
        )
      }),
      slots: [],
      description: "Action menu opened from a button.",
      example: {
        triggerLabel: "Actions",
        items: [
          { value: "rename", label: "Rename", danger: null },
          { value: "delete", label: "Delete", danger: true }
        ]
      }
    },
    Tooltip: {
      props: z.object({
        label: z.string(),
        hint: z.string()
      }),
      slots: [],
      description: "Short hint on hover or focus for an icon button.",
      example: { label: "Bookmark", hint: "Add to library" }
    },
    Slider: {
      props: z.object({
        label: z.string(),
        defaultValue: z.number().nullable()
      }),
      slots: [],
      description: "Numeric value adjusted by dragging or arrow keys.",
      example: { label: "Volume", defaultValue: 40 }
    },
    Accordion: {
      props: z.object({
        label: z.string().nullable().optional(),
        defaultValue: z.string().nullable(),
        items: z.array(
          z.object({
            value: z.string(),
            title: z.string(),
            content: z.string()
          })
        )
      }),
      slots: [],
      description:
        "Expandable FAQ or settings sections; one open by default. label names the group for screen readers and agents.",
      example: {
        defaultValue: "one",
        items: [{ value: "one", title: "What is this?", content: "A demo page." }]
      }
    }
  },
  actions: {}
})

export type UiSpec = Spec

export { sampleSpec } from "./sample-spec.ts"
