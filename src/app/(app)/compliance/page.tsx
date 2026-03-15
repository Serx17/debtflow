"use client"

import { useEffect, useState } from "react"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"

type ComplianceDebtorRow = {
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

type ApiResponse = {
  periodStart: string
  periodEnd: string
  debtors: ComplianceDebtorRow[]
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function CompliancePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")

  useEffect(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - 30)
    setPeriodEnd(end.toISOString().slice(0, 10))
    setPeriodStart(start.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    if (!periodStart || !periodEnd) return

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          organizationId: DEMO_ORGANIZATION_ID,
          periodStart: new Date(periodStart + "T00:00:00").toISOString(),
          periodEnd: new Date(periodEnd + "T23:59:59").toISOString(),
        })
        const res = await fetch(`/api/compliance?${params}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setError(err.error || res.statusText)
          setData(null)
          return
        }
        const json: ApiResponse = await res.json()
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки")
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [periodStart, periodEnd])

  function exportCsv() {
    if (!data) return
    const headers = [
      "Организация",
      "Период с",
      "Период по",
      "Должник",
      "ID должника",
      "Звонков (день макс)",
      "Звонков (неделя макс)",
      "Звонков (всего)",
      "SMS (день макс)",
      "SMS (неделя макс)",
      "SMS (всего)",
      "Вне разрешённого времени",
      "Соответствие 230-ФЗ",
    ]
    const rows = data.debtors.map((d) => [
      "DebtFlow Demo",
      formatDate(data.periodStart),
      formatDate(data.periodEnd),
      d.fullName,
      d.debtorId,
      d.callDay,
      d.callWeek,
      d.callMonth,
      d.smsDay,
      d.smsWeek,
      d.smsMonth,
      d.outOfWindowCount,
      d.compliant ? "Да" : "Нет",
    ])
    const csv =
      headers.join(";") +
      "\n" +
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `compliance-230-fz-${periodStart}-${periodEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Соответствие 230‑ФЗ
          </h2>
          <p className="text-sm text-slate-600">
            Контроль лимитов контактов (звонки 1/2/8, SMS 2/4/16 в день/неделю/месяц) и времени (будни 8–22, выходные 9–20).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Период с</span>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">по</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        {data && (
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Экспорт для отчётности (CSV)
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Загрузка…</p>
      ) : data && data.debtors.length === 0 ? (
        <p className="text-sm text-slate-600">
          За выбранный период нет контактов по должникам (звонки/SMS). Запустите кампании и повторите проверку.
        </p>
      ) : data && data.debtors.length > 0 ? (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Должник</th>
                <th className="px-3 py-2 text-right">Звонки (д/н/м)</th>
                <th className="px-3 py-2 text-right">SMS (д/н/м)</th>
                <th className="px-3 py-2 text-right">Вне окна</th>
                <th className="px-3 py-2">230‑ФЗ</th>
              </tr>
            </thead>
            <tbody>
              {data.debtors.map((d) => (
                <tr key={d.debtorId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {d.fullName}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {d.callDay} / {d.callWeek} / {d.callMonth}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {d.smsDay} / {d.smsWeek} / {d.smsMonth}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {d.outOfWindowCount > 0 ? (
                      <span className="text-amber-700">{d.outOfWindowCount}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {d.compliant ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        Соблюдено
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Нарушения
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
