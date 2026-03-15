import { describe, it, expect } from "vitest"
import { scoreToSegment, segmentToChannel } from "./segments"

describe("scoreToSegment", () => {
  it("maps high score to мягкое напоминание", () => {
    expect(scoreToSegment(0.9)).toBe("мягкое напоминание")
    expect(scoreToSegment(0.6)).toBe("мягкое напоминание")
  })

  it("maps medium score to активная работа", () => {
    expect(scoreToSegment(0.5)).toBe("активная работа")
    expect(scoreToSegment(0.4)).toBe("активная работа")
  })

  it("maps low score to судебное взыскание", () => {
    expect(scoreToSegment(0.2)).toBe("судебное взыскание")
    expect(scoreToSegment(0.39)).toBe("судебное взыскание")
    expect(scoreToSegment(0)).toBe("судебное взыскание")
  })
})

describe("segmentToChannel", () => {
  it("recommends sms for мягкое напоминание", () => {
    expect(segmentToChannel("мягкое напоминание")).toBe("sms")
  })

  it("recommends email for активная работа", () => {
    expect(segmentToChannel("активная работа")).toBe("email")
  })

  it("recommends call for судебное взыскание", () => {
    expect(segmentToChannel("судебное взыскание")).toBe("call")
  })
})
