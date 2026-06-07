'use client'

import { Campaign } from '@/lib/types'

interface CampaignTableProps {
  campaigns: Campaign[]
  loading?: boolean
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  PAUSED: 'bg-zinc-700/50 text-zinc-400',
  ARCHIVED: 'bg-zinc-800/50 text-zinc-600',
}

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
}

export function CampaignTable({ campaigns, loading }: CampaignTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-zinc-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!campaigns.length) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        Nenhuma campanha encontrada para o período
      </div>
    )
  }

  const sorted = [...campaigns].sort((a, b) => b.leads - a.leads)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-2 px-3 text-zinc-500 font-normal">Campanha</th>
            {campaigns.some((c) => c.accountLabel) && (
              <th className="text-left py-2 px-3 text-zinc-500 font-normal">Conta</th>
            )}
            <th className="text-right py-2 px-3 text-zinc-500 font-normal">Leads</th>
            <th className="text-right py-2 px-3 text-zinc-500 font-normal">CPL</th>
            <th className="text-right py-2 px-3 text-zinc-500 font-normal">Gasto</th>
            <th className="text-right py-2 px-3 text-zinc-500 font-normal">CTR</th>
            <th className="text-center py-2 px-3 text-zinc-500 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
              <td className="py-2.5 px-3 text-zinc-200 max-w-xs truncate">{c.name}</td>
              {campaigns.some((camp) => camp.accountLabel) && (
                <td className="py-2.5 px-3 text-zinc-400 text-xs">{c.accountLabel ?? '-'}</td>
              )}
              <td className="py-2.5 px-3 text-right font-medium text-white">{c.leads}</td>
              <td className="py-2.5 px-3 text-right">
                <span className={c.cpl > 0 && c.cpl < 50 ? 'text-emerald-400' : c.cpl < 100 ? 'text-orange-400' : 'text-red-400'}>
                  {c.cpl > 0 ? formatBRL(c.cpl) : '—'}
                </span>
              </td>
              <td className="py-2.5 px-3 text-right text-zinc-300">{formatBRL(c.spend)}</td>
              <td className="py-2.5 px-3 text-right text-zinc-400">{c.ctr.toFixed(2)}%</td>
              <td className="py-2.5 px-3 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] ?? statusColors.PAUSED}`}>
                  {c.status === 'ACTIVE' ? 'Ativa' : c.status === 'PAUSED' ? 'Pausada' : 'Arquivada'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
