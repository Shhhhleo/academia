import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

export const alt = "Academia: the IB grade tracker that shows exactly where you stand"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const font = (w: 700 | 800) =>
  readFile(join(process.cwd(), `assets/fonts/plus-jakarta-sans-latin-${w}-normal.woff`))

const SUBJECTS = [
  { name: "Language and Literature", grade: 6, color: "#3987e5" },
  { name: "Sciences", grade: 6, color: "#c98500" },
  { name: "Mathematics", grade: 5, color: "#d55181" },
]

export default async function OpenGraphImage() {
  const [bold, extra] = await Promise.all([font(700), font(800)])
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "radial-gradient(70% 90% at 80% 20%, #2a2770 0%, #0b0c10 60%)",
          color: "#f5f5f5",
          padding: 72,
          fontFamily: "Jakarta",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "#4f46e5", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 4, paddingBottom: 10 }}>
              <div style={{ width: 6, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.55)" }} />
              <div style={{ width: 6, height: 16, borderRadius: 2, background: "rgba(255,255,255,0.8)" }} />
              <div style={{ width: 6, height: 22, borderRadius: 2, background: "#fff" }} />
            </div>
            Academia
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>Know exactly where you stand.</div>
            <div style={{ fontSize: 28, color: "#a1a1aa", lineHeight: 1.3 }}>The IB grade tracker for MYP and DP students.</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, marginLeft: "auto" }}>
          {SUBJECTS.map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 360,
                padding: "20px 24px",
                borderRadius: 16,
                background: "#222329",
                border: "1px solid #303137",
                borderTop: `4px solid ${s.color}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 56, fontWeight: 800 }}>{s.grade}</span>
                <span style={{ fontSize: 22, color: "#a1a1aa" }}>/7</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Jakarta", data: bold, weight: 700, style: "normal" },
        { name: "Jakarta", data: extra, weight: 800, style: "normal" },
      ],
    },
  )
}
