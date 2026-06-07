import { NextRequest, NextResponse } from 'next/server'
import { fetchMetaInsights } from '@/lib/meta'
import { FILIAIS } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filialId = searchParams.get('filial') ?? 'florianopolis'
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const filial = FILIAIS.find((f) => f.id === filialId)
  if (!filial) return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })

  const allCampaigns = await Promise.all(
    filial.metaAccounts.map(async (account) => {
      const campaigns = await fetchMetaInsights(account.id, dateFrom, dateTo)
      return campaigns.map((c) => ({ ...c, accountLabel: account.label }))
    })
  )

  return NextResponse.json({ campaigns: allCampaigns.flat() })
}

function getDefaultFrom() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
