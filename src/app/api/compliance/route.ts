import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"
import {
  aggregateByDebtor,
  checkLimits,
  isEntryInAllowedWindow,
} from "@/lib/compliance"
import type { LogEntry } from "@/lib/compliance"

export interface ComplianceDebtorRow {
  debtorId: string
  fullName: string
  callDay: number
  callWeek: number
  callMonth: number
  smsDay: number
  smsWeek: number
  smsMonth: number
  violations: { channel: string; period: string; count: number; limit: number }[]
  outOfWindowCount: number
  compliant: boolean
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const organizationId =
    searchParams.get("organizationId") || DEMO_ORGANIZATION_ID
  const periodStartParam = searchParams.get("periodStart")
  const periodEndParam = searchParams.get("periodEnd")

  const now = new Date()
  const periodEnd = periodEndParam
    ? new Date(periodEndParam)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const periodStart = periodStartParam
    ? new Date(periodStartParam)
    : new Date(periodEnd)
  if (!periodStartParam) {
    periodStart.setDate(periodStart.getDate() - 30)
    periodStart.setHours(0, 0, 0, 0)
  }

  if (periodStart.getTime() > periodEnd.getTime()) {
    return NextResponse.json(
      { error: "periodStart должен быть раньше periodEnd" },
      { status: 400 }
    )
  }

  const { data: logData, error: logError } = await supabase
    .from("communication_log")
    .select("debtor_id, channel, sent_at")
    .eq("organization_id", organizationId)
    .not("sent_at", "is", null)
    .gte("sent_at", periodStart.toISOString())
    .lte("sent_at", periodEnd.toISOString())

  if (logError) {
    return NextResponse.json(
      { error: "Ошибка загрузки лога: " + logError.message },
      { status: 500 }
    )
  }

  const entries: LogEntry[] = (logData ?? []).map((r: { debtor_id: string; channel: string; sent_at: string | null }) => ({
    debtor_id: r.debtor_id,
    channel: r.channel as "sms" | "email" | "call",
    sent_at: r.sent_at,
  }))

  const aggregated = aggregateByDebtor(entries, periodStart, periodEnd)

  const debtorIds = Array.from(aggregated.keys())
  if (debtorIds.length === 0) {
    return NextResponse.json({
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      debtors: [],
    })
  }

  const { data: debtorsData, error: debtorsError } = await supabase
    .from("debtors")
    .select("id, full_name")
    .in("id", debtorIds)
    .eq("organization_id", organizationId)

  if (debtorsError) {
    return NextResponse.json(
      { error: "Ошибка загрузки должников: " + debtorsError.message },
      { status: 500 }
    )
  }

  const debtorNames = new Map(
    (debtorsData ?? []).map((d: { id: string; full_name: string }) => [
      d.id,
      d.full_name,
    ])
  )

  const outOfWindowByDebtor = new Map<string, number>()
  for (const row of entries) {
    if ((row.channel === "call" || row.channel === "sms") && row.sent_at) {
      if (!isEntryInAllowedWindow(row.sent_at)) {
        outOfWindowByDebtor.set(
          row.debtor_id,
          (outOfWindowByDebtor.get(row.debtor_id) ?? 0) + 1
        )
      }
    }
  }

  const debtors: ComplianceDebtorRow[] = debtorIds.map((debtorId) => {
    const counts = aggregated.get(debtorId)!
    const violations = checkLimits(counts)
    const outOfWindowCount = outOfWindowByDebtor.get(debtorId) ?? 0
    return {
      debtorId,
      fullName: debtorNames.get(debtorId) ?? "—",
      callDay: counts.call.day,
      callWeek: counts.call.week,
      callMonth: counts.call.month,
      smsDay: counts.sms.day,
      smsWeek: counts.sms.week,
      smsMonth: counts.sms.month,
      violations: violations.map((v) => ({
        channel: v.channel,
        period: v.period,
        count: v.count,
        limit: v.limit,
      })),
      outOfWindowCount,
      compliant: violations.length === 0 && outOfWindowCount === 0,
    }
  })

  return NextResponse.json({
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    debtors,
  })
}
