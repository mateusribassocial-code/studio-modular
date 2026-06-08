'use client'

import { useState, useEffect, useCallback } from 'react'
import { KpiCard } from '@/components/KpiCard'
import { CampaignTable } from '@/components/CampaignTable'
import { DailyCharts } from '@/components/DailyCharts'
import { Campaign, CrmFunnel, Ga4Data } from '@/lib/types'
import { FILIAIS, CLIENT, FEATURES } from '@/lib/client.config'
import { aggregateKpi } from '@/lib/meta'
import { SellerStats } from '@/lib/crm'

type ActiveTab = string

const TABS = [
  ...FILIAIS.map(f => ({ id: f.id as ActiveTab, label: f.label, icon: '🏢' })),
  { id: 'analytics' as ActiveTab, label: 'Analytics & CRM', icon: '📊' },
]

const PERIOD_OPTIONS = [
  { label: 'Mês atual', value: 'current-month' },
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Mês anterior', value: 'last-month' },
]

function getPeriodDates(period: string) {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const f = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (period === 'current-month') return { from: f(new Date(now.getFullYear(), now.getMonth(), 1)), to: f(now) }
  if (period === '7d') { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: f(d), to: f(now) } }
  if (period === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); return { from: f(d), to: f(now) } }
  if (period === 'last-month') return { from: f(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: f(new Date(now.getFullYear(), now.getMonth(), 0)) }
  return { from: f(new Date(now.getFullYear(), now.getMonth(), 1)), to: f(now) }
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (v: number) => v.toLocaleString('pt-BR')

function PeriodSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500">
      {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800">
        <span>{icon}</span>
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Pill({ v, good, warn }: { v: number; good: number; warn: number }) {
  return <span className={`font-semibold ${v <= good ? 'text-emerald-400' : v <= warn ? 'text-orange-400' : 'text-red-400'}`}>{brl2(v)}</span>
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700/50 text-zinc-400'}`}>{active ? '● Ativa' : '○ Pausada'}</span>
}

function InsightItem({ type, text }: { type: 'success' | 'warning' | 'danger' | 'info'; text: string }) {
  const styles = { success: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300', warning: 'border-orange-500/40 bg-orange-500/5 text-orange-300', danger: 'border-red-500/40 bg-red-500/5 text-red-300', info: 'border-blue-500/40 bg-blue-500/5 text-blue-300' }
  const icons = { success: '✅', warning: '⚠️', danger: '🔴', info: 'ℹ️' }
  return <div className={`border rounded-lg px-4 py-3 text-sm flex gap-3 items-start ${styles[type]}`}><span className="shrink-0">{icons[type]}</span><span>{text}</span></div>
}

// ─── Página de Anúncios (filial) ─────────────────────────────────────────────
function AdsPage({ filialId, period }: { filialId: string; period: string }) {
  const filial = FILIAIS.find(f => f.id === filialId) ?? FILIAIS[0]
  const { from, to } = getPeriodDates(period)
  const [metaCampaigns, setMetaCampaigns] = useState<Campaign[]>([])
  const [adsets, setAdsets] = useState<any[]>([])
  const [creatives, setCreatives] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<{ date: string; spend: number; leads: number }[]>([])
  const [loading, setLoading] = useState({ meta: true, adsets: true, creatives: true, daily: true })

  const fetchAll = useCallback(async () => {
    setLoading({ meta: true, adsets: true, creatives: true, daily: true })
    const p = `filial=${filialId}&from=${from}&to=${to}`
    const [m, a, c, daily] = await Promise.allSettled([
      fetch(`/api/meta?${p}`).then(r => r.json()),
      fetch(`/api/meta/adsets?${p}`).then(r => r.json()),
      fetch(`/api/meta/creatives?${p}`).then(r => r.json()),
      fetch(`/api/meta/daily?${p}`).then(r => r.json()),
    ])
    if (m.status === 'fulfilled') setMetaCampaigns(m.value.campaigns ?? [])
    if (a.status === 'fulfilled') setAdsets(a.value.adsets ?? [])
    if (c.status === 'fulfilled') setCreatives(c.value.ads ?? [])
    if (daily.status === 'fulfilled') setDailyData(daily.value.daily ?? [])
    setLoading({ meta: false, adsets: false, creatives: false, daily: false })
  }, [filialId, from, to])

  useEffect(() => { fetchAll() }, [fetchAll])

  const metaKpi = aggregateKpi(metaCampaigns)
  const totalLeads = metaKpi.leads
  const totalSpend = metaKpi.spend
  const totalCpl = totalLeads > 0 ? totalSpend / totalLeads : 0

  const insights: { type: 'success' | 'warning' | 'danger' | 'info'; text: string }[] = []
  if (totalCpl > 0 && totalCpl < 40) insights.push({ type: 'success', text: `CPL de ${brl2(totalCpl)} abaixo do benchmark de R$40. Bom momento para escalar.` })
  if (totalCpl > 70) insights.push({ type: 'danger', text: `CPL de ${brl2(totalCpl)} acima do ideal. Revisar criativos e segmentação.` })
  const highFreq = adsets.filter(a => a.frequency > 2.5 && a.status === 'ACTIVE')
  if (highFreq.length > 0) insights.push({ type: 'warning', text: `${highFreq.length} conjunto(s) com frequência > 2,5x. Risco de saturação de público.` })
  const pausedWithLeads = metaCampaigns.filter(c => c.status === 'PAUSED' && c.leads > 0)
  if (pausedWithLeads.length > 0) insights.push({ type: 'info', text: `${pausedWithLeads.length} campanha(s) pausada(s) com leads. Avalie reativação.` })
  if (insights.length === 0) insights.push({ type: 'info', text: 'Nenhuma recomendação automática gerada para o período.' })

  return (
    <div className="space-y-5">
      {/* Filial info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">{filial.label}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {filial.budgetMeta > 0 ? `Orçamento ${brl(filial.budgetMeta)}/mês` : 'Orçamento não configurado'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filial.metaAccounts.map(a => <span key={a.id} className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded-full">📘 {a.label}</span>)}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Leads" value={loading.meta ? '—' : num(totalLeads)} sub="leads gerados no período" loading={loading.meta} color="blue" />
        <KpiCard label="CPL Médio" value={totalCpl > 0 ? brl2(totalCpl) : '—'} sub="custo por lead" loading={loading.meta} color="green" />
        <KpiCard label="Investimento" value={brl(totalSpend)} sub="Meta Ads" loading={loading.meta} color="orange" />
        <KpiCard label="CTR Médio" value={metaKpi.ctr > 0 ? `${metaKpi.ctr.toFixed(2)}%` : '—'} sub="Meta Ads" loading={loading.meta} color="purple" />
      </div>

      {/* Gráficos diários */}
      <Section title="Evolução Diária — Meta ADS" icon="📈">
        <DailyCharts data={dailyData} loading={loading.daily} />
      </Section>

      {/* Campanhas */}
      <Section title="Meta ADS — Campanhas" icon="📊">
        <CampaignTable campaigns={metaCampaigns} loading={loading.meta} />
      </Section>

      {/* Criativos */}
      <Section title="Criativos Campeões" icon="🏆">
        {loading.creatives ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}</div>
          : creatives.length === 0 ? <p className="text-zinc-500 text-sm text-center py-6">Nenhum criativo com dados no período</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-800">
                  {['Criativo', 'Conjunto', 'Status', 'Leads', 'CPL', 'Gasto', 'CTR', ''].map(h => (
                    <th key={h} className={`py-2 px-3 text-zinc-500 font-normal text-xs ${['Leads','CPL','Gasto','CTR'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {creatives.slice(0, 20).map((ad, i) => (
                    <tr key={ad.id ?? i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                      <td className="py-2.5 px-3 max-w-xs"><div className="truncate text-xs text-zinc-200">{ad.name}</div>{ad.accountLabel && <div className="text-zinc-600 text-xs">{ad.accountLabel}</div>}</td>
                      <td className="py-2.5 px-3 text-zinc-400 text-xs max-w-xs truncate">{ad.adset}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={ad.status} /></td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">{ad.leads}</td>
                      <td className="py-2.5 px-3 text-right">{ad.cpl > 0 ? <Pill v={ad.cpl} good={40} warn={70} /> : <span className="text-zinc-600">—</span>}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{brl2(ad.spend)}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">{ad.ctr.toFixed(2)}%</td>
                      <td className="py-2.5 px-3"><a href={ad.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-400 underline">Ver</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Section>

      {/* Públicos */}
      <Section title="Meta ADS — Desempenho por Público" icon="🎯">
        {loading.adsets ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}</div>
          : adsets.length === 0 ? <p className="text-zinc-500 text-sm text-center py-6">Nenhum conjunto de anúncios no período</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-800">
                  {['Conjunto', 'Status', 'Leads', 'Gasto', 'CPL', 'Frequência', 'Alcance'].map(h => (
                    <th key={h} className={`py-2 px-3 text-zinc-500 font-normal text-xs ${['Conjunto','Status'].includes(h) ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[...adsets].sort((a, b) => b.leads - a.leads || b.spend - a.spend).map((s, i) => (
                    <tr key={s.id ?? i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                      <td className="py-2.5 px-3 text-zinc-200 text-xs max-w-xs truncate">{s.name}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={s.status} /></td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">{s.leads}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{brl2(s.spend)}</td>
                      <td className="py-2.5 px-3 text-right">{s.leads > 0 ? <Pill v={s.spend / s.leads} good={40} warn={70} /> : <span className="text-zinc-600">—</span>}</td>
                      <td className="py-2.5 px-3 text-right"><span className={s.frequency > 2.5 ? 'text-orange-400 font-semibold' : 'text-zinc-300'}>{s.frequency.toFixed(1)}x {s.frequency > 2.5 && '⚠️'}</span></td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">{num(s.reach)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Section>

      {/* Insights */}
      <Section title="Insights e Recomendações" icon="💡">
        <div className="space-y-2.5">{insights.map((ins, i) => <InsightItem key={i} {...ins} />)}</div>
      </Section>
    </div>
  )
}

// ─── Página de Analytics + CRM ───────────────────────────────────────────────
function AnalyticsPage() {
  const [overviewPeriod, setOverviewPeriod] = useState('current-month')
  const [crmPeriod, setCrmPeriod] = useState('current-month')
  const { from: ovFrom, to: ovTo } = getPeriodDates(overviewPeriod)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loadingOverview, setLoadingOverview] = useState(true)

  useEffect(() => {
    setLoadingOverview(true)
    fetch(`/api/meta/overview?from=${ovFrom}&to=${ovTo}`).then(r => r.json()).then(d => { setAccounts(d.accounts ?? []); setLoadingOverview(false) }).catch(() => setLoadingOverview(false))
  }, [ovFrom, ovTo])

  const { from: crmFrom, to: crmTo } = getPeriodDates(crmPeriod)
  const [funnel, setFunnel] = useState<CrmFunnel | null>(null)
  const [sellers, setSellers] = useState<SellerStats[]>([])
  const [loadingCrm, setLoadingCrm] = useState(true)

  useEffect(() => {
    setLoadingCrm(true)
    fetch(`/api/crm?from=${crmFrom}&to=${crmTo}`).then(r => r.json()).then(d => { setFunnel(d.funnel); setSellers(d.sellers ?? []); setLoadingCrm(false) }).catch(() => setLoadingCrm(false))
  }, [crmFrom, crmTo])

  const funnelSteps = [
    { key: 'total' as const,            label: 'Total Leads',       icon: '📥', bg: 'rgba(37,99,235,0.15)' },
    { key: 'tentativaContato' as const, label: 'Tent. Contato',     icon: '📞', bg: 'rgba(99,102,241,0.15)' },
    { key: 'leadQualificada' as const,  label: 'Lead Qualificada',  icon: '✅', bg: 'rgba(139,92,246,0.15)' },
    { key: 'orcamento' as const,        label: 'Orçamento',         icon: '📋', bg: 'rgba(168,85,247,0.15)' },
    { key: 'proposta' as const,         label: 'Proposta',          icon: '🤝', bg: 'rgba(234,88,12,0.15)' },
    { key: 'comprou' as const,          label: 'Comprou',           icon: '🏆', bg: 'rgba(16,185,129,0.15)' },
  ]

  return (
    <div className="space-y-5">

      {/* ── Meta ADS — Visão Geral por Conta ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Meta ADS — Visão Geral</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Todas as contas do Studio Modular</p>
        </div>
        <PeriodSelect value={overviewPeriod} onChange={setOverviewPeriod} />
      </div>

      {loadingOverview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                <div>
                  <div className="text-xs font-medium text-zinc-300">{acc.label}</div>
                  <div className="text-xs text-zinc-600">{acc.filial}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Leads</span>
                  <span className="text-sm font-bold text-blue-400">{acc.leads ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Investimento</span>
                  <span className="text-sm font-bold text-orange-400">{brl2(acc.spend ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Impressões</span>
                  <span className="text-sm font-semibold text-zinc-300">{num(acc.impressions ?? 0)}</span>
                </div>
                {(acc.leads ?? 0) > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">CPL</span>
                    <Pill v={(acc.spend ?? 0) / (acc.leads ?? 1)} good={40} warn={70} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {FEATURES.crm && (<>
      <div className="border-t border-zinc-800 pt-2" />
      {/* ── CRM ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">CRM — Tintim</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Jornada de compra</p>
        </div>
        <PeriodSelect value={crmPeriod} onChange={setCrmPeriod} />
      </div>

      {loadingCrm ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />)}</div>
          <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
        </div>
      ) : !funnel ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">CRM não configurado ou sem dados</div>
      ) : (() => {
        const taxaQualificacao = funnel.total > 0 ? (funnel.leadQualificada / funnel.total) * 100 : 0
        const taxaFechamento   = funnel.total > 0 ? (funnel.comprou / funnel.total) * 100 : 0
        const taxaContato      = funnel.total > 0 ? (funnel.tentativaContato / funnel.total) * 100 : 0

        // Conversão etapa → próxima etapa
        const stepConv = (a: number, b: number) => a > 0 ? ((b / a) * 100).toFixed(0) + '%' : '—'

        // Identifica gargalo: etapa com maior queda relativa
        const drops = [
          { label: 'Lead → Contato',       from: funnel.total,            to: funnel.tentativaContato },
          { label: 'Contato → Qualif.',    from: funnel.tentativaContato, to: funnel.leadQualificada },
          { label: 'Qualif. → Orçamento',  from: funnel.leadQualificada,  to: funnel.orcamento },
          { label: 'Orçamento → Proposta', from: funnel.orcamento,        to: funnel.proposta },
          { label: 'Proposta → Venda',     from: funnel.proposta,         to: funnel.comprou },
        ].filter(d => d.from > 0)
        const bottleneck = drops.reduce((worst, d) => {
          const loss = (d.from - d.to) / d.from
          return loss > (worst ? (worst.from - worst.to) / worst.from : 0) ? d : worst
        }, null as typeof drops[0] | null)

        return (
          <>
            {/* KPIs de conversão */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Total de Leads</div>
                <div className="text-2xl font-bold text-blue-400">{funnel.total}</div>
                <div className="text-xs text-zinc-600 mt-1">entraram no funil</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Taxa de Contato</div>
                <div className={`text-2xl font-bold ${taxaContato >= 60 ? 'text-emerald-400' : taxaContato >= 30 ? 'text-orange-400' : 'text-red-400'}`}>{taxaContato.toFixed(0)}%</div>
                <div className="text-xs text-zinc-600 mt-1">{funnel.tentativaContato} abordados</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Taxa de Qualificação</div>
                <div className={`text-2xl font-bold ${taxaQualificacao >= 20 ? 'text-emerald-400' : taxaQualificacao >= 10 ? 'text-orange-400' : 'text-red-400'}`}>{taxaQualificacao.toFixed(0)}%</div>
                <div className="text-xs text-zinc-600 mt-1">{funnel.leadQualificada} qualificados</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">Taxa de Fechamento</div>
                <div className={`text-2xl font-bold ${taxaFechamento >= 3 ? 'text-emerald-400' : taxaFechamento >= 1 ? 'text-orange-400' : 'text-zinc-400'}`}>{taxaFechamento.toFixed(1)}%</div>
                <div className="text-xs text-zinc-600 mt-1">{funnel.comprou} vendas</div>
              </div>
            </div>

            {/* Funil visual */}
            <Section title="Jornada de Compra" icon="🔄">
              <div className="space-y-2">
                {funnelSteps.map((step, i) => {
                  const value = funnel[step.key]
                  const max = funnel.total || 1
                  const barPct = (value / max) * 100
                  const nextStep = funnelSteps[i + 1]
                  const nextValue = nextStep ? funnel[nextStep.key] : null

                  return (
                    <div key={step.key}>
                      <div className="flex items-center gap-3">
                        <div className="w-36 shrink-0 text-right">
                          <span className="text-xs text-zinc-400">{step.label}</span>
                        </div>
                        <div className="flex-1 bg-zinc-800 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center pl-3 transition-all duration-500"
                            style={{ width: `${Math.max(barPct, 2)}%`, background: step.bg.replace('0.15', '0.6') }}
                          />
                        </div>
                        <div className="w-10 text-right text-sm font-bold text-white shrink-0">{value}</div>
                        <div className="w-12 text-right text-xs text-zinc-500 shrink-0">
                          {step.key !== 'total' ? `${((value / max) * 100).toFixed(0)}%` : ''}
                        </div>
                      </div>
                      {nextStep && nextValue !== null && value > 0 && (
                        <div className="flex items-center gap-3 py-0.5">
                          <div className="w-36 shrink-0" />
                          <div className="flex-1 flex items-center gap-1 pl-2">
                            <span className="text-zinc-700 text-xs">↓</span>
                            <span className="text-xs text-zinc-600">
                              conversão {step.label} → {nextStep.label}: <span className={`font-medium ${parseInt(stepConv(value, nextValue)) >= 50 ? 'text-emerald-600' : parseInt(stepConv(value, nextValue)) >= 20 ? 'text-orange-600' : 'text-red-600'}`}>{stepConv(value, nextValue)}</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Section>

            {/* Gargalo */}
            {bottleneck && (funnel.total > 0) && (
              <Section title="Análise do Funil" icon="💡">
                <div className="space-y-2.5">
                  <InsightItem
                    type={((bottleneck.from - bottleneck.to) / bottleneck.from) > 0.7 ? 'danger' : 'warning'}
                    text={`Maior gargalo: ${bottleneck.label} — ${((bottleneck.from - bottleneck.to) / bottleneck.from * 100).toFixed(0)}% dos leads não avançam nessa etapa (${bottleneck.from - bottleneck.to} perdidos).`}
                  />
                  {funnel.comprou > 0 && (
                    <InsightItem type="success" text={`${funnel.comprou} venda${funnel.comprou > 1 ? 's' : ''} no período — conversão final de ${taxaFechamento.toFixed(1)}% do total de leads.`} />
                  )}
                  {funnel.total === 0 && (
                    <InsightItem type="info" text="Nenhum lead registrado no período. Verifique se o webhook do Tintim está configurado." />
                  )}
                </div>
              </Section>
            )}
          </>
        )
      })()}
      </>)}
    </div>
  )
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────
export default function StudioModularDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(FILIAIS[0]?.id ?? 'geral')
  const [period, setPeriod] = useState('current-month')

  const isFilialTab = FILIAIS.some(f => f.id === activeTab)

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">SM</div>
            <div>
              <h1 className="text-sm font-semibold text-white">{CLIENT.name}</h1>
              <p className="text-xs text-zinc-500">Dashboard de Performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isFilialTab && <PeriodSelect value={period} onChange={setPeriod} />}
            <button onClick={handleLogout} className="text-zinc-500 hover:text-zinc-300 text-xs px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors">Sair</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isFilialTab && <AdsPage filialId={activeTab} period={period} />}
        {activeTab === 'analytics' && <AnalyticsPage />}
      </main>
    </div>
  )
}
