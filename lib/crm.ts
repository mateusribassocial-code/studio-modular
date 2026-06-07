import { CrmFunnel, CrmLead } from './types'

const C2S_BASE = 'https://api.contact2sale.com/integration'
const C2S_TOKEN = process.env.C2S_API_TOKEN ?? ''

// IDs das filiais no C2S
export const C2S_COMPANY_IDS: Record<string, string> = {
  florianopolis: 'e77c6765ea131019b45727b3322eaa31',
  itajai: '0ec2de457c317dd74c2826d29d4b7838',
  'porto-alegre': 'ccc066b0622809492906c4e9074d47a4',
}

function mapStatus(lead: any): string {
  const alias = lead.attributes?.lead_status?.alias ?? ''
  const funnel = lead.attributes?.funnel_status?.status ?? ''
  if (alias === 'done_deal' || lead.attributes?.done_deal_at) return 'closed'
  if (funnel === 'Scheduled' || alias === 'scheduled') return 'scheduled'
  if (funnel === 'In attendance' || alias === 'under_negotiation') return 'negotiating'
  if (alias === 'new' || funnel === 'New lead') return 'contacted'
  return 'contacted'
}

async function fetchLeads(companyId: string, dateFrom: string, dateTo: string, limit = 500) {
  if (!C2S_TOKEN) return []

  const params = new URLSearchParams({
    limit: String(limit),
    start_date: dateFrom,
    end_date: dateTo,
    ...(companyId ? { company_id: companyId } : {}),
  })

  const res = await fetch(`${C2S_BASE}/leads?${params}`, {
    headers: { Authorization: C2S_TOKEN },
    next: { revalidate: 300 },
  })

  if (!res.ok) return []
  const data = await res.json()
  return (data.data ?? []) as any[]
}

export async function fetchC2SFunnel(dateFrom: string, dateTo: string, filial?: string): Promise<CrmFunnel> {
  if (!C2S_TOKEN) {
    return { total: 0, contacted: 0, scheduled: 0, visited: 0, negotiating: 0, closed: 0 }
  }

  try {
    const companyId = filial ? (C2S_COMPANY_IDS[filial] ?? '') : ''
    const leads = await fetchLeads(companyId, dateFrom, dateTo)

    const funnel: CrmFunnel = {
      total: leads.length,
      contacted: 0,
      scheduled: 0,
      visited: 0,
      negotiating: 0,
      closed: 0,
    }

    for (const lead of leads) {
      const status = mapStatus(lead)
      if (status === 'closed') funnel.closed++
      else if (status === 'scheduled') funnel.scheduled++
      else if (status === 'negotiating') funnel.negotiating++
      else funnel.contacted++
    }

    return funnel
  } catch {
    return { total: 0, contacted: 0, scheduled: 0, visited: 0, negotiating: 0, closed: 0 }
  }
}

export async function fetchC2SLeads(dateFrom: string, dateTo: string, filial?: string): Promise<CrmLead[]> {
  if (!C2S_TOKEN) return []

  try {
    const companyId = filial ? (C2S_COMPANY_IDS[filial] ?? '') : ''
    const leads = await fetchLeads(companyId, dateFrom, dateTo, 100)

    return leads.map((l) => ({
      id: l.id,
      name: l.attributes?.customer?.name ?? 'Sem nome',
      phone: l.attributes?.customer?.phone ?? '',
      product: l.attributes?.product?.description ?? '',
      stage: l.attributes?.lead_status?.name ?? '',
      createdAt: l.attributes?.created_at ?? '',
      lastContact: l.attributes?.last_activity_date,
    }))
  } catch {
    return []
  }
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

export async function fetchC2SSellerStats(dateFrom: string, dateTo: string, filial?: string): Promise<SellerStats[]> {
  if (!C2S_TOKEN) return []

  try {
    const companyId = filial ? (C2S_COMPANY_IDS[filial] ?? '') : ''
    const leads = await fetchLeads(companyId, dateFrom, dateTo, 500)

    const map = new Map<string, SellerStats & { responseTimes: number[] }>()

    for (const lead of leads) {
      const seller = lead.attributes?.seller
      if (!seller?.id) continue

      if (!map.has(seller.id)) {
        map.set(seller.id, {
          id: seller.id,
          name: seller.name ?? 'Sem nome',
          total: 0,
          scheduled: 0,
          negotiating: 0,
          closed: 0,
          avgResponseMinutes: 0,
          responseTimes: [],
        })
      }

      const entry = map.get(seller.id)!
      entry.total++

      const status = mapStatus(lead)
      if (status === 'scheduled') entry.scheduled++
      else if (status === 'negotiating') entry.negotiating++
      else if (status === 'closed') entry.closed++

      // Calcula tempo de resposta (created_at → read_at)
      const created = lead.attributes?.created_at
      const read = lead.attributes?.read_at
      if (created && read) {
        const diff = (new Date(read).getTime() - new Date(created).getTime()) / 60000
        if (diff > 0 && diff < 1440) entry.responseTimes.push(diff)
      }
    }

    return Array.from(map.values()).map((s) => ({
      ...s,
      avgResponseMinutes: s.responseTimes.length
        ? Math.round(s.responseTimes.reduce((a, b) => a + b, 0) / s.responseTimes.length)
        : 0,
    })).sort((a, b) => b.total - a.total)
  } catch {
    return []
  }
}
