"use client"

import { ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

interface Props {
  children: ReactNode
}

export default function AppLayout({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      const { data, error } = await supabase.auth.getUser()

      if (!isMounted) return

      if (error || !data.user) {
        router.replace("/login")
        return
      }

      setUserEmail(data.user.email ?? null)
      setChecking(false)
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [router, pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Загружаем рабочее пространство…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
        <div className="mb-8">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            DebtFlow
          </span>
          <span className="block text-sm text-slate-900">
            Конструктор коммуникаций
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => router.push("/debtors")}
            className="rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
          >
            Debtors
          </button>
          <button
            type="button"
            onClick={() => router.push("/templates")}
            className="rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => router.push("/communications")}
            className="rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
          >
            Communications
          </button>
          <button
            type="button"
            onClick={() => router.push("/channels")}
            className="rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100"
          >
            Settings
          </button>
        </nav>
        <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
          {userEmail && <div className="mb-2 truncate">{userEmail}</div>}
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-slate-700 underline"
          >
            Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <h1 className="text-sm font-medium text-slate-900">
            DebtFlow · рабочая область
          </h1>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}

