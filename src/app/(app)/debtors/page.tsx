"use client"

import { useEffect, useState, DragEvent, FormEvent } from "react"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"

type Debtor = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  debt_amount: number
  region: string | null
  created_at: string
}

type ParsedRow = {
  full_name: string
  phone?: string
  email?: string
  debt_amount?: number
  region?: string
}

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [importOpen, setImportOpen] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadDebtors() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("debtors")
        .select("*")
        .eq("organization_id", DEMO_ORGANIZATION_ID)
        .order("created_at", { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setDebtors((data as Debtor[]) ?? [])
      }

      setLoading(false)
    }

    loadDebtors()
  }, [])

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      readCsvFile(file)
    }
  }

  function handleFileChange(event: FormEvent<HTMLInputElement>) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      readCsvFile(file)
    }
  }

  function readCsvFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      const rows = parseCsv(text)
      setParsedRows(rows)
      setImportMessage(null)
    }
    reader.readAsText(file, "utf-8")
  }

  function parseCsv(text: string): ParsedRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length < 2) return []

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase())

    const idxName = header.indexOf("full_name")
    const idxPhone = header.indexOf("phone")
    const idxEmail = header.indexOf("email")
    const idxAmount = header.indexOf("debt_amount")
    const idxRegion = header.indexOf("region")

    const result: ParsedRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim())
      const row: ParsedRow = {
        full_name: idxName >= 0 ? cols[idxName] ?? "" : "",
      }

      if (!row.full_name) continue

      if (idxPhone >= 0) row.phone = cols[idxPhone] || undefined
      if (idxEmail >= 0) row.email = cols[idxEmail] || undefined

      if (idxAmount >= 0) {
        const value = Number(cols[idxAmount]?.replace(",", "."))
        if (!Number.isNaN(value)) {
          row.debt_amount = value
        }
      }

      if (idxRegion >= 0) row.region = cols[idxRegion] || undefined

      result.push(row)
    }

    return result
  }

  async function handleConfirmImport() {
    if (!parsedRows.length) {
      setImportMessage("Нет данных для импорта.")
      return
    }

    setImporting(true)
    setImportMessage(null)

    const response = await fetch("/api/debtors/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parsedRows }),
    })

    setImporting(false)

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setImportMessage(
        body?.error ?? "Ошибка при импорте. Попробуйте ещё раз позже."
      )
      return
    }

    setImportMessage("Импорт выполнен успешно.")
    setImportOpen(false)
    setParsedRows([])

    const { data, error } = await supabase
      .from("debtors")
      .select("*")
      .eq("organization_id", DEMO_ORGANIZATION_ID)
      .order("created_at", { ascending: false })

    if (!error) {
      setDebtors((data as Debtor[]) ?? [])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Debtors</h2>
          <p className="text-sm text-slate-600">
            Список должников для коммуникаций. Загрузите CSV или просматривайте
            уже загруженные данные.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Import CSV
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Загружаем список должников…</p>
      ) : debtors.length === 0 ? (
        <p className="text-sm text-slate-600">
          Пока нет данных. Загрузите CSV-файл с колонками: full_name, phone,
          email, debt_amount, region.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Имя</th>
                <th className="px-3 py-2">Телефон</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2 text-right">Сумма долга</th>
                <th className="px-3 py-2">Регион</th>
                <th className="px-3 py-2">Создан</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map((debtor) => (
                <tr key={debtor.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{debtor.full_name}</td>
                  <td className="px-3 py-2">{debtor.phone ?? "—"}</td>
                  <td className="px-3 py-2">{debtor.email ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {debtor.debt_amount.toLocaleString("ru-RU", {
                      style: "currency",
                      currency: "RUB",
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2">{debtor.region ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(debtor.created_at).toLocaleString("ru-RU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Импорт должников из CSV
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              Ожидаемые колонки в заголовке:{" "}
              <code>full_name, phone, email, debt_amount, region</code>.
            </p>
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="mb-3 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600"
            >
              <p className="mb-1 font-medium">
                Перетащите файл сюда или выберите вручную
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Поддерживается только формат CSV
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="text-xs"
              />
            </div>

            {parsedRows.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-xs text-slate-500">
                  Предпросмотр первых записей ({parsedRows.length} всего):
                </p>
                <div className="max-h-40 overflow-auto rounded-md border border-slate-200 bg-slate-50">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-2 py-1">Имя</th>
                        <th className="px-2 py-1">Телефон</th>
                        <th className="px-2 py-1">Email</th>
                        <th className="px-2 py-1">Сумма</th>
                        <th className="px-2 py-1">Регион</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-2 py-1">{row.full_name}</td>
                          <td className="px-2 py-1">{row.phone ?? "—"}</td>
                          <td className="px-2 py-1">{row.email ?? "—"}</td>
                          <td className="px-2 py-1">
                            {row.debt_amount ?? "—"}
                          </td>
                          <td className="px-2 py-1">{row.region ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importMessage && (
              <p className="mb-2 text-sm text-red-600" role="alert">
                {importMessage}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportOpen(false)
                  setParsedRows([])
                  setImportMessage(null)
                }}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={importing || parsedRows.length === 0}
                onClick={handleConfirmImport}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {importing ? "Импортируем…" : "Импортировать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

