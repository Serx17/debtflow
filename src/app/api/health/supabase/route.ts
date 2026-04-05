import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Диагностика продакшена: видит ли сервер Vercel env и отвечает ли Supabase.
 * Не раскрывает секреты (только факт наличия и хост URL).
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ""

  let supabaseHttpStatus: number | null = null
  let fetchError: string | null = null
  /** Получили HTTP-ответ (сеть/TLS до Supabase есть), даже если не 2xx */
  let supabaseResponded = false

  if (url) {
    try {
      const healthUrl = `${url.replace(/\/$/, "")}/auth/v1/health`
      const res = await fetch(healthUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })
      supabaseHttpStatus = res.status
      supabaseResponded = true
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e)
    }
  }

  let urlHost: string | null = null
  try {
    if (url) urlHost = new URL(url).host
  } catch {
    urlHost = "invalid-url"
  }

  return NextResponse.json({
    env: {
      urlPresent: url.length > 0,
      keyPresent: key.length > 0,
      urlHost,
      urlLength: url.length,
      keyLength: key.length,
    },
    supabaseFromVercelServer: {
      responded: supabaseResponded,
      httpStatus: supabaseHttpStatus,
      fetchError,
    },
    hint:
      !url || !key
        ? "На Vercel не заданы NEXT_PUBLIC_* или пустые — проверьте Environment Variables для Production и сделайте Redeploy."
        : !supabaseResponded
          ? "Сервер Vercel не смог достучаться до Supabase (ошибка fetch). Проверьте URL и доступность проекта."
          : "Сервер Vercel достучался до Supabase. Если в браузере всё ещё Failed to fetch — смотрите Network (запрос к *.supabase.co), блокировщики и VPN.",
  })
}
