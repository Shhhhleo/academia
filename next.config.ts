import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV !== "production"
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"
const supabaseWs = supabase.replace(/^https:/, "wss:")

// The Task Grader's on-device AI (open-source models run in the browser): model files come from Hugging Face,
// the ONNX Runtime engine from jsDelivr, the engine is WebAssembly, and workers start from a blob: bootstrap script.
const onDeviceAi = "https://huggingface.co https://*.huggingface.co https://*.hf.co https://cdn.jsdelivr.net"

// Static CSP (no nonces) so marketing pages stay statically rendered. Scripts are same-origin only, plus the AI engine;
// 'unsafe-inline' covers Next's inline bootstrap and the theme/preference scripts.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs} ${onDeviceAi}${isDev ? " ws: http://localhost:*" : ""}`,
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Hide the Next.js dev-tools badge; it is a development aid, not part of the product.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The signed-in app and its APIs are never indexed and never cached by shared caches.
      {
        source: "/(dashboard|subjects|assessments|calendar|calculator|goals|analytics|integrations|settings|study|todos|reminders|brief|grader|api)/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]
  },
}

export default nextConfig
