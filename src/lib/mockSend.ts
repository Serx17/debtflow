import { DEMO_ORGANIZATION_ID } from "@/lib/constants"

export type Channel = "sms" | "email" | "call"

type Debtor = {
  id: string
  full_name: string
}

type Template = {
  id: string
  channel: Channel
}

type ChannelSettings = {
  sms_enabled: boolean
  sms_cost: number | null
  email_enabled: boolean
  email_cost: number | null
  call_enabled: boolean
  call_cost_per_minute: number | null
}

export type MockSendResult = {
  status: "sent" | "failed"
  cost: number
}

export async function mockSend(
  channel: Channel,
  debtor: Debtor,
  template: Template,
  settings: ChannelSettings
): Promise<MockSendResult> {
  const delay = 1000 + Math.floor(Math.random() * 2000)

  const success = Math.random() < 0.8

  let unitCost = 0
  if (channel === "sms") {
    unitCost = settings.sms_cost ?? 0
  } else if (channel === "email") {
    unitCost = settings.email_cost ?? 0
  } else if (channel === "call") {
    unitCost = settings.call_cost_per_minute ?? 0
  }

  const cost = unitCost

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: success ? "sent" : "failed",
        cost,
      })
    }, delay)
  })
}

export const MOCK_ORGANIZATION_ID = DEMO_ORGANIZATION_ID

