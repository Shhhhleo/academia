import { describe, expect, it } from "vitest"
import { padRect, placeCard, tourStorageKey } from "./tour"

const viewport = { width: 1440, height: 900 }
const card = { width: 352, height: 220 }

describe("placeCard", () => {
  it("centres the card when there is no target", () => {
    expect(placeCard(null, card, viewport)).toEqual({ placement: "center", top: 340, left: 544 })
  })

  it("puts the card on the preferred side when it fits", () => {
    const sidebarSection = { top: 100, left: 8, width: 232, height: 150 }
    const pos = placeCard(sidebarSection, card, viewport, "right")
    expect(pos.placement).toBe("right")
    expect(pos.left).toBe(8 + 232 + 14)
    expect(pos.top).toBe(100 + 75 - 110)
  })

  it("flips to the opposite side when the preferred side has no room", () => {
    const fab = { top: 812, left: 1352, width: 56, height: 56 }
    const pos = placeCard(fab, card, viewport, "right")
    expect(pos.placement).toBe("left")
    expect(pos.left).toBe(1352 - 14 - 352)
    // Clamped so the card stays inside the bottom margin.
    expect(pos.top).toBe(900 - 16 - 220)
  })

  it("keeps a below-target card inside the right edge", () => {
    const avatar = { top: 10, left: 1400, width: 36, height: 36 }
    const pos = placeCard(avatar, card, viewport, "bottom")
    expect(pos.placement).toBe("bottom")
    expect(pos.top).toBe(10 + 36 + 14)
    expect(pos.left).toBe(1440 - 16 - 352)
  })

  it("pins the card to the bottom when no side has room", () => {
    const phone = { width: 375, height: 667 }
    const huge = { top: 40, left: 10, width: 355, height: 560 }
    const pos = placeCard(huge, { width: 343, height: 240 }, phone, "right")
    expect(pos).toEqual({ placement: "sheet", top: 667 - 16 - 240, left: 16 })
  })

  it("never places the card above or left of the margin on tiny screens", () => {
    const pos = placeCard(null, { width: 400, height: 900 }, { width: 320, height: 500 })
    expect(pos.top).toBe(16)
    expect(pos.left).toBe(16)
  })
})

describe("helpers", () => {
  it("pads a rect on every side", () => {
    expect(padRect({ top: 10, left: 20, width: 30, height: 40 }, 6)).toEqual({ top: 4, left: 14, width: 42, height: 52 })
  })

  it("scopes the seen flag to the user and tour version", () => {
    expect(tourStorageKey("abc")).toBe("academia:tour:v1:abc")
  })
})
