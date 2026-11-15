export type Brand = {
  accent: string
  mode: "light" | "dark"
  radius: number
  font: "sora" | "system" | "serif" | "mono"
}

type Rgb = [number, number, number]

const parse = (hex: string): Rgb => {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (rgb: Rgb) =>
  `#${rgb
    .map((c) =>
      Math.round(Math.min(255, Math.max(0, c)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`

/** `amount` of `a` mixed into `b`, in sRGB. */
const mix = (a: string, b: string, amount: number) => {
  const x = parse(a)
  const y = parse(b)
  const channel = (i: 0 | 1 | 2) => x[i] * amount + y[i] * (1 - amount)
  return toHex([channel(0), channel(1), channel(2)])
}

const luminance = (hex: string) => {
  const linear = (c: number) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = parse(hex)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

export const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Every theme token from four choices. Text on the accent picks whichever of light or dark reads better. */
export function brandTokens({ accent, mode, radius }: Brand) {
  const dark = mode === "dark"
  const base = dark ? "#0d0d0f" : "#ffffff"
  const paper = mix(accent, base, dark ? 0.07 : 0.035)
  const ink = dark ? mix(accent, "#ffffff", 0.06) : mix(accent, "#0b0c0d", 0.12)
  const light = "#ffffff"
  const onAccent = contrast(light, accent) >= contrast("#0b0c0d", accent) ? light : "#0b0c0d"
  return {
    "--ds-ink": ink,
    "--ds-ink-soft": mix(ink, paper, 0.68),
    "--ds-paper": paper,
    "--ds-paper-2": mix(accent, base, dark ? 0.13 : 0.08),
    "--ds-line": mix(ink, paper, dark ? 0.22 : 0.2),
    "--ds-surface": dark ? mix(accent, "#16161a", 0.08) : "#ffffff",
    "--ds-accent": accent,
    "--ds-accent-soft": mix(accent, paper, dark ? 0.28 : 0.14),
    "--ds-accent-ink": dark ? mix(accent, "#ffffff", 0.45) : mix(accent, "#000000", 0.6),
    "--ds-on-accent": onAccent,
    "--ds-scrim": dark ? "rgba(0, 0, 0, 0.6)" : "rgba(15, 18, 20, 0.4)",
    "--ds-warn-soft": dark ? "#3a2410" : "#fff7ed",
    "--ds-radius": `${radius}px`,
    "--ds-radius-lg": `${Math.round(radius * 1.5)}px`,
    "--ds-shadow": dark ? "0 18px 40px -20px rgba(0, 0, 0, 0.85)" : "0 12px 30px -18px rgba(20, 32, 26, 0.35)"
  }
}
