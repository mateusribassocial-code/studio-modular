import { NextRequest, NextResponse } from 'next/server'
import { FILIAIS } from '@/lib/types'

const BASE = 'https://graph.facebook.com/v21.0'
const TOKEN = process.env.META_ACCESS_TOKEN ?? ''

async function fetchAdSets(accountId: string, dateFrom: string, dateTo: string) {
  if (!TOKEN) return []
  const fields = 'adset_id,adset_name,spend,impressions,clicks,ctr,actions,frequency,reach'
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    level: 'adset',
    access_token: TOKEN,
    limit: '100',
  })
  const res = await fetch(`${BASE}/act_${accountId}/insights?${params}`, { next: { revalidate: 300 } })
  if (!res.ok) return []
  const data = await res.json()
  return (data.data ?? []).map((r: any) => {
    const leadAction = r.actions?.find((a: any) => a.action_type === 'leadgen.other' || a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
    return {
      id: r.adset_id ?? r.adset_name,
      name: r.adset_name,
      status: parseFloat(r.spend ?? '0') > 0 ? 'ACTIVE' : 'PAUSED',
      leads: parseInt(leadAction?.value ?? '0') || 0,
      spend: parseFloat(r.spend ?? '0') || 0,
      impressions: parseInt(r.impressions ?? '0') || 0,
      clicks: parseInt(r.clicks ?? '0') || 0,
      ctr: parseFloat(r.ctr ?? '0') || 0,
      frequency: parseFloat(r.frequency ?? '0') || 0,
      reach: parseInt(r.reach ?? '0') || 0,
    }
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filialId = searchParams.get('filial') ?? 'florianopolis'
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const filial = FILIAIS.find((f) => f.id === filialId)
  if (!filial) return NextResponse.json({ adsets: [] })

  const all = await Promise.all(
    filial.metaAccounts.map(async (acc) => {
      const adsets = await fetchAdSets(acc.id, dateFrom, dateTo)
      return adsets.map((a: any) => ({ ...a, accountLabel: acc.label }))
    })
  )
  return NextResponse.json({ adsets: all.flat() })
}

function getDefaultFrom() {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
}
function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
