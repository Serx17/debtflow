"use client"

import { useEffect, useState, FormEvent } from "react"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"

type ChannelSettings = {
  id: string
  organization_id: string
  sms_enabled: boolean
  sms_cost: number | null
  email_enabled: boolean
  email_cost: number | null
  call_enabled: boolean
  call_cost_per_minute: number | null
}

export default function ChannelsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [smsEnabled, setSmsEnabled] = useState(false)
  const [smsCost, setSmsCost] = useState<string>("")
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [emailCost, setEmailCost] = useState<string>("")
  const [callEnabled, setCallEnabled] = useState(false)
  const [callCost, setCallCost] = useState<string>("")

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("channel_settings")
        .select("*")
        .eq("organization_id", DEMO_ORGANIZATION_ID)
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        setError(error.message)
      } else if (data) {
        const settings = data as ChannelSettings
        setSmsEnabled(settings.sms_enabled)
        setSmsCost(
          settings.sms_cost != null ? String(settings.sms_cost) : ""
        )
        setEmailEnabled(settings.email_enabled)
        setEmailCost(
          settings.email_cost != null ? String(settings.email_cost) : ""
        )
        setCallEnabled(settings.call_enabled)
        setCallCost(
          settings.call_cost_per_minute != null
            ? String(settings.call_cost_per_minute)
            : ""
        )
      }

      setLoading(false)
    }

    loadSettings()
  }, [])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      organization_id: DEMO_ORGANIZATION_ID,
      sms_enabled: smsEnabled,
      sms_cost: smsCost ? Number(smsCost.replace(",", ".")) : null,
      email_enabled: emailEnabled,
      email_cost: emailCost ? Number(emailCost.replace(",", ".")) : null,
      call_enabled: callEnabled,
      call_cost_per_minute: callCost
        ? Number(callCost.replace(",", "."))
        : null,
    }

    const { error } = await supabase
      .from("channel_settings")
      .upsert(payload, { onConflict: "organization_id" })

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Channels</h2>
        <p className="text-sm text-slate-600">
          Настройка доступных каналов и их стоимости. Используется для
          расчёта примерной цены кампаний.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Загружаем настройки…</p>
      ) : (
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-md border border-slate-200 bg-white p-5"
        >
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-slate-900">SMS</h3>
                <p className="text-xs text-slate-500">
                  Используется для кратких уведомлений о задолженности.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                Включено
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Стоимость за SMS (RUB)
              </label>
              <input
                type="text"
                value={smsCost}
                onChange={(e) => setSmsCost(e.target.value)}
                className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
                placeholder="например, 1.50"
              />
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Email</h3>
                <p className="text-xs text-slate-500">
                  Используется для развёрнутых писем с деталями долга.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                Включено
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Стоимость за email (RUB)
              </label>
              <input
                type="text"
                value={emailCost}
                onChange={(e) => setEmailCost(e.target.value)}
                className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
                placeholder="например, 0.20"
              />
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Call</h3>
                <p className="text-xs text-slate-500">
                  Для моделирования звонков оператора или робота.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={callEnabled}
                  onChange={(e) => setCallEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                Включено
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Стоимость за минуту звонка (RUB)
              </label>
              <input
                type="text"
                value={callCost}
                onChange={(e) => setCallCost(e.target.value)}
                className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
                placeholder="например, 5.00"
              />
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Сохраняем…" : "Сохранить настройки"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

