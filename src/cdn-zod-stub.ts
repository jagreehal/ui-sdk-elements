/**
 * CDN build only (vite.cdn.config.js aliases "zod" here). @json-render/core builds zod schemas at module top level,
 * which pulls ~100 kB of zod into the browser runtime. runtime.ts only uses createStateStore, evaluateVisibility,
 * resolveBindings and resolveActionParam, none of which validate, so every z.* call can return this inert chain.
 * shortcut: if runtime.ts starts using a json-render function that calls safeParse, drop this alias.
 */
const chain: any = new Proxy(function () {}, { get: () => chain, apply: () => chain })
export const z = chain
export default chain
