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

async function fetchAuctionInsights(customerId: string, dateFrom: string, dateTo: string) {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!token) return []

  const access_token = await getAccessToken()
  if (!access_token) return []

  const query = `
    SELECT
      auction_insight_group.domains,
      metrics.search_impression_share,
      metrics.search_rank_lost_impression_share,
      metrics.search_overlap_rate,
      metrics.search_position_above_rate,
      metrics.search_top_impression_share,
      metrics.search_absolute_top_impression_share,
      metrics.search_outranking_share
    FROM auction_insight_group
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    LIMIT 25
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
    domain: (row.auctionInsightGroup?.domains ?? []).join(', '),
    impressionShare: ((row.metrics?.searchImpressionShare ?? 0) * 100).toFixed(1),
    overlapRate: ((row.metrics?.searchOverlapRate ?? 0) * 100).toFixed(1),
    positionAboveRate: ((row.metrics?.searchPositionAboveRate ?? 0) * 100).toFixed(1),
    topImpressionShare: ((row.metrics?.searchTopImpressionShare ?? 0) * 100).toFixed(1),
    absTopImpressionShare: ((row.metrics?.searchAbsoluteTopImpressionShare ?? 0) * 100).toFixed(1),
    outrankingShare: ((row.metrics?.searchOutrankingShare ?? 0) * 100).toFixed(1),
  }))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filialId = searchParams.get('filial') ?? 'florianopolis'
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const filial = FILIAIS.find(f => f.id === filialId)
  if (!filial || !filial.googleAdsAccounts.length) return NextResponse.json({ insights: [] })

  const all = await Promise.all(
    filial.googleAdsAccounts.map(acc => fetchAuctionInsights(acc.id, dateFrom, dateTo))
  )

  return NextResponse.json({ insights: all.flat() })
}

function getDefaultFrom() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }
function getDefaultTo() { return new Date().toISOString().split('T')[0] }
