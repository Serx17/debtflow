"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"

type LogEntry = {
  id: string
  channel: string
  status: "pending" | "sent" | "failed"
  cost: number | null
  sent_at: string | null
  created_at: string
}

type Point = {
  date: string
  count: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("communication_log")
        .select("id, channel, status, cost, sent_at, created_at")
        .eq("organization_id", DEMO_ORGANIZATION_ID)
        .order("created_at", { ascending: false })
        .limit(500)

      if (error) {
        setError(error.message)
      } else {
        setLogs((data as LogEntry[]) ?? [])
      }

      setLoading(false)
    }

    load()
  }, [])

  const totalMessages = logs.length
  const successCount = logs.filter((l) => l.status === "sent").length
  const failedCount = logs.filter((l) => l.status === "failed").length
  const totalCost = logs.reduce((sum, l) => sum + (l.cost ?? 0), 0)
  const successRate =
    totalMessages > 0 ? Math.round((successCount / totalMessages) * 100) : 0

  const byDateMap = new Map<string, number>()
  logs.forEach((log) => {
    const source = log.sent_at ?? log.created_at
    const dateKey = new Date(source).toISOString().slice(0, 10)
    byDateMap.set(dateKey, (byDateMap.get(dateKey) ?? 0) + 1)
  })

  const timeseries: Point[] = Array.from(byDateMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }))

  const recent = logs.slice(0, 10)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-600">
          Сводка по всем коммуникациям: объёмы, успешность и стоимость.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">
          Загружаем данные по коммуникациям…
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Всего сообщений
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {totalMessages}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Успешность
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {successRate}%
              </p>
              <p className="text-xs text-slate-500">
                {successCount} sent / {failedCount} failed
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Общая стоимость
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {totalCost.toLocaleString("ru-RU", {
                  style: "currency",
                  currency: "RUB",
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Дней активности
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {timeseries.length}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-white p-4 md:col-span-2">
              <h3 className="mb-2 text-sm font-medium text-slate-900">
                Динамика отправок по дням
              </h3>
              {timeseries.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Пока нет данных для построения графика.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeseries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickMargin={8}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        tickMargin={8}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#0f172a"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-medium text-slate-900">
                Недавние коммуникации
              </h3>
              {recent.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Нет недавних отправок.
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {recent.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-700">
                          {log.channel}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            log.status === "sent"
                              ? "text-green-700"
                              : log.status === "failed"
                              ? "text-red-700"
                              : "text-slate-700"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500">
                          {(
                            log.sent_at ?? log.created_at
                          ).toString()}
                        </p>
                        {log.cost != null && (
                          <p className="text-[11px] text-slate-700">
                            {log.cost.toLocaleString("ru-RU", {
                              style: "currency",
                              currency: "RUB",
                            })}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


