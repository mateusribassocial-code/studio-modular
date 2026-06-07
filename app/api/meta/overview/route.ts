import { NextRequest, NextResponse } from 'next/server'
import { FILIAIS } from '@/lib/types'

const BASE = 'https://graph.facebook.com/v21.0'
const TOKEN = process.env.META_ACCESS_TOKEN ?? ''

async function fetchAccountKpi(accountId: string, dateFrom: string, dateTo: string) {
  if (!TOKEN) return null
  const params = new URLSearchParams({
    fields: 'spend,impressions,clicks,ctr,actions',
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    level: 'account',
    access_token: TOKEN,
  })
  const res = await fetch(`${BASE}/act_${accountId}/insights?${params}`, { next: { revalidate: 300 } })
  if (!res.ok) return null
  const data = await res.json()
  const row = data.data?.[0]
  if (!row) return { leads: 0, spend: 0, impressions: 0, clicks: 0, ctr: 0 }
  const leadAction = row.actions?.find((a: any) =>
    a.action_type === 'leadgen.other' || a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
  )
  return {
    leads: parseInt(leadAction?.value ?? '0') || 0,
    spend: parseFloat(row.spend ?? '0') || 0,
    impressions: parseInt(row.impressions ?? '0') || 0,
    clicks: parseInt(row.clicks ?? '0') || 0,
    ctr: parseFloat(row.ctr ?? '0') || 0,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const accounts = FILIAIS.flatMap(f =>
    f.metaAccounts.map(a => ({ ...a, filial: f.label }))
  )

  const results = await Promise.all(
    accounts.map(async (acc) => {
      const kpi = await fetchAccountKpi(acc.id, dateFrom, dateTo)
      return { id: acc.id, label: acc.label, filial: acc.filial, ...kpi }
    })
  )

  return NextResponse.json({ accounts: results })
}

function getDefaultFrom() {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
}
function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
