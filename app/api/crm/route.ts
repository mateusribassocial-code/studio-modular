import { NextRequest, NextResponse } from 'next/server'
import { fetchTintimFunnel, fetchTintimSellerStats } from '@/lib/crm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()

  const [funnel, sellers] = await Promise.all([
    fetchTintimFunnel(dateFrom, dateTo),
    fetchTintimSellerStats(dateFrom, dateTo),
  ])

  return NextResponse.json({ funnel, sellers })
}

function getDefaultFrom() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
