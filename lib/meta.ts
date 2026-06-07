import { Campaign, KpiData } from './types'

const BASE = 'https://graph.facebook.com/v21.0'
const TOKEN = process.env.META_ACCESS_TOKEN ?? ''

export interface MetaInsight {
  campaign_id: string
  campaign_name: string
  account_id: string
  status: string
  spend: string
  impressions: string
  clicks: string
  ctr: string
  actions?: { action_type: string; value: string }[]
}

function getLeads(insight: MetaInsight): number {
  const leadAction = insight.actions?.find(
    (a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
  )
  return leadAction ? parseInt(leadAction.value) : 0
}

export async function fetchMetaInsights(
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<Campaign[]> {
  if (!TOKEN) return []

  const fields = [
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'ctr',
    'actions',
    'reach',
    'frequency',
  ].join(',')

  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    level: 'campaign',
    access_token: TOKEN,
    limit: '100',
  })

  const url = `${BASE}/act_${accountId}/insights?${params}`
  const res = await fetch(url, { next: { revalidate: 300 } })

  if (!res.ok) {
    console.error(`Meta API error for account ${accountId}:`, await res.text())
    return []
  }

  const data = await res.json()
  const insights: MetaInsight[] = data.data ?? []

  return insights.map((i) => {
    const leads = getLeads(i)
    const spend = parseFloat(i.spend) || 0
    return {
      id: i.campaign_id,
      name: i.campaign_name,
      status: 'ACTIVE',
      leads,
      spend,
      cpl: leads > 0 ? spend / leads : 0,
      ctr: parseFloat(i.ctr) || 0,
      impressions: parseInt(i.impressions) || 0,
      clicks: parseInt(i.clicks) || 0,
      platform: 'meta',
    }
  })
}

export function aggregateKpi(campaigns: Campaign[]): KpiData {
  const leads = campaigns.reduce((s, c) => s + c.leads, 0)
  const spend = campaigns.reduce((s, c) => s + c.spend, 0)
  const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  return {
    leads,
    spend,
    cpl: leads > 0 ? spend / leads : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    impressions,
    clicks,
  }
}
