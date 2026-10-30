import { describe, expect, it } from "vitest"
import { csvCell } from "./write"

describe("csvCell", () => {
  it("neutralises formula injection", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`)
    expect(csvCell("+1")).toBe("'+1")
    expect(csvCell("-2")).toBe("'-2")
    expect(csvCell("@cmd")).toBe("'@cmd")
  })
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"')
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"')
  })
  it("serialises null, numbers and objects", () => {
    expect(csvCell(null)).toBe("")
    expect(csvCell(7)).toBe("7")
    expect(csvCell({ A: 1 })).toBe('"{""A"":1}"')
  })
})
