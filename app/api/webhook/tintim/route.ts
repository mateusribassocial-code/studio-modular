import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
import { TINTIM_STATUS_IDS } from '@/lib/crm'

interface TintimPayload {
  event_type: 'lead.create' | 'lead.update' | 'lead_source.update' | 'message.create'
  phone: string
  phone_e164?: string
  name?: string
  created_isoformat?: string
  updated_isoformat?: string
  status: { id: number | string; name: string }
}

interface StoredLead {
  phone: string
  name: string
  statusId: number
  statusName: string
  createdAt: string
  updatedAt: string
}

const KNOWN_STATUS_IDS = new Set(Object.values(TINTIM_STATUS_IDS))

export async function POST(req: NextRequest) {
  try {
    const body: TintimPayload = await req.json()
    const { event_type, phone_e164, phone, status, name, created_isoformat, updated_isoformat } = body

    if (!['lead.create', 'lead.update'].includes(event_type)) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const key = phone_e164 || phone
    if (!key) return NextResponse.json({ ok: false, error: 'no phone' }, { status: 400 })

    const statusId = typeof status.id === 'string' ? parseInt(status.id) : status.id
    const now = new Date().toISOString()

    const existing = await kv.get<StoredLead>(`lead:${key}`)

    const lead: StoredLead = {
      phone: key,
      name: name || existing?.name || '',
      statusId,
      statusName: status.name,
      createdAt: created_isoformat || existing?.createdAt || now,
      updatedAt: updated_isoformat || now,
    }

    await kv.set(`lead:${key}`, lead)

    // Mantém índice de todos os telefones (para varredura do funil)
    if (!existing) {
      await kv.sadd('leads:index', key)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Tintim webhook error:', err)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
