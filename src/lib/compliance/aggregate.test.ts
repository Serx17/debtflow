import { describe, it, expect } from "vitest"
import { aggregateByDebtor, isEntryInAllowedWindow } from "./aggregate"
import type { LogEntry } from "./aggregate"

describe("aggregateByDebtor", () => {
  const periodStart = new Date("2025-03-01T00:00:00")
  const periodEnd = new Date("2025-03-31T23:59:59")

  it("returns empty map for no entries", () => {
    const result = aggregateByDebtor([], periodStart, periodEnd)
    expect(result.size).toBe(0)
  })

  it("ignores email channel", () => {
    const entries: LogEntry[] = [
      { debtor_id: "d1", channel: "email", sent_at: "2025-03-15T12:00:00Z" },
    ]
    const result = aggregateByDebtor(entries, periodStart, periodEnd)
    expect(result.size).toBe(0)
  })

  it("aggregates call and sms per debtor", () => {
    const entries: LogEntry[] = [
      { debtor_id: "d1", channel: "call", sent_at: "2025-03-10T10:00:00Z" },
      { debtor_id: "d1", channel: "call", sent_at: "2025-03-10T11:00:00Z" },
      { debtor_id: "d1", channel: "sms", sent_at: "2025-03-10T12:00:00Z" },
    ]
    const result = aggregateByDebtor(entries, periodStart, periodEnd)
    expect(result.size).toBe(1)
    const counts = result.get("d1")!
    expect(counts.call.day).toBe(2)
    expect(counts.call.month).toBe(2)
    expect(counts.sms.day).toBe(1)
    expect(counts.sms.month).toBe(1)
  })

  it("excludes entries outside period", () => {
    const entries: LogEntry[] = [
      { debtor_id: "d1", channel: "call", sent_at: "2025-02-28T10:00:00Z" },
      { debtor_id: "d1", channel: "call", sent_at: "2025-04-01T10:00:00Z" },
    ]
    const result = aggregateByDebtor(entries, periodStart, periodEnd)
    expect(result.size).toBe(0)
  })

  it("computes max per day across different days", () => {
    const entries: LogEntry[] = [
      { debtor_id: "d1", channel: "call", sent_at: "2025-03-10T10:00:00Z" },
      { debtor_id: "d1", channel: "call", sent_at: "2025-03-10T11:00:00Z" },
      { debtor_id: "d1", channel: "call", sent_at: "2025-03-17T09:00:00Z" },
    ]
    const result = aggregateByDebtor(entries, periodStart, periodEnd)
    const counts = result.get("d1")!
    expect(counts.call.day).toBe(2)
    expect(counts.call.month).toBe(3)
  })
})

describe("isEntryInAllowedWindow", () => {
  it("returns false for null", () => {
    expect(isEntryInAllowedWindow(null)).toBe(false)
  })

  it("allows weekday 10:00", () => {
    expect(isEntryInAllowedWindow("2025-03-10T10:00:00Z")).toBe(true)
  })

  it("rejects weekday 23:00", () => {
    expect(isEntryInAllowedWindow("2025-03-10T23:00:00Z")).toBe(false)
  })
})
