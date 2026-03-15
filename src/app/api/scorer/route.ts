import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"
import {
  extractFeatures,
  trainSynthetic,
  predict,
  scoreToSegment,
  segmentToChannel,
} from "@/lib/scorer"
import type { DebtorRow, Segment } from "@/lib/scorer"

export type ScorerDebtorRow = {
  debtorId: string
  fullName: string
  debtAmount: number
  region: string | null
  score: number
  segment: string
  recommendedChannel: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const organizationId =
    searchParams.get("organizationId") || DEMO_ORGANIZATION_ID

  const { data: debtorsData, error } = await supabase
    .from("debtors")
    .select("id, full_name, debt_amount, region")
    .eq("organization_id", organizationId)
    .order("full_name")

  if (error) {
    return NextResponse.json(
      { error: "Ошибка загрузки должников: " + error.message },
      { status: 500 }
    )
  }

  const debtors = (debtorsData ?? []) as (DebtorRow & { full_name: string })[]
  if (debtors.length === 0) {
    return NextResponse.json({ debtors: [] })
  }

  const coef = trainSynthetic()
  const HIGH_DEBT_THRESHOLD = 250_000
  const rows: ScorerDebtorRow[] = debtors.map((d) => {
    const features = extractFeatures(d)
    const score = predict(coef, features)
    const debtAmount = Number(d.debt_amount)
    const segment: Segment =
      debtAmount >= HIGH_DEBT_THRESHOLD
        ? "судебное взыскание"
        : scoreToSegment(score)
    const recommendedChannel = segmentToChannel(segment)
    return {
      debtorId: d.id,
      fullName: d.full_name,
      debtAmount,
      region: d.region,
      score: Math.round(score * 10000) / 10000,
      segment,
      recommendedChannel,
    }
  })

  return NextResponse.json({ debtors: rows })
}
