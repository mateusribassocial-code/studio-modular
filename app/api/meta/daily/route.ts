import { NextRequest, NextResponse } from 'next/server'
import { FILIAIS } from '@/lib/types'

const BASE = 'https://graph.facebook.com/v21.0'

function getLeads(actions?: { action_type: string; value: string }[]): number {
  const a = actions?.find(
    (a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
  )
  return a ? parseInt(a.value) : 0
}

async function fetchDailyForAccount(accountId: string, dateFrom: string, dateTo: string) {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return []

  const params = new URLSearchParams({
    fields: 'spend,actions,date_start',
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    time_increment: '1',
    level: 'account',
    access_token: token,
    limit: '100',
  })

  const res = await fetch(`${BASE}/act_${accountId}/insights?${params}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.data ?? []) as { date_start: string; spend: string; actions?: { action_type: string; value: string }[] }[]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filialId = searchParams.get('filial') ?? 'florianopolis'
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const filial = FILIAIS.find((f) => f.id === filialId)
  if (!filial) return NextResponse.json({ daily: [] })

  const allResults = await Promise.all(
    filial.metaAccounts.map((acc) => fetchDailyForAccount(acc.id, dateFrom, dateTo))
  )

  // Merge all accounts into a single daily map
  const byDate: Record<string, { spend: number; leads: number }> = {}
  for (const rows of allResults) {
    for (const row of rows) {
      const date = row.date_start
      if (!byDate[date]) byDate[date] = { spend: 0, leads: 0 }
      byDate[date].spend += parseFloat(row.spend) || 0
      byDate[date].leads += getLeads(row.actions)
    }
  }

  const daily = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  return NextResponse.json({ daily })
}

function getDefaultFrom() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}
function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
