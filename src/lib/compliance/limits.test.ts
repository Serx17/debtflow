import { describe, it, expect } from "vitest"
import { isInAllowedWindow, checkLimits } from "./limits"
import type { ContactCounts } from "./limits"

describe("isInAllowedWindow", () => {
  it("allows weekday 8–22", () => {
    expect(isInAllowedWindow(8, false)).toBe(true)
    expect(isInAllowedWindow(12, false)).toBe(true)
    expect(isInAllowedWindow(22, false)).toBe(true)
    expect(isInAllowedWindow(7, false)).toBe(false)
    expect(isInAllowedWindow(23, false)).toBe(false)
  })

  it("allows weekend 9–20", () => {
    expect(isInAllowedWindow(9, true)).toBe(true)
    expect(isInAllowedWindow(15, true)).toBe(true)
    expect(isInAllowedWindow(20, true)).toBe(true)
    expect(isInAllowedWindow(8, true)).toBe(false)
    expect(isInAllowedWindow(21, true)).toBe(false)
  })
})

describe("checkLimits", () => {
  it("returns no violations when within limits", () => {
    const counts: ContactCounts = {
      call: { day: 1, week: 2, month: 8 },
      sms: { day: 2, week: 4, month: 16 },
    }
    expect(checkLimits(counts)).toEqual([])
  })

  it("returns violation when call per day exceeded", () => {
    const counts: ContactCounts = {
      call: { day: 2, week: 2, month: 8 },
      sms: { day: 0, week: 0, month: 0 },
    }
    const violations = checkLimits(counts)
    expect(violations).toHaveLength(1)
    expect(violations[0].channel).toBe("call")
    expect(violations[0].period).toBe("day")
    expect(violations[0].count).toBe(2)
    expect(violations[0].limit).toBe(1)
  })

  it("returns violation when sms per month exceeded", () => {
    const counts: ContactCounts = {
      call: { day: 0, week: 0, month: 0 },
      sms: { day: 2, week: 4, month: 17 },
    }
    const violations = checkLimits(counts)
    expect(violations.some((v) => v.channel === "sms" && v.period === "month")).toBe(true)
  })

  it("returns multiple violations", () => {
    const counts: ContactCounts = {
      call: { day: 3, week: 5, month: 10 },
      sms: { day: 5, week: 0, month: 0 },
    }
    const violations = checkLimits(counts)
    expect(violations.length).toBeGreaterThan(1)
  })
})
