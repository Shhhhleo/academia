/**
 * Subject identity colours: a validated categorical order (adjacent-pair CVD ΔE ≥ 8,
 * normal-vision ΔE ≥ 15 in light and dark). New subjects take the next slot in order;
 * dark mode uses each hue's dark step. Colour always follows the subject, never its rank.
 */
export const SUBJECT_COLORS = [
  { name: "Blue", light: "#2a78d6", dark: "#3987e5" },
  { name: "Orange", light: "#eb6834", dark: "#d95926" },
  { name: "Aqua", light: "#1baf7a", dark: "#199e70" },
  { name: "Yellow", light: "#eda100", dark: "#c98500" },
  { name: "Magenta", light: "#e87ba4", dark: "#d55181" },
  { name: "Green", light: "#008300", dark: "#008300" },
  { name: "Violet", light: "#6250d6", dark: "#9085e9" },
  { name: "Red", light: "#e34948", dark: "#e66767" },
] as const

const DARK_STEP = new Map<string, string>(SUBJECT_COLORS.map((c) => [c.light, c.dark]))

export function seriesColor(hex: string, dark: boolean) {
  return dark ? (DARK_STEP.get(hex.toLowerCase()) ?? hex) : hex
}

export function nextSubjectColor(existingCount: number) {
  return SUBJECT_COLORS[existingCount % SUBJECT_COLORS.length].light
}
