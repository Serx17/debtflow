/**
 * Сегменты по порогам скора и рекомендация канала.
 */

export const SEGMENTS = [
  "мягкое напоминание",
  "активная работа",
  "судебное взыскание",
] as const

export type Segment = (typeof SEGMENTS)[number]

export type ChannelType = "sms" | "email" | "call"

export function scoreToSegment(score: number): Segment {
  if (score >= 0.6) return "мягкое напоминание"
  if (score >= 0.3) return "активная работа"
  return "судебное взыскание"
}

export function segmentToChannel(segment: Segment): ChannelType {
  switch (segment) {
    case "мягкое напоминание":
      return "sms"
    case "активная работа":
      return "email"
    case "судебное взыскание":
      return "call"
  }
}
