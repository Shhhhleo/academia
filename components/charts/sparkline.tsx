/** Tiny server-rendered trend line for grades on a fixed 1–7 scale. */
export function Sparkline({
  points,
  color,
  label,
  width = 96,
  height = 36,
}: {
  points: number[]
  color: string
  label: string
  width?: number
  height?: number
}) {
  if (points.length < 2) return null
  const pad = 4
  const x = (i: number) => pad + (i * (width - pad * 2)) / (points.length - 1)
  const y = (g: number) => pad + ((7 - g) * (height - pad * 2)) / 6
  const d = points.map((g, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(g).toFixed(1)}`).join(" ")
  const last = points.length - 1
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}: ${points.join(", ")}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(points[last])} r={3.5} fill={color} stroke="var(--card)" strokeWidth={2} />
    </svg>
  )
}
