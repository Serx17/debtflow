"use client"

import { useState, FormEvent } from "react"

export default function AdminSeedPage() {
  const [secret, setSecret] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSeed(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const response = await fetch("/api/admin/seed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-seed-secret": secret,
      },
    })

    const body = await response.json().catch(() => null)
    setLoading(false)

    if (!response.ok) {
      setError(body?.error ?? "Ошибка при запуске seed-скрипта.")
      return
    }

    setMessage(body?.message ?? "Демо-данные успешно загружены.")
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Admin · Seed demo data
        </h2>
        <p className="text-sm text-slate-600">
          Страница для заполнения базы демонстрационными данными (должники,
          шаблоны, лог коммуникаций). Защищена секретом SEED_SECRET.
        </p>
      </div>

      <form
        onSubmit={handleSeed}
        className="space-y-4 rounded-md border border-slate-200 bg-white p-5"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Секретный ключ
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
            placeholder="Введите значение SEED_SECRET"
          />
          <p className="mt-1 text-xs text-slate-500">
            Значение ключа задаётся в переменной окружения SEED_SECRET (на
            локальной машине и в Vercel).
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-green-700" role="status">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Запускаем seed…" : "Заполнить демо-данными"}
        </button>
      </form>
    </div>
  )
}

