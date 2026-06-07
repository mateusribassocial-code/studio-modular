import { Ga4Data } from './types'

async function getAccessToken() {
  const clientId = process.env.GA4_CLIENT_ID
  const clientSecret = process.env.GA4_CLIENT_SECRET
  const refreshToken = process.env.GA4_REFRESH_TOKEN

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
  if (!res.ok) {
    console.error('GA4 token error:', data)
    return null
  }

  return data.access_token as string
}

export async function fetchGa4Data(
  propertyId: string,
  dateFrom: string,
  dateTo: string
): Promise<Ga4Data | null> {
  const token = await getAccessToken()
  if (!token) return null

  const body = {
    dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'conversions' },
    ],
    metricAggregations: ['TOTAL'],
    limit: 10,
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  }

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      next: { revalidate: 300 },
    }
  )

  if (!res.ok) return null

  const data = await res.json()
  const rows = data.rows ?? []

  const totals = data.totals?.[0]?.metricValues ?? []
  const totalSessions = parseInt(totals[0]?.value ?? '0')
  const totalUsers = parseInt(totals[1]?.value ?? '0')
  const newUsers = parseInt(totals[2]?.value ?? '0')
  const bounceRate = parseFloat(totals[3]?.value ?? '0') * 100
  const avgDuration = parseFloat(totals[4]?.value ?? '0')
  const conversions = parseInt(totals[5]?.value ?? '0')

  const topPages = rows.slice(0, 10).map((row: any) => {
    const sessions = parseInt(row.metricValues[0].value)
    const leads = parseInt(row.metricValues[5].value)
    return {
      path: row.dimensionValues[0].value,
      sessions,
      leads,
      conversionRate: sessions > 0 ? (leads / sessions) * 100 : 0,
    }
  })

  return {
    sessions: totalSessions,
    users: totalUsers,
    newUsers,
    bounceRate,
    avgSessionDuration: avgDuration,
    conversions,
    conversionRate: totalSessions > 0 ? (conversions / totalSessions) * 100 : 0,
    topPages,
    trafficSources: [],
  }
}
