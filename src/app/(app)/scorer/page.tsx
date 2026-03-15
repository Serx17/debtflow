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

  const allSegments = [
    "мягкое напоминание",
    "активная работа",
    "судебное взыскание",
  ]
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

      <section
        aria-label="О модели машинного обучения"
        className="rounded-lg border-2 border-slate-300 bg-slate-100 p-4 text-sm text-slate-800 shadow-sm"
      >
        <h3 className="mb-3 text-base font-semibold text-slate-900">
          О модели машинного обучения
        </h3>
        <div className="space-y-2">
          <p>
            <strong>Модель:</strong> логистическая регрессия. Предсказывает вероятность возврата долга (0–1) по признакам должника.
          </p>
          <p>
            <strong>Признаки (фичи):</strong> нормализованная сумма долга (к порогу 500 тыс. ₽), регион (кодированный). Чем выше долг — тем ниже скор; регион влияет на веса модели.
          </p>
          <p>
            <strong>Обучение:</strong> на синтетических данных (низкий долг и «хороший» регион → метка 1, высокий долг → 0). Градиентный спуск, 200 эпох. Коэффициенты сохраняются в памяти при каждом запросе.
          </p>
          <p>
            <strong>Сегменты:</strong> по порогам скора — «мягкое напоминание» (≥0,6), «активная работа» (0,4–0,6), «судебное взыскание» (&lt;0,4). При долге ≥250 тыс. ₽ назначается сегмент «судебное взыскание». Рекомендуемый канал: SMS / Email / Call.
          </p>
        </div>
      </section>

      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600">Сегмент:</span>
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">Все</option>
            {allSegments.map((s) => (
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
          {debtors.length === 0
            ? "Нет должников. Добавьте должников или выполните seed на /admin/seed."
            : "В выбранном сегменте нет должников. Выберите другой сегмент или выполните seed (должники с долгом ≥250 тыс. ₽ попадут в «судебное взыскание»)."}
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
