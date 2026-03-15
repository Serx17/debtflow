"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"
import { mockSend, type Channel, type MockSendResult } from "@/lib/mockSend"

type Debtor = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  debt_amount: number
  region: string | null
}

type Template = {
  id: string
  name: string
  channel: Channel
  subject: string | null
  body: string
}

type ChannelSettings = {
  sms_enabled: boolean
  sms_cost: number | null
  email_enabled: boolean
  email_cost: number | null
  call_enabled: boolean
  call_cost_per_minute: number | null
}

type Step = 1 | 2 | 3

export default function NewCommunicationPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)

  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [settings, setSettings] = useState<ChannelSettings | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedDebtorIds, setSelectedDebtorIds] = useState<string[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  )

  const [filterRegion, setFilterRegion] = useState("")
  const [filterMinDebt, setFilterMinDebt] = useState("")

  const [sending, setSending] = useState(false)
  const [progressText, setProgressText] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      const [debtorsResult, templatesResult, settingsResult] =
        await Promise.all([
          supabase
            .from("debtors")
            .select("*")
            .eq("organization_id", DEMO_ORGANIZATION_ID),
          supabase
            .from("templates")
            .select("*")
            .eq("organization_id", DEMO_ORGANIZATION_ID),
          supabase
            .from("channel_settings")
            .select("*")
            .eq("organization_id", DEMO_ORGANIZATION_ID)
            .maybeSingle(),
        ])

      if (debtorsResult.error) {
        setError(debtorsResult.error.message)
      } else {
        setDebtors((debtorsResult.data as Debtor[]) ?? [])
      }

      if (templatesResult.error) {
        setError((prev) => prev ?? templatesResult.error!.message)
      } else {
        setTemplates((templatesResult.data as Template[]) ?? [])
      }

      if (!settingsResult.error && settingsResult.data) {
        const data = settingsResult.data as ChannelSettings & { id: string }
        setSettings({
          sms_enabled: data.sms_enabled,
          sms_cost: data.sms_cost,
          email_enabled: data.email_enabled,
          email_cost: data.email_cost,
          call_enabled: data.call_enabled,
          call_cost_per_minute: data.call_cost_per_minute,
        })
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const filteredDebtors = debtors.filter((debtor) => {
    if (filterRegion && debtor.region) {
      if (!debtor.region.toLowerCase().includes(filterRegion.toLowerCase())) {
        return false
      }
    }

    if (filterMinDebt) {
      const threshold = Number(filterMinDebt.replace(",", "."))
      if (!Number.isNaN(threshold) && debtor.debt_amount < threshold) {
        return false
      }
    }

    return true
  })

  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId
  )

  function toggleDebtorSelection(id: string) {
    setSelectedDebtorIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    )
  }

  function goToNextStep() {
    if (step === 1 && !selectedDebtorIds.length) return
    if (step === 2 && !selectedTemplate) return
    setStep((prev) => (prev === 3 ? 3 : ((prev + 1) as Step)))
  }

  function goToPrevStep() {
    setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as Step)))
  }

  function computeEstimatedCost(): number | null {
    if (!selectedTemplate || !settings) return null
    const count = selectedDebtorIds.length || 0
    if (!count) return null

    let unitCost = 0
    if (selectedTemplate.channel === "sms") {
      unitCost = settings.sms_cost ?? 0
    } else if (selectedTemplate.channel === "email") {
      unitCost = settings.email_cost ?? 0
    } else if (selectedTemplate.channel === "call") {
      unitCost = settings.call_cost_per_minute ?? 0
    }

    return unitCost * count
  }

  async function handleSend() {
    if (!selectedTemplate || !settings) return

    setSending(true)
    setProgressText("Инициализируем отправку…")

    const selectedDebtors = debtors.filter((d) =>
      selectedDebtorIds.includes(d.id)
    )

    let sentCount = 0
    const total = selectedDebtors.length

    for (const debtor of selectedDebtors) {
      const result: MockSendResult = await mockSend(
        selectedTemplate.channel,
        { id: debtor.id, full_name: debtor.full_name },
        { id: selectedTemplate.id, channel: selectedTemplate.channel },
        settings
      )

      await supabase.from("communication_log").insert({
        organization_id: DEMO_ORGANIZATION_ID,
        debtor_id: debtor.id,
        channel: selectedTemplate.channel,
        template_id: selectedTemplate.id,
        status: result.status,
        cost: result.cost,
        sent_at: new Date().toISOString(),
      })

      sentCount += 1
      setProgressText(`Отправлено ${sentCount} из ${total}…`)
    }

    setProgressText("Отправка завершена.")
    setSending(false)

    router.push("/communications")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Новая коммуникация
          </h2>
          <p className="text-sm text-slate-600">
            3 шага: выбор должников, выбор шаблона и подтверждение отправки.
          </p>
        </div>
        <div className="text-xs text-slate-600">
          Шаг {step} из 3
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">
          Загружаем должников, шаблоны и настройки каналов…
        </p>
      ) : (
        <>
          {step === 1 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-900">
                Шаг 1 · Выбор должников
              </h3>
              <div className="flex flex-wrap gap-3 text-xs">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-700">
                    Регион
                  </label>
                  <input
                    type="text"
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                    className="w-40 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none ring-slate-200 focus:ring-2"
                    placeholder="например, Москва"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-700">
                    Мин. сумма долга (RUB)
                  </label>
                  <input
                    type="text"
                    value={filterMinDebt}
                    onChange={(e) => setFilterMinDebt(e.target.value)}
                    className="w-40 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none ring-slate-200 focus:ring-2"
                    placeholder="например, 10000"
                  />
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={
                            filteredDebtors.length > 0 &&
                            filteredDebtors.every((d) =>
                              selectedDebtorIds.includes(d.id)
                            )
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDebtorIds(
                                filteredDebtors.map((d) => d.id)
                              )
                            } else {
                              setSelectedDebtorIds([])
                            }
                          }}
                        />
                      </th>
                      <th className="px-3 py-2">Имя</th>
                      <th className="px-3 py-2">Телефон</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2 text-right">Сумма долга</th>
                      <th className="px-3 py-2">Регион</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDebtors.map((debtor) => (
                      <tr
                        key={debtor.id}
                        className="border-t border-slate-100"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedDebtorIds.includes(debtor.id)}
                            onChange={() => toggleDebtorSelection(debtor.id)}
                          />
                        </td>
                        <td className="px-3 py-2">{debtor.full_name}</td>
                        <td className="px-3 py-2">
                          {debtor.phone ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {debtor.email ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {debtor.debt_amount.toLocaleString("ru-RU", {
                            style: "currency",
                            currency: "RUB",
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2">
                          {debtor.region ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-600">
                Выбрано должников: {selectedDebtorIds.length}
              </p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-900">
                Шаг 2 · Выбор шаблона
              </h3>
              {templates.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Нет доступных шаблонов. Сначала создайте шаблон на странице
                  Templates.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {templates.map((template) => {
                    const selected = template.id === selectedTemplateId
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`rounded-lg border px-4 py-3 text-left text-sm ${
                          selected
                            ? "border-slate-900 bg-slate-900/5"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">
                            {template.name}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-600">
                            {template.channel === "sms"
                              ? "SMS"
                              : template.channel === "email"
                                ? "Email"
                                : "Call"}
                          </span>
                        </div>
                        {template.subject && (
                          <p className="mb-1 text-xs text-slate-600">
                            {template.subject}
                          </p>
                        )}
                        <p className="line-clamp-2 text-xs text-slate-500">
                          {template.body}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-slate-900">
                Шаг 3 · Обзор и отправка
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-md border border-slate-200 bg-white p-4 text-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Итоги кампании
                  </h4>
                  <p className="flex justify-between">
                    <span className="text-slate-600">Получателей</span>
                    <span className="font-medium text-slate-900">
                      {selectedDebtorIds.length}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-600">Канал</span>
                    <span className="font-medium text-slate-900">
                      {selectedTemplate
                        ? selectedTemplate.channel.toUpperCase()
                        : "—"}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-600">Оценочная стоимость</span>
                    <span className="font-medium text-slate-900">
                      {(() => {
                        const total = computeEstimatedCost()
                        return total != null
                          ? total.toLocaleString("ru-RU", {
                              style: "currency",
                              currency: "RUB",
                              maximumFractionDigits: 2,
                            })
                          : "—"
                      })()}
                    </span>
                  </p>
                </div>
                <div className="space-y-2 rounded-md border border-slate-200 bg-white p-4 text-sm">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Превью сообщения
                  </h4>
                  {selectedTemplate ? (
                    <>
                      {selectedTemplate.subject && (
                        <p className="mb-2 text-xs font-medium text-slate-700">
                          Subject: {selectedTemplate.subject}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-sm text-slate-800">
                        {selectedTemplate.body}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Шаблон не выбран.
                    </p>
                  )}
                </div>
              </div>
              {progressText && (
                <p className="text-xs text-slate-600">{progressText}</p>
              )}
            </section>
          )}

          <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm">
            <button
              type="button"
              onClick={goToPrevStep}
              disabled={step === 1 || sending}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Назад
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={
                  sending ||
                  (step === 1 && !selectedDebtorIds.length) ||
                  (step === 2 && !selectedTemplate)
                }
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                Далее
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !selectedDebtorIds.length || !selectedTemplate}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {sending ? "Отправляем…" : "Отправить сейчас"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

