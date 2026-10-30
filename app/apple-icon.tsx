import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14, padding: "0 0 44px", background: "#4f46e5" }}>
        <div style={{ width: 24, height: 42, borderRadius: 8, background: "rgba(255,255,255,0.55)" }} />
        <div style={{ width: 24, height: 68, borderRadius: 8, background: "rgba(255,255,255,0.8)" }} />
        <div style={{ width: 24, height: 94, borderRadius: 8, background: "#fff" }} />
      </div>
    ),
    size,
  )
}
