'use client'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: number
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  loading?: boolean
}

const colorMap = {
  blue: 'text-blue-400',
  green: 'text-emerald-400',
  orange: 'text-orange-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
}

export function KpiCard({ label, value, sub, trend, color = 'blue', loading }: KpiCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      {loading ? (
        <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse mt-1" />
      ) : (
        <span className={`text-2xl font-bold ${colorMap[color]}`}>{value}</span>
      )}
      <div className="flex items-center gap-2 mt-0.5">
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
        {trend !== undefined && !loading && (
          <span className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
