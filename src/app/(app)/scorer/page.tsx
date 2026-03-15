"use client"

import { useEffect, useState } from "react"

type ScorerRow = {
  debtorId: string
  fullName: string
  debtAmount: number
  region: string | null
  score: number
  segment: string
  recommendedChannel: string
}

export default function ScorerPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debtors, setDebtors] = useState<ScorerRow[]>([])
  const [segmentFilter, setSegmentFilter] = useState<string>("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/scorer")
        if (!res.ok) {
          setError("Ошибка загрузки")
          setDebtors([])
          return
        }
        const data = await res.json()
        setDebtors(data.debtors ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка")
        setDebtors([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const segments = Array.from(
    new Set(debtors.map((d) => d.segment))
  ).sort()
  const filtered =
    segmentFilter === ""
      ? debtors
      : debtors.filter((d) => d.segment === segmentFilter)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Pre-Collection Scorer
        </h2>
        <p className="text-sm text-slate-600">
          Скоринг должников по вероятности возврата (модель на синтетических данных). Сегмент и рекомендуемый канал для кампаний.
        </p>
      </div>

      {segments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Сегмент:</span>
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Все</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Загрузка…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-600">
          Нет должников. Добавьте должников или выполните seed на /admin/seed.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Должник</th>
                <th className="px-3 py-2 text-right">Сумма долга</th>
                <th className="px-3 py-2">Регион</th>
                <th className="px-3 py-2 text-right">Скор</th>
                <th className="px-3 py-2">Сегмент</th>
                <th className="px-3 py-2">Канал</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.debtorId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {d.fullName}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {d.debtAmount.toLocaleString("ru-RU")} ₽
                  </td>
                  <td className="px-3 py-2 text-slate-700">{d.region ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {d.score.toFixed(4)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{d.segment}</td>
                  <td className="px-3 py-2 uppercase text-slate-700">
                    {d.recommendedChannel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-slate-500">
          Запустить кампанию по выбранному сегменту: отфильтруйте таблицу и перейдите в Communications → New, выберите нужных должников.
        </p>
      )}
    </div>
  )
}
