import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"

type LogEntry = {
  id: string
  channel: string
  status: string
  cost: number | null
  sent_at: string | null
  created_at: string
}

export default async function CommunicationsPage() {
  const { data, error } = await supabase
    .from("communication_log")
    .select("id, channel, status, cost, sent_at, created_at")
    .eq("organization_id", DEMO_ORGANIZATION_ID)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">
          Communications log
        </h2>
        <p className="text-sm text-red-600">
          Ошибка при загрузке лога: {error.message}
        </p>
      </div>
    )
  }

  const logs = (data as LogEntry[]) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Communications log
          </h2>
          <p className="text-sm text-slate-600">
            Последние отправленные сообщения по всем каналам.
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-slate-600">
          Пока нет данных. Запустите первую кампанию на странице
          Communications → New.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Канал</th>
                <th className="px-3 py-2">Статус</th>
                <th className="px-3 py-2 text-right">Стоимость</th>
                <th className="px-3 py-2">Отправлено</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 uppercase">{log.channel}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        log.status === "sent"
                          ? "bg-green-50 text-green-700"
                          : log.status === "failed"
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {log.cost != null
                      ? log.cost.toLocaleString("ru-RU", {
                          style: "currency",
                          currency: "RUB",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {log.sent_at
                      ? new Date(log.sent_at).toLocaleString("ru-RU")
                      : new Date(log.created_at).toLocaleString("ru-RU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

