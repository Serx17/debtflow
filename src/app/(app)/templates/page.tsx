"use client"

import { useEffect, useState, FormEvent } from "react"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"

type Template = {
  id: string
  organization_id: string
  name: string
  channel: "sms" | "email"
  subject: string | null
  body: string
  created_at: string
  updated_at: string
}

type ChannelType = "sms" | "email"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [channel, setChannel] = useState<ChannelType>("sms")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null)

  useEffect(() => {
    async function loadTemplates() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("organization_id", DEMO_ORGANIZATION_ID)
        .order("updated_at", { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setTemplates((data as Template[]) ?? [])
      }

      setLoading(false)
    }

    loadTemplates()
  }, [])

  function openNewTemplate() {
    setEditingId(null)
    setName("")
    setChannel("sms")
    setSubject("")
    setBody("")
    setEditorOpen(true)
  }

  function openEditTemplate(template: Template) {
    setEditingId(template.id)
    setName(template.name)
    setChannel(template.channel)
    setSubject(template.subject ?? "")
    setBody(template.body)
    setEditorOpen(true)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()

    if (!name.trim() || !body.trim()) {
      return
    }

    setSaving(true)

    const payload = {
      organization_id: DEMO_ORGANIZATION_ID,
      name: name.trim(),
      channel,
      subject: channel === "email" ? subject.trim() || null : null,
      body: body.trim(),
    }

    let error = null

    if (editingId) {
      const result = await supabase
        .from("templates")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId)
      error = result.error
    } else {
      const result = await supabase
        .from("templates")
        .insert({ ...payload })
      error = result.error
    }

    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    const { data, error: reloadError } = await supabase
      .from("templates")
      .select("*")
      .eq("organization_id", DEMO_ORGANIZATION_ID)
      .order("updated_at", { ascending: false })

    if (!reloadError) {
      setTemplates((data as Template[]) ?? [])
    }

    setEditorOpen(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Удалить шаблон? Это действие нельзя отменить.")) {
      return
    }

    setDeleteInProgress(id)
    const { error } = await supabase.from("templates").delete().eq("id", id)
    setDeleteInProgress(null)

    if (error) {
      setError(error.message)
      return
    }

    setTemplates((current) => current.filter((t) => t.id !== id))
  }

  const smsLength = channel === "sms" ? body.length : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Templates</h2>
          <p className="text-sm text-slate-600">
            Шаблоны сообщений для SMS и email. Используются при запуске
            кампаний.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewTemplate}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Template
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Загружаем шаблоны…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-slate-600">
          Шаблонов пока нет. Создайте первый шаблон, чтобы использовать его в
          коммуникациях.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Название</th>
                <th className="px-3 py-2">Канал</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Последнее обновление</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{template.name}</td>
                  <td className="px-3 py-2">
                    {template.channel === "sms" ? "SMS" : "Email"}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-600">
                    {template.subject ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(template.updated_at).toLocaleString("ru-RU")}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    <button
                      type="button"
                      onClick={() => openEditTemplate(template)}
                      className="mr-3 text-slate-700 underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      disabled={deleteInProgress === template.id}
                      className="text-red-600 underline disabled:opacity-60"
                    >
                      {deleteInProgress === template.id ? "Удаляем…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              {editingId ? "Редактирование шаблона" : "Новый шаблон"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Название
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Канал
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ChannelType)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                </select>
              </div>

              {channel === "email" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Текст сообщения
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={6}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-200 focus:ring-2"
                />
                {channel === "sms" && (
                  <p
                    className={`mt-1 text-xs ${
                      smsLength > 160 ? "text-red-600" : "text-slate-500"
                    }`}
                  >
                    Длина SMS: {smsLength} / 160 символов
                  </p>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false)
                    setError(null)
                  }}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Сохраняем…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

