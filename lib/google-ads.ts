import { Campaign } from './types'

async function getAccessToken() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token as string ?? null
}

export async function fetchGoogleAdsCampaigns(
  customerId: string,
  dateFrom: string,
  dateTo: string,
  accountLabel?: string
): Promise<Campaign[]> {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!token) return []

  try {
    const access_token = await getAccessToken()
    if (!access_token) return []

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND campaign.status != 'REMOVED'
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
    const rows = data.results ?? []

    return rows.map((row: any) => {
      const spend = (row.metrics.costMicros ?? 0) / 1_000_000
      const leads = Math.round(row.metrics.conversions ?? 0)
      return {
        id: row.campaign.id,
        name: row.campaign.name,
        status: row.campaign.status,
        leads,
        spend,
        cpl: leads > 0 ? spend / leads : 0,
        ctr: (row.metrics.ctr ?? 0) * 100,
        impressions: row.metrics.impressions ?? 0,
        clicks: row.metrics.clicks ?? 0,
        platform: 'google' as const,
        accountLabel,
      }
    })
  } catch (err) {
    console.error('Google Ads API error:', err)
    return []
  }
}
