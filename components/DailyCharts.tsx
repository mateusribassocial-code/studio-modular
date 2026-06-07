'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface DailyPoint {
  date: string
  spend: number
  leads: number
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function SpendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}:{' '}
          {p.dataKey === 'spend'
            ? p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
            : p.value}
        </p>
      ))}
    </div>
  )
}

export function DailyCharts({ data, loading }: { data: DailyPoint[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-52 bg-zinc-800/40 rounded-xl animate-pulse" />
        <div className="h-52 bg-zinc-800/40 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!data.length) {
    return <p className="text-zinc-500 text-sm text-center py-8">Sem dados diários no período</p>
  }

  const formatted = data.map((d) => ({ ...d, dateLabel: formatDate(d.date) }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Gasto diário */}
      <div>
        <p className="text-xs text-zinc-500 mb-3 font-medium">Gasto diário (R$)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
              }
              width={46}
            />
            <Tooltip content={<SpendTooltip />} />
            <Line
              type="monotone"
              dataKey="spend"
              name="Gasto"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Leads diárias */}
      <div>
        <p className="text-xs text-zinc-500 mb-3 font-medium">Leads diários</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={32}
            />
            <Tooltip content={<SpendTooltip />} />
            <Line
              type="monotone"
              dataKey="leads"
              name="Leads"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
