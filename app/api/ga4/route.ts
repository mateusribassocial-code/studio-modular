import { NextRequest, NextResponse } from 'next/server'
import { fetchGa4Data } from '@/lib/ga4'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('from') ?? getDefaultFrom()
  const dateTo = searchParams.get('to') ?? getDefaultTo()
  const propertyId = process.env.GA4_PROPERTY_ID

  if (!propertyId) return NextResponse.json({ data: null })

  const data = await fetchGa4Data(propertyId, dateFrom, dateTo)
  return NextResponse.json({ data })
}

function getDefaultFrom() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function getDefaultTo() {
  return new Date().toISOString().split('T')[0]
}
