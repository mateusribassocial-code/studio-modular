import { NextRequest, NextResponse } from 'next/server'
import { FILIAIS } from '@/lib/types'

const BASE = 'https://graph.facebook.com/v21.0'
const TOKEN = process.env.META_ACCESS_TOKEN ?? ''

async function fetchAds(accountId: string, dateFrom: string, dateTo: string) {
  if (!TOKEN) return []
  const fields = 'ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,actions'
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    level: 'ad',
    access_token: TOKEN,
    limit: '100',
  })
  const res = await fetch(`${BASE}/act_${accountId}/insights?${params}`, { next: { revalidate: 300 } })
  if (!res.ok) return []
  const data = await res.json()
  return (data.data ?? []).map((r: any) => {
    const leadAction = r.actions?.find((a: any) => a.action_type === 'leadgen.other' || a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
    const leads = parseInt(leadAction?.value ?? '0') || 0
    const spend = parseFloat(r.spend ?? '0') || 0
    return {
      id: r.ad_id,
      name: r.ad_name,
      adset: r.adset_name,
      campaign: r.campaign_name,
      status: spend > 0 ? 'ACTIVE' : 'PAUSED',
      leads,
      spend,
      impressions: parseInt(r.impressions ?? '0') || 0,
      clicks: parseInt(r.clicks ?? '0') || 0,
      ctr: parseFloat(r.ctr ?? '0') || 0,
      cpl: leads > 0 && spend > 0 ? spend / leads : 0,
      url: `https://www.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_ids=${r.ad_id}`,
      accountId,
    }
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filialId = searchParams.get('filial') ?? 'florianopolis'
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const filial = FILIAIS.find((f) => f.id === filialId)
  if (!filial) return NextResponse.json({ ads: [] })

  const all = await Promise.all(
    filial.metaAccounts.map(async (acc) => {
      const ads = await fetchAds(acc.id, dateFrom, dateTo)
      return ads.map((a: any) => ({ ...a, accountLabel: acc.label }))
    })
  )

  // Ordena por leads desc, filtra ads sem gasto
  const ads = all.flat()
    .filter((a) => a.spend > 0 || a.leads > 0)
    .sort((a, b) => b.leads - a.leads || b.spend - a.spend)

  return NextResponse.json({ ads })
}

function getDefaultFrom() {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
}
function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
