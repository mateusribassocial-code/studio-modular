import { NextRequest, NextResponse } from 'next/server'
import { FILIAIS } from '@/lib/types'

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? '',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? '',
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token as string
}

async function fetchKeywords(customerId: string, dateFrom: string, dateTo: string, label: string) {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!token) return []

  const access_token = await getAccessToken()
  if (!access_token) return []

  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.quality_info.quality_score,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions
    FROM keyword_view
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `

  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'developer-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 300 },
    }
  )

  if (!res.ok) return []
  const data = await res.json()

  return (data.results ?? []).map((row: any) => ({
    keyword: row.adGroupCriterion?.keyword?.text ?? '',
    matchType: row.adGroupCriterion?.keyword?.matchType ?? '',
    status: row.adGroupCriterion?.status ?? '',
    qualityScore: row.adGroupCriterion?.qualityInfo?.qualityScore ?? null,
    impressions: row.metrics?.impressions ?? 0,
    clicks: row.metrics?.clicks ?? 0,
    spend: (row.metrics?.costMicros ?? 0) / 1_000_000,
    ctr: (row.metrics?.ctr ?? 0) * 100,
    avgCpc: (row.metrics?.averageCpc ?? 0) / 1_000_000,
    conversions: row.metrics?.conversions ?? 0,
    accountLabel: label,
  }))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filialId = searchParams.get('filial') ?? 'florianopolis'
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const filial = FILIAIS.find(f => f.id === filialId)
  if (!filial || !filial.googleAdsAccounts.length) return NextResponse.json({ keywords: [] })

  const all = await Promise.all(
    filial.googleAdsAccounts.map(acc => fetchKeywords(acc.id, dateFrom, dateTo, acc.label))
  )

  const keywords = all.flat().sort((a, b) => b.spend - a.spend)
  return NextResponse.json({ keywords })
}

function getDefaultFrom() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }
function getDefaultTo() { return new Date().toISOString().split('T')[0] }
