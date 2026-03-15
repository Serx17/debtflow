import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"
import { DEMO_ORGANIZATION_ID } from "@/lib/constants"

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const REGIONS = [
  "Москва",
  "Московская область",
  "Санкт-Петербург",
  "Ленинградская область",
  "Новосибирская область",
  "Свердловская область",
  "Краснодарский край",
]

const NAMES = [
  "Иван Иванов",
  "Пётр Петров",
  "Сергей Смирнов",
  "Алексей Кузнецов",
  "Дмитрий Попов",
  "Андрей Соколов",
  "Евгений Лебедев",
  "Михаил Козлов",
  "Владимир Новиков",
  "Виктор Морозов",
  "Ольга Кузнецова",
  "Анна Смирнова",
  "Мария Иванова",
  "Елена Попова",
  "Татьяна Соколова",
]

export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-seed-secret") ?? ""
  const expectedSecret = process.env.SEED_SECRET

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return NextResponse.json(
      { error: "Неверный или отсутствующий SEED_SECRET." },
      { status: 401 }
    )
  }

  try {
    await supabase.from("channel_settings").upsert(
      {
        organization_id: DEMO_ORGANIZATION_ID,
        sms_enabled: true,
        sms_cost: 1.5,
        email_enabled: true,
        email_cost: 0.2,
        call_enabled: true,
        call_cost_per_minute: 5,
      },
      { onConflict: "organization_id" }
    )

    const debtorsPayload = Array.from({ length: 50 }).map((_, index) => {
      const name = NAMES[index % NAMES.length]
      const phone = `+7 9${randomInt(10, 99)} ${randomInt(
        100,
        999
      )}-${randomInt(10, 99)}-${randomInt(10, 99)}`
      const emailLocal = name
        .toLowerCase()
        .replace(/\s+/g, ".")
        .replace("ё", "e")
      const email = `${emailLocal}${index}@example.test`
      const debtAmount =
        index >= 25
          ? randomInt(320_000, 500_000)
          : randomInt(5_000, 250_000)
      const region = REGIONS[index % REGIONS.length]

      return {
        organization_id: DEMO_ORGANIZATION_ID,
        full_name: name,
        phone,
        email,
        debt_amount: debtAmount,
        region,
      }
    })

    await supabase.from("debtors").insert(debtorsPayload)

    const templatesPayload = [
      {
        organization_id: DEMO_ORGANIZATION_ID,
        name: "Мягкое SMS-напоминание",
        channel: "sms",
        subject: null,
        body:
          "Уважаемый клиент, за вами числится задолженность. Пожалуйста, свяжитесь с нами для урегулирования вопроса.",
      },
      {
        organization_id: DEMO_ORGANIZATION_ID,
        name: "Жёсткое SMS-напоминание",
        channel: "sms",
        subject: null,
        body:
          "Важно! У вас просроченная задолженность. Свяжитесь с нашим специалистом, чтобы избежать дополнительных расходов.",
      },
      {
        organization_id: DEMO_ORGANIZATION_ID,
        name: "Email с деталями долга",
        channel: "email",
        subject: "Информация по вашей задолженности",
        body:
          "Добрый день. Направляем вам детальную информацию по вашей задолженности и возможным вариантам её погашения.",
      },
      {
        organization_id: DEMO_ORGANIZATION_ID,
        name: "Email с предложением реструктуризации",
        channel: "email",
        subject: "Предложение по реструктуризации задолженности",
        body:
          "Мы подготовили индивидуальное предложение по реструктуризации вашей задолженности. Свяжитесь с нами для обсуждения.",
      },
      {
        organization_id: DEMO_ORGANIZATION_ID,
        name: "Скрипт звонка оператора",
        channel: "call",
        subject: null,
        body:
          "Представиться, подтвердить данные клиента, кратко описать ситуацию с задолженностью, предложить варианты погашения или реструктуризации. Зафиксировать договорённость.",
      },
    ]

    const { error: templatesInsertError } = await supabase
      .from("templates")
      .insert(templatesPayload)

    if (templatesInsertError) {
      return NextResponse.json(
        { error: "Ошибка вставки шаблонов: " + templatesInsertError.message },
        { status: 500 }
      )
    }

    const { data: debtors } = await supabase
      .from("debtors")
      .select("id")
      .eq("organization_id", DEMO_ORGANIZATION_ID)

    const { data: templates } = await supabase
      .from("templates")
      .select("id, channel")
      .eq("organization_id", DEMO_ORGANIZATION_ID)

    if (!debtors || !templates) {
      return NextResponse.json(
        { error: "Не удалось загрузить должников или шаблоны после вставки." },
        { status: 500 }
      )
    }

    const templateList = templates as { id: string; channel: string }[]
    const debtorIds = (debtors as { id: string }[]).map((d) => d.id)

    const now = new Date()
    const logsPayload = Array.from({ length: 200 }).map(() => {
      const debtorId =
        debtorIds[randomInt(0, Math.max(debtorIds.length - 1, 0))]
      const template =
        templateList[randomInt(0, Math.max(templateList.length - 1, 0))]
      const status =
        Math.random() < 0.8
          ? ("sent" as const)
          : ("failed" as const)
      const daysAgo = randomInt(0, 29)
      const sentAt = new Date(now)
      sentAt.setDate(now.getDate() - daysAgo)

      let cost = 0
      if (template.channel === "sms") cost = 1.5
      else if (template.channel === "email") cost = 0.2
      else if (template.channel === "call") cost = 5

      return {
        organization_id: DEMO_ORGANIZATION_ID,
        debtor_id: debtorId,
        channel: template.channel,
        template_id: template.id,
        status,
        cost,
        sent_at: sentAt.toISOString(),
      }
    })

    await supabase.from("communication_log").insert(logsPayload)

    return NextResponse.json({
      message:
        "Seed выполнен: добавлены демо-должники, шаблоны и записи в communication_log.",
      templateChannels: templatesPayload.map((t) => t.channel),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Ошибка при выполнении seed-скрипта." },
      { status: 500 }
    )
  }
}

