/**
 * Лимиты контактов по 230-ФЗ «О потребительском кредите (займе)»:
 * звонки — 1/день, 2/неделю, 8/месяц; SMS — 2/день, 4/неделю, 16/месяц.
 * Разрешённые часы: будни 8:00–22:00, выходные и праздники 9:00–20:00 (локальное время).
 */

export const LIMITS_230_FZ = {
  call: { perDay: 1, perWeek: 2, perMonth: 8 },
  sms: { perDay: 2, perWeek: 4, perMonth: 16 },
} as const

/** Часы для будних дней (0–23). */
export const WEEKDAY_HOURS = { start: 8, end: 22 } as const

/** Часы для выходных и праздников (0–23). */
export const WEEKEND_HOURS = { start: 9, end: 20 } as const
