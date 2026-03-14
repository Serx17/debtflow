"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Вход в DebtFlow
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Нет аккаунта?{" "}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="font-medium text-slate-900 underline"
          >
            Зарегистрироваться
          </button>
        </p>
      </div>
    </div>
  )
}

