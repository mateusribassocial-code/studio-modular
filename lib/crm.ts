import { Redis } from '@upstash/redis'

const kv = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})
import { CrmFunnel } from './types'

const BASE = 'https://s.tintim.app/api/v1'
const ACCOUNT_CODE = process.env.TINTIM_ACCOUNT_CODE ?? ''
const ACCOUNT_TOKEN = process.env.TINTIM_ACCOUNT_TOKEN ?? ''

// IDs dos status cadastrados na conta Studio Modular (fonte: GET /leadstatus)
export const TINTIM_STATUS_IDS = {
  tentativaContato: 112063,
  leadQualificada:  133161,
  orcamento:        120071,
  proposta:         123842,
  comprou:          112064,
} as const

export interface TintimStatusInfo {
  id: number
  name: string
}

export interface SellerStats {
  id: string
  name: string
  total: number
  scheduled: number
  negotiating: number
  closed: number
  avgResponseMinutes: number
}

interface StoredLead {
  phone: string
  name: string
  statusId: number
  statusName: string
  createdAt: string
  updatedAt: string
}

function statusIdToFunnelKey(id: number): keyof Omit<CrmFunnel, 'total'> | null {
  switch (id) {
    case TINTIM_STATUS_IDS.tentativaContato: return 'tentativaContato'
    case TINTIM_STATUS_IDS.leadQualificada:  return 'leadQualificada'
    case TINTIM_STATUS_IDS.orcamento:        return 'orcamento'
    case TINTIM_STATUS_IDS.proposta:         return 'proposta'
    case TINTIM_STATUS_IDS.comprou:          return 'comprou'
    default: return null
  }
}

export async function fetchTintimStatuses(): Promise<TintimStatusInfo[]> {
  if (!ACCOUNT_CODE || !ACCOUNT_TOKEN) return []
  try {
    const res = await fetch(`${BASE}/${ACCOUNT_CODE}/leadstatus?token=${ACCOUNT_TOKEN}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function fetchTintimLead(phone: string) {
  if (!ACCOUNT_CODE || !ACCOUNT_TOKEN) return null
  try {
    const res = await fetch(`${BASE}/${ACCOUNT_CODE}/lead/${phone}?token=${ACCOUNT_TOKEN}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchTintimFunnel(dateFrom: string, dateTo: string): Promise<CrmFunnel> {
  const empty: CrmFunnel = {
    total: 0, tentativaContato: 0, leadQualificada: 0,
    orcamento: 0, proposta: 0, comprou: 0,
  }

  try {
    const phones = await kv.smembers<string[]>('leads:index')
    if (!phones || phones.length === 0) return empty

    const from = new Date(dateFrom).getTime()
    const to = new Date(dateTo + 'T23:59:59').getTime()

    const leads = await Promise.all(phones.map(p => kv.get<StoredLead>(`lead:${p}`)))

    const funnel = { ...empty }

    for (const lead of leads) {
      if (!lead) continue
      const createdAt = new Date(lead.createdAt).getTime()
      if (createdAt < from || createdAt > to) continue

      funnel.total++
      const funnelKey = statusIdToFunnelKey(lead.statusId)
      if (funnelKey) funnel[funnelKey]++
    }

    return funnel
  } catch {
    return empty
  }
}

export async function fetchTintimSellerStats(_dateFrom: string, _dateTo: string): Promise<SellerStats[]> {
  return []
}
