import type { ContactCounts } from "./limits"

export interface LogEntry {
  debtor_id: string
  channel: "sms" | "email" | "call"
  sent_at: string | null
}

/**
 * Возвращает дату в формате YYYY-MM-DD по локальной дате (для группировки по дням).
 */
function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Возвращает понедельник той недели (YYYY-MM-DD) для группировки по неделям.
 */
function toWeekKey(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return toDateKey(d)
}

/**
 * Агрегирует контакты по должникам за период.
 * Учитываются только каналы call и sms (email не лимитируется 230-ФЗ в тех же объёмах).
 * day = макс. контактов в один день, week = макс. в одну неделю, month = всего за период.
 */
export function aggregateByDebtor(
  entries: LogEntry[],
  periodStart: Date,
  periodEnd: Date
): Map<string, ContactCounts> {
  const inPeriod = (sentAt: string | null): boolean => {
    if (!sentAt) return false
    const t = new Date(sentAt).getTime()
    return t >= periodStart.getTime() && t <= periodEnd.getTime()
  }

  // Группируем по debtor+channel+day, debtor+channel+week, debtor+channel+month
  const byDebtorChannelDay = new Map<string, number>()
  const byDebtorChannelWeek = new Map<string, number>()
  const byDebtorChannelMonth = new Map<string, number>()

  for (const row of entries) {
    if (row.channel !== "call" && row.channel !== "sms") continue
    if (!inPeriod(row.sent_at)) continue

    const debtorId = row.debtor_id
    const date = new Date(row.sent_at!)
    const dayKey = toDateKey(date)
    const weekKey = toWeekKey(date)

    const keyDay = `${debtorId}:${row.channel}:${dayKey}`
    const keyWeek = `${debtorId}:${row.channel}:${weekKey}`
    const keyMonth = `${debtorId}:${row.channel}:month`

    byDebtorChannelDay.set(keyDay, (byDebtorChannelDay.get(keyDay) ?? 0) + 1)
    byDebtorChannelWeek.set(keyWeek, (byDebtorChannelWeek.get(keyWeek) ?? 0) + 1)
    byDebtorChannelMonth.set(keyMonth, (byDebtorChannelMonth.get(keyMonth) ?? 0) + 1)
  }

  const debtors = new Set<string>()
  for (const row of entries) {
    if ((row.channel === "call" || row.channel === "sms") && inPeriod(row.sent_at)) {
      debtors.add(row.debtor_id)
    }
  }

  const result = new Map<string, ContactCounts>()

  for (const debtorId of debtors) {
    let callDay = 0,
      callWeek = 0,
      callMonth = 0
    let smsDay = 0,
      smsWeek = 0,
      smsMonth = 0

    for (const [key, count] of byDebtorChannelDay) {
      if (!key.startsWith(debtorId + ":")) continue
      const parts = key.split(":")
      const ch = parts[1]
      if (ch === "call") callDay = Math.max(callDay, count)
      else if (ch === "sms") smsDay = Math.max(smsDay, count)
    }
    for (const [key, count] of byDebtorChannelWeek) {
      if (!key.startsWith(debtorId + ":")) continue
      const parts = key.split(":")
      const ch = parts[1]
      if (ch === "call") callWeek = Math.max(callWeek, count)
      else if (ch === "sms") smsWeek = Math.max(smsWeek, count)
    }
    for (const [key, count] of byDebtorChannelMonth) {
      if (!key.startsWith(debtorId + ":")) continue
      const parts = key.split(":")
      const ch = parts[1]
      if (ch === "call") callMonth += count
      else if (ch === "sms") smsMonth += count
    }

    result.set(debtorId, {
      call: { day: callDay, week: callWeek, month: callMonth },
      sms: { day: smsDay, week: smsWeek, month: smsMonth },
    })
  }

  return result
}

/**
 * Проверяет, попадает ли отправка в разрешённое время 230-ФЗ (локальное время).
 * Будни 8–22, выходные 9–20.
 */
export function isEntryInAllowedWindow(sentAt: string | null): boolean {
  if (!sentAt) return false
  const d = new Date(sentAt)
  const hour = d.getHours()
  const day = d.getDay()
  const isWeekend = day === 0 || day === 6
  const start = isWeekend ? 9 : 8
  const end = isWeekend ? 20 : 22
  return hour >= start && hour <= end
}
