import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { maintenanceNote, UNDER_MAINTENANCE } from "./maintenance"

describe("maintenanceNote", () => {
  // A feature of the test's own, so this still checks something when no real feature is closed.
  beforeEach(() => {
    UNDER_MAINTENANCE.example = "Closed for the test."
  })
  afterEach(() => {
    delete UNDER_MAINTENANCE.example
    vi.unstubAllEnvs()
  })

  it("closes a listed feature on the live site, and only a listed one", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(maintenanceNote("example")).toBe("Closed for the test.")
    expect(maintenanceNote("not-a-feature")).toBeUndefined()
  })

  it("closes nothing on localhost", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(maintenanceNote("example")).toBeUndefined()
  })
})
