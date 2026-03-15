import {
  LIMITS_230_FZ,
  WEEKDAY_HOURS,
  WEEKEND_HOURS,
} from "./constants"

export type ChannelType = "call" | "sms"

/** Агрегаты контактов по одному должнику за период (по каналам call/sms). */
export interface ContactCounts {
  call: { day: number; week: number; month: number }
  sms: { day: number; week: number; month: number }
}

/** Результат проверки лимитов по одному каналу. */
export interface LimitCheck {
  ok: boolean
  channel: ChannelType
  period: "day" | "week" | "month"
  count: number
  limit: number
}

/**
 * Проверяет, попадает ли момент времени в разрешённое окно 230-ФЗ.
 * Используется локальное время (переданные hour и isWeekend).
 */
export function isInAllowedWindow(
  hour: number,
  isWeekend: boolean
): boolean {
  const { start, end } = isWeekend ? WEEKEND_HOURS : WEEKDAY_HOURS
  return hour >= start && hour <= end
}

/**
 * Проверяет соблюдение лимитов 230-ФЗ по агрегатам контактов.
 * Возвращает список нарушений (пустой массив — всё в норме).
 */
export function checkLimits(counts: ContactCounts): LimitCheck[] {
  const violations: LimitCheck[] = []

  for (const channel of ["call", "sms"] as const) {
    const limits = LIMITS_230_FZ[channel]
    const c = counts[channel]
    if (c.day > limits.perDay) {
      violations.push({
        ok: false,
        channel,
        period: "day",
        count: c.day,
        limit: limits.perDay,
      })
    }
    if (c.week > limits.perWeek) {
      violations.push({
        ok: false,
        channel,
        period: "week",
        count: c.week,
        limit: limits.perWeek,
      })
    }
    if (c.month > limits.perMonth) {
      violations.push({
        ok: false,
        channel,
        period: "month",
        count: c.month,
        limit: limits.perMonth,
      })
    }
  }

  return violations
}
