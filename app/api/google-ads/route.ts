import { NextRequest, NextResponse } from 'next/server'
import { fetchGoogleAdsCampaigns } from '@/lib/google-ads'
import { FILIAIS } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filialId = searchParams.get('filial') ?? 'florianopolis'
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const filial = FILIAIS.find((f) => f.id === filialId)
  if (!filial || !filial.googleAdsAccounts.length) {
    return NextResponse.json({ campaigns: [] })
  }

  const all = await Promise.all(
    filial.googleAdsAccounts.map((acc) =>
      fetchGoogleAdsCampaigns(acc.id, dateFrom, dateTo, acc.label)
    )
  )
  return NextResponse.json({ campaigns: all.flat() })
}

function getDefaultFrom() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
