import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"

type ParsedRow = {
  full_name: string
  phone?: string
  email?: string
  debt_amount?: number
  region?: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || !Array.isArray(body.rows)) {
      return NextResponse.json(
        { error: "Некорректный формат данных. Ожидается { rows: [...] }." },
        { status: 400 }
      )
    }

    const rows = (body.rows as ParsedRow[]).filter(
      (row) => row && typeof row.full_name === "string" && row.full_name.trim()
    )

    if (!rows.length) {
      return NextResponse.json(
        { error: "Нет строк для импорта." },
        { status: 400 }
      )
    }

    const payload = rows.map((row) => ({
      organization_id: DEMO_ORGANIZATION_ID,
      full_name: row.full_name.trim(),
      phone: row.phone ?? null,
      email: row.email ?? null,
      debt_amount: row.debt_amount ?? 0,
      region: row.region ?? null,
    }))

    const { error } = await supabase.from("debtors").insert(payload)

    if (error) {
      return NextResponse.json(
        { error: `Ошибка Supabase: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: "Импорт выполнен успешно.", count: payload.length },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { error: "Неожиданная ошибка при импорте." },
      { status: 500 }
    )
  }
}

