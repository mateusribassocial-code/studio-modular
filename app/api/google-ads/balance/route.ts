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

async function fetchBalance(customerId: string) {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!token) return null

  const access_token = await getAccessToken()
  if (!access_token) return null

  const query = `
    SELECT
      account_budget.approved_spending_limit_micros,
      account_budget.amount_served_micros,
      account_budget.total_adjustments_micros,
      account_budget.status
    FROM account_budget
    WHERE account_budget.status = 'APPROVED'
    LIMIT 1
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
      next: { revalidate: 60 },
    }
  )

  if (!res.ok) return null
  const data = await res.json()
  const row = data.results?.[0]
  if (!row) return null

  const limit = (row.accountBudget?.approvedSpendingLimitMicros ?? 0) / 1_000_000
  const served = (row.accountBudget?.amountServedMicros ?? 0) / 1_000_000
  const adjustments = (row.accountBudget?.totalAdjustmentsMicros ?? 0) / 1_000_000
  const available = limit - served + adjustments

  return { limit, served, available }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filialId = searchParams.get('filial') ?? 'florianopolis'

  const filial = FILIAIS.find(f => f.id === filialId)
  if (!filial || !filial.googleAdsAccounts.length) return NextResponse.json({ balances: [] })

  const balances = await Promise.all(
    filial.googleAdsAccounts.map(async (acc) => {
      const balance = await fetchBalance(acc.id)
      return { label: acc.label, id: acc.id, ...balance }
    })
  )

  return NextResponse.json({ balances })
}
