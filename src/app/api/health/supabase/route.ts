import dns from "node:dns/promises"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function collectErrCodes(err: unknown): string[] {
  const codes: string[] = []
  let cur: unknown = err
  for (let i = 0; i < 6 && cur; i++) {
    if (cur instanceof Error) {
      const c = (cur as NodeJS.ErrnoException).code
      if (typeof c === "string" && c.length > 0) codes.push(c)
      cur = cur.cause
    } else {
      break
    }
  }
  return codes
}

/**
 * Диагностика продакшена: видит ли сервер Vercel env и отвечает ли Supabase.
 * Не раскрывает секреты (только факт наличия и хост URL).
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ""

  let urlHost: string | null = null
  try {
    if (url) urlHost = new URL(url).host
  } catch {
    urlHost = "invalid-url"
  }

  let dnsIpv4: string | null = null
  let dnsError: string | null = null
  if (urlHost && urlHost !== "invalid-url") {
    try {
      const r = await dns.lookup(urlHost, { family: 4 })
      dnsIpv4 = r.address
    } catch (e) {
      dnsError = e instanceof Error ? e.message : String(e)
    }
  }

  let supabaseHttpStatus: number | null = null
  let fetchError: string | null = null
  let fetchErrCodes: string[] = []
  /** Получили HTTP-ответ (сеть/TLS до Supabase есть), даже если не 2xx */
  let supabaseResponded = false

  if (url) {
    try {
      const base = url.replace(/\/$/, "")
      const healthUrl = `${base}/auth/v1/health`
      const res = await fetch(healthUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: key
          ? { apikey: key, Authorization: `Bearer ${key}` }
          : undefined,
      })
      supabaseHttpStatus = res.status
      supabaseResponded = true
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e)
      fetchErrCodes = collectErrCodes(e)
    }
  }

  const hint = (() => {
    if (!url || !key) {
      return "На Vercel не заданы NEXT_PUBLIC_* или пустые — проверьте Environment Variables для Production и сделайте Redeploy."
    }
    if (dnsError) {
      return "DNS с Vercel не резолвит хост из NEXT_PUBLIC_SUPABASE_URL (опечатка в ref, неверный URL или проблема DNS)."
    }
    if (!supabaseResponded && fetchErrCodes.includes("ENOTFOUND")) {
      return "ENOTFOUND: имя хоста не найдено — сравните URL с Supabase Dashboard → Settings → API (Project URL)."
    }
    if (!supabaseResponded && fetchErrCodes.some((c) => c === "ETIMEDOUT" || c === "UND_ERR_CONNECT_TIMEOUT")) {
      return "Таймаут соединения до Supabase: провайдер/регион, файрвол или ограничения сети (в т.ч. Network Restrictions в Supabase, если включали)."
    }
    if (!supabaseResponded) {
      return "Сервер Vercel не установил TLS/HTTP-сессию с Supabase. Проверьте, что проект Supabase не на паузе; при включённых сетевых ограничениях Supabase разрешите исходящие запросы с Vercel или отключите ограничение для API."
    }
    return "Сервер Vercel достучался до Supabase. Если в браузере всё ещё Failed to fetch — смотрите Network (запрос к *.supabase.co), блокировщики и VPN."
  })()

  return NextResponse.json({
    env: {
      urlPresent: url.length > 0,
      keyPresent: key.length > 0,
      urlHost,
      urlLength: url.length,
      keyLength: key.length,
    },
    dnsFromVercelServer: {
      ok: dnsError == null && dnsIpv4 != null,
      ipv4: dnsIpv4,
      error: dnsError,
    },
    supabaseFromVercelServer: {
      responded: supabaseResponded,
      httpStatus: supabaseHttpStatus,
      fetchError,
      errnoCodes: fetchErrCodes,
    },
    hint,
  })
}
