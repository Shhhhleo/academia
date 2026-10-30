import { describe, expect, it } from "vitest"
import { safeNextPath } from "./safe-next"

describe("safeNextPath", () => {
  it.each([
    ["/subjects", "/subjects"],
    ["/subjects?x=1", "/subjects?x=1"],
    ["/subjects/abc#criteria", "/subjects/abc#criteria"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })

  it.each([
    ["//evil.com"],
    ["https://evil.com"],
    ["/\\evil.com"],
    ["\\\\evil.com"],
    ["javascript:alert(1)"],
    ["subjects"],
    [""],
    ["/%2F%2Fevil.com"],
    ["/\t/evil.com"],
  ])("rejects %s", (input) => {
    expect(safeNextPath(input)).toBe("/dashboard")
  })

  it("falls back for null/undefined and honours a custom fallback", () => {
    expect(safeNextPath(null)).toBe("/dashboard")
    expect(safeNextPath(undefined, "/settings")).toBe("/settings")
  })
})
