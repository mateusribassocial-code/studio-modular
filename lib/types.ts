// Re-exporta config do cliente para compatibilidade com imports existentes
export { FILIAIS } from './client.config'
export type { FilialConfig } from './client.config'

export interface KpiData {
  leads: number
  cpl: number
  spend: number
  ctr: number
  impressions: number
  clicks: number
  leadsVariation?: number
  cplVariation?: number
  spendVariation?: number
}

export interface Campaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  leads: number
  spend: number
  cpl: number
  ctr: number
  impressions: number
  clicks: number
  platform: 'meta' | 'google'
  accountLabel?: string
}

export interface CrmLead {
  id: string
  name: string
  phone: string
  product: string
  stage: string
  createdAt: string
  lastContact?: string
  score?: number
}

export interface CrmFunnel {
  total: number
  contacted: number
  scheduled: number
  visited: number
  negotiating: number
  closed: number
}

export interface Ga4Data {
  sessions: number
  users: number
  newUsers: number
  bounceRate: number
  avgSessionDuration: number
  conversions: number
  conversionRate: number
  topPages: { path: string; sessions: number; leads: number; conversionRate: number }[]
  trafficSources: { source: string; sessions: number; leads: number }[]
}
