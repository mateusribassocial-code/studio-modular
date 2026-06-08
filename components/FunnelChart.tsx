'use client'

import { CrmFunnel } from '@/lib/types'

interface FunnelChartProps {
  funnel: CrmFunnel
  loading?: boolean
}

const stages = [
  { key: 'total',            label: 'Total Leads',       color: 'bg-blue-600' },
  { key: 'tentativaContato', label: 'Tent. Contato',     color: 'bg-indigo-500' },
  { key: 'leadQualificada',  label: 'Lead Qualificada',  color: 'bg-violet-500' },
  { key: 'orcamento',        label: 'Orçamento',         color: 'bg-purple-500' },
  { key: 'proposta',         label: 'Proposta',          color: 'bg-orange-500' },
  { key: 'comprou',          label: 'Comprou',           color: 'bg-emerald-500' },
] as const

export function FunnelChart({ funnel, loading }: FunnelChartProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.key} className="h-10 bg-zinc-800 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  const max = funnel.total || 1

  return (
    <div className="space-y-2">
      {stages.map((stage) => {
        const value = funnel[stage.key]
        const pct = (value / max) * 100

        return (
          <div key={stage.key} className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-28 shrink-0 text-right">{stage.label}</span>
            <div className="flex-1 bg-zinc-800 rounded-full h-7 relative overflow-hidden">
              <div
                className={`${stage.color} h-full rounded-full transition-all duration-500 flex items-center pl-3`}
                style={{ width: `${Math.max(pct, 3)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white w-8 text-right">{value}</span>
            {stage.key !== 'total' && (
              <span className="text-xs text-zinc-500 w-10">
                {max > 0 ? `${((value / max) * 100).toFixed(0)}%` : '0%'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
