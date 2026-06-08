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

export interface TintimStatus {
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

function mapStatusId(id: number): keyof CrmFunnel | null {
  switch (id) {
    case TINTIM_STATUS_IDS.tentativaContato: return 'tentativaContato'
    case TINTIM_STATUS_IDS.leadQualificada:  return 'leadQualificada'
    case TINTIM_STATUS_IDS.orcamento:        return 'orcamento'
    case TINTIM_STATUS_IDS.proposta:         return 'proposta'
    case TINTIM_STATUS_IDS.comprou:          return 'comprou'
    default: return null
  }
}

export async function fetchTintimStatuses(): Promise<TintimStatus[]> {
  if (!ACCOUNT_CODE || !ACCOUNT_TOKEN) return []
  const res = await fetch(`${BASE}/${ACCOUNT_CODE}/leadstatus?token=${ACCOUNT_TOKEN}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  return res.json()
}

export async function fetchTintimLead(phone: string) {
  if (!ACCOUNT_CODE || !ACCOUNT_TOKEN) return null
  const res = await fetch(`${BASE}/${ACCOUNT_CODE}/lead/${phone}?token=${ACCOUNT_TOKEN}`, {
    next: { revalidate: 300 },
  })
  if (!res.ok) return null
  return res.json()
}

// O Tintim não possui endpoint de listagem em massa de leads.
// O funil de contagens requer integração via webhook (Tintim dispara eventos
// a cada mudança de status). Por enquanto retorna zeros.
export async function fetchTintimFunnel(_dateFrom: string, _dateTo: string): Promise<CrmFunnel> {
  return {
    total: 0,
    tentativaContato: 0,
    leadQualificada: 0,
    orcamento: 0,
    proposta: 0,
    comprou: 0,
  }
}

export async function fetchTintimSellerStats(_dateFrom: string, _dateTo: string): Promise<SellerStats[]> {
  return []
}
