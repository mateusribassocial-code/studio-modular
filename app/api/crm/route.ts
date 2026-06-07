import { NextRequest, NextResponse } from 'next/server'
import { fetchC2SFunnel, fetchC2SLeads, fetchC2SSellerStats } from '@/lib/crm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()
  const filial = searchParams.get('filial') ?? undefined

  const [funnel, leads, sellers] = await Promise.all([
    fetchC2SFunnel(dateFrom, dateTo, filial),
    fetchC2SLeads(dateFrom, dateTo, filial),
    fetchC2SSellerStats(dateFrom, dateTo, filial),
  ])

  return NextResponse.json({ funnel, leads, sellers })
}

function getDefaultFrom() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
