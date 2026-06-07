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

function matchTypeLabel(t: string) {
  const map: Record<string, string> = { EXACT: 'Exata', PHRASE: 'Frase', BROAD: 'Ampla' }
  return map[t] ?? t
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
  const [googleCampaigns, setGoogleCampaigns] = useState<Campaign[]>([])
  const [adsets, setAdsets] = useState<any[]>([])
  const [creatives, setCreatives] = useState<any[]>([])
  const [keywords, setKeywords] = useState<any[]>([])
  const [auctionInsights, setAuctionInsights] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<{ date: string; spend: number; leads: number }[]>([])
  const [loading, setLoading] = useState({ meta: true, google: true, adsets: true, creatives: true, keywords: true, auction: true, balance: true, daily: true })

  const fetchAll = useCallback(async () => {
    setLoading({ meta: true, google: true, adsets: true, creatives: true, keywords: true, auction: true, balance: true, daily: true })
    const p = `filial=${filialId}&from=${from}&to=${to}`
    const [m, g, a, c, kw, ai, bal, daily] = await Promise.allSettled([
      fetch(`/api/meta?${p}`).then(r => r.json()),
      fetch(`/api/google-ads?${p}`).then(r => r.json()),
      fetch(`/api/meta/adsets?${p}`).then(r => r.json()),
      fetch(`/api/meta/creatives?${p}`).then(r => r.json()),
      fetch(`/api/google-ads/keywords?${p}`).then(r => r.json()),
      fetch(`/api/google-ads/auction-insights?${p}`).then(r => r.json()),
      fetch(`/api/google-ads/balance?filial=${filialId}`).then(r => r.json()),
      fetch(`/api/meta/daily?${p}`).then(r => r.json()),
    ])
    if (m.status === 'fulfilled') setMetaCampaigns(m.value.campaigns ?? [])
    if (g.status === 'fulfilled') setGoogleCampaigns(g.value.campaigns ?? [])
    if (a.status === 'fulfilled') setAdsets(a.value.adsets ?? [])
    if (c.status === 'fulfilled') setCreatives(c.value.ads ?? [])
    if (kw.status === 'fulfilled') setKeywords(kw.value.keywords ?? [])
    if (ai.status === 'fulfilled') setAuctionInsights(ai.value.insights ?? [])
    if (bal.status === 'fulfilled') setBalances(bal.value.balances ?? [])
    if (daily.status === 'fulfilled') setDailyData(daily.value.daily ?? [])
    setLoading({ meta: false, google: false, adsets: false, creatives: false, keywords: false, auction: false, balance: false, daily: false })
  }, [filialId, from, to])

  useEffect(() => { fetchAll() }, [fetchAll])

  const metaKpi = aggregateKpi(metaCampaigns)
  const googleKpi = aggregateKpi(googleCampaigns)
  const totalLeads = metaKpi.leads + googleKpi.leads
  const totalSpend = metaKpi.spend + googleKpi.spend
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
          <p className="text-xs text-zinc-500 mt-0.5">{filial.products.join(' · ')} · Orçamento {brl(filial.budgetMeta + filial.budgetGoogle)}/mês</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filial.metaAccounts.map(a => <span key={a.id} className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded-full">📘 {a.label}</span>)}
          {filial.googleAdsAccounts.map(a => <span key={a.id} className="text-xs bg-red-900/30 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full">🔴 {a.label}</span>)}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Leads" value={loading.meta && loading.google ? '—' : num(totalLeads)} sub={`Meta ${metaKpi.leads} · Google ${googleKpi.leads}`} loading={loading.meta && loading.google} color="blue" />
        <KpiCard label="CPL Médio" value={totalCpl > 0 ? brl2(totalCpl) : '—'} sub="custo por lead" loading={loading.meta && loading.google} color="green" />
        <KpiCard label="Investimento" value={brl(totalSpend)} sub={`Meta ${brl(metaKpi.spend)}`} loading={loading.meta && loading.google} color="orange" />
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

      {/* Google Ads */}
      {filial.googleAdsAccounts.length > 0 && (
        <>
        <Section title="Google Ads — Campanhas" icon="🔴">
          {/* KPIs + Saldo restante */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="text-center bg-zinc-800/40 rounded-lg p-3">
              <div className="text-xl font-bold text-red-400">{googleKpi.leads}</div>
              <div className="text-xs text-zinc-500">Conversões</div>
            </div>
            <div className="text-center bg-zinc-800/40 rounded-lg p-3">
              <div className="text-xl font-bold text-emerald-400">{googleKpi.cpl > 0 ? brl2(googleKpi.cpl) : '—'}</div>
              <div className="text-xs text-zinc-500">CPL</div>
            </div>
            <div className="text-center bg-zinc-800/40 rounded-lg p-3">
              <div className="text-xl font-bold text-orange-400">{brl2(googleKpi.spend)}</div>
              <div className="text-xs text-zinc-500">Investido</div>
            </div>
            <div className="text-center bg-zinc-800/40 rounded-lg p-3">
              {loading.balance ? (
                <div className="h-7 w-20 bg-zinc-700 rounded animate-pulse mx-auto" />
              ) : (() => {
                const totalAvailable = balances.reduce((s, b) => s + (b.available ?? 0), 0)
                const hasData = balances.some(b => b.available != null)
                return <>
                  <div className={`text-xl font-bold ${!hasData ? 'text-zinc-600' : totalAvailable > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {hasData ? brl2(totalAvailable) : '—'}
                  </div>
                  <div className="text-xs text-zinc-500">Fundos disponíveis</div>
                </>
              })()}
            </div>
          </div>
          <CampaignTable campaigns={googleCampaigns} loading={loading.google} />
        </Section>

        {/* Palavras-chave */}
        <Section title="Google Ads — Palavras-chave" icon="🔑">
          {loading.keywords ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}</div>
          ) : keywords.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">Sem dados de palavras-chave para o período — aguardando aprovação de acesso básico Google Ads</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-800">
                  {['Palavra-chave', 'Tipo', 'QS', 'Impressões', 'Cliques', 'CTR', 'CPC Médio', 'Gasto', 'Conv.'].map(h => (
                    <th key={h} className={`py-2 px-3 text-zinc-500 font-normal text-xs ${['Palavra-chave','Tipo'].includes(h) ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {keywords.map((kw, i) => (
                    <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                      <td className="py-2.5 px-3 text-zinc-200 text-xs max-w-xs">{kw.keyword}</td>
                      <td className="py-2.5 px-3 text-zinc-500 text-xs">{matchTypeLabel(kw.matchType)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {kw.qualityScore ? (
                          <span className={`font-semibold text-xs ${kw.qualityScore >= 7 ? 'text-emerald-400' : kw.qualityScore >= 5 ? 'text-orange-400' : 'text-red-400'}`}>
                            {kw.qualityScore}/10
                          </span>
                        ) : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{num(kw.impressions)}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{num(kw.clicks)}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-400">{kw.ctr.toFixed(2)}%</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{brl2(kw.avgCpc)}</td>
                      <td className="py-2.5 px-3 text-right text-orange-400">{brl2(kw.spend)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{Math.round(kw.conversions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Informações de Leilão */}
        <Section title="Google Ads — Informações de Leilão" icon="⚔️">
          {loading.auction ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />)}</div>
          ) : auctionInsights.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">Sem dados de leilão para o período — aguardando aprovação de acesso básico Google Ads</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-zinc-800">
                  {['Concorrente', 'Parcela Imp.', 'Sobreposição', 'Acima', 'Topo Pág.', 'Topo Abs.', 'Supera'].map(h => (
                    <th key={h} className={`py-2 px-3 text-zinc-500 font-normal text-xs ${h === 'Concorrente' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {auctionInsights.map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                      <td className="py-2.5 px-3 text-zinc-200 text-xs">{row.domain || '(você)'}</td>
                      <td className="py-2.5 px-3 text-right text-blue-400">{row.impressionShare}%</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{row.overlapRate}%</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{row.positionAboveRate}%</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{row.topImpressionShare}%</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{row.absTopImpressionShare}%</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">{row.outrankingShare}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
        </>
      )}

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
  const [ga4Period, setGa4Period] = useState('current-month')
  const [crmPeriod, setCrmPeriod] = useState('current-month')
  const { from: ovFrom, to: ovTo } = getPeriodDates(overviewPeriod)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loadingOverview, setLoadingOverview] = useState(true)

  useEffect(() => {
    setLoadingOverview(true)
    fetch(`/api/meta/overview?from=${ovFrom}&to=${ovTo}`).then(r => r.json()).then(d => { setAccounts(d.accounts ?? []); setLoadingOverview(false) }).catch(() => setLoadingOverview(false))
  }, [ovFrom, ovTo])
  const { from: ga4From, to: ga4To } = getPeriodDates(ga4Period)
  const { from: crmFrom, to: crmTo } = getPeriodDates(crmPeriod)

  const [ga4, setGa4] = useState<Ga4Data | null>(null)
  const [loadingGa4, setLoadingGa4] = useState(true)
  const [funnel, setFunnel] = useState<CrmFunnel | null>(null)
  const [sellers, setSellers] = useState<SellerStats[]>([])
  const [loadingCrm, setLoadingCrm] = useState(true)

  useEffect(() => {
    setLoadingGa4(true)
    fetch(`/api/ga4?from=${ga4From}&to=${ga4To}`).then(r => r.json()).then(d => { setGa4(d.data); setLoadingGa4(false) }).catch(() => setLoadingGa4(false))
  }, [ga4From, ga4To])

  useEffect(() => {
    setLoadingCrm(true)
    fetch(`/api/crm?from=${crmFrom}&to=${crmTo}`).then(r => r.json()).then(d => { setFunnel(d.funnel); setSellers(d.sellers ?? []); setLoadingCrm(false) }).catch(() => setLoadingCrm(false))
  }, [crmFrom, crmTo])

  const funnelSteps = [
    { key: 'total' as const, label: 'Total Leads', icon: '📥', bg: 'rgba(37,99,235,0.15)' },
    { key: 'scheduled' as const, label: 'Agendados', icon: '📅', bg: 'rgba(99,102,241,0.15)' },
    { key: 'visited' as const, label: 'Visitaram', icon: '🏠', bg: 'rgba(139,92,246,0.15)' },
    { key: 'negotiating' as const, label: 'Em Negociação', icon: '🤝', bg: 'rgba(168,85,247,0.15)' },
    { key: 'closed' as const, label: 'Fechados', icon: '🏆', bg: 'rgba(16,185,129,0.15)' },
  ]

  return (
    <div className="space-y-5">

      {/* ── Meta ADS — Visão Geral por Conta ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Meta ADS — Por Conta</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Todas as contas da GPinheiro</p>
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

      <div className="border-t border-zinc-800 pt-2" />

      {/* ── Google Analytics ── */}
      {FEATURES.ga4 && (<>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Google Analytics</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{CLIENT.website} — dados unificados do site</p>
        </div>
        <PeriodSelect value={ga4Period} onChange={setGa4Period} />
      </div>

      {loadingGa4 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-800 rounded-xl animate-pulse" />)}</div>
      ) : !ga4 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">GA4 sem dados para o período</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Sessões" value={num(ga4.sessions)} color="purple" />
            <KpiCard label="Novos usuários" value={num(ga4.newUsers)} color="blue" />
            <KpiCard label="Taxa de rejeição" value={`${ga4.bounceRate.toFixed(1)}%`} color={ga4.bounceRate > 60 ? 'orange' : 'green'} />
            <KpiCard label="Taxa de conversão" value={`${ga4.conversionRate.toFixed(2)}%`} color="green" />
          </div>
          <Section title="Páginas com mais sessões" icon="🌐">
            {ga4.topPages.length === 0 ? <p className="text-zinc-500 text-sm text-center py-4">Sem dados</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">{['Página','Sessões','Leads','Conversão'].map(h => <th key={h} className={`py-2 px-3 text-zinc-500 font-normal text-xs ${h==='Página'?'text-left':'text-right'}`}>{h}</th>)}</tr></thead>
                  <tbody>{ga4.topPages.map(p => (
                    <tr key={p.path} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                      <td className="py-2.5 px-3 text-zinc-300 text-xs max-w-xs truncate">{p.path}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-300">{num(p.sessions)}</td>
                      <td className="py-2.5 px-3 text-right text-blue-400 font-medium">{p.leads}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400">{p.conversionRate.toFixed(1)}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
      </>)}

      {FEATURES.crm && (<>
      {/* ── CRM ── */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-white">CRM — Contact 2 Sales</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Funil de leads — todas as filiais</p>
        </div>
        <PeriodSelect value={crmPeriod} onChange={setCrmPeriod} />
      </div>

      {loadingCrm ? (
        <div className="space-y-4"><div className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" /><div className="h-40 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" /></div>
      ) : !funnel ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">CRM sem dados para o período</div>
      ) : (
        <>
          <Section title="Funil de Leads" icon="📊">
            <div className="grid grid-cols-5 gap-2">
              {funnelSteps.map((step, i) => {
                const value = funnel[step.key]
                const pct = funnel.total > 0 ? ((value / funnel.total) * 100).toFixed(0) : '0'
                return (
                  <div key={step.key} className="relative">
                    <div className="rounded-xl p-4 text-center border border-zinc-800" style={{ background: step.bg }}>
                      <div className="text-2xl mb-1">{step.icon}</div>
                      <div className="text-2xl font-bold text-white">{value}</div>
                      <div className="text-xs text-zinc-400 mt-1">{step.label}</div>
                      {step.key !== 'total' && <div className="text-xs text-zinc-600 mt-0.5">{pct}%</div>}
                    </div>
                    {i < funnelSteps.length - 1 && <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 text-zinc-600 text-lg hidden md:block">›</div>}
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="Por Atendente" icon="👤">
            {sellers.length === 0 ? <p className="text-zinc-500 text-sm text-center py-4">Sem dados de atendentes</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">{['Atendente','Total','Agendados','Em Negociação','Fechados','Tempo médio'].map(h => <th key={h} className={`py-2 px-3 text-zinc-500 font-normal text-xs ${h==='Atendente'?'text-left':'text-right'}`}>{h}</th>)}</tr></thead>
                  <tbody>{sellers.map(s => (
                    <tr key={s.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                      <td className="py-2.5 px-3 text-zinc-200">{s.name}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">{s.total}</td>
                      <td className="py-2.5 px-3 text-right text-indigo-400">{s.scheduled}</td>
                      <td className="py-2.5 px-3 text-right text-purple-400">{s.negotiating}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{s.closed}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-400 text-xs">{s.avgResponseMinutes > 0 ? (s.avgResponseMinutes < 60 ? `${s.avgResponseMinutes}min` : `${(s.avgResponseMinutes/60).toFixed(1)}h`) : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
      </>)}
    </div>
  )
}

// ─── Página de CRM ────────────────────────────────────────────────────────────
function CrmPage() {
  const [period, setPeriod] = useState('current-month')
  const { from, to } = getPeriodDates(period)
  const [funnel, setFunnel] = useState<CrmFunnel | null>(null)
  const [sellers, setSellers] = useState<SellerStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/crm?from=${from}&to=${to}`).then(r => r.json()).then(d => {
      setFunnel(d.funnel); setSellers(d.sellers ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [from, to])

  const funnelSteps = [
    { key: 'total' as const, label: 'Total Leads', icon: '📥', bg: 'rgba(37,99,235,0.15)' },
    { key: 'scheduled' as const, label: 'Agendados', icon: '📅', bg: 'rgba(99,102,241,0.15)' },
    { key: 'visited' as const, label: 'Visitaram', icon: '🏠', bg: 'rgba(139,92,246,0.15)' },
    { key: 'negotiating' as const, label: 'Em Negociação', icon: '🤝', bg: 'rgba(168,85,247,0.15)' },
    { key: 'closed' as const, label: 'Fechados', icon: '🏆', bg: 'rgba(16,185,129,0.15)' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">CRM — Contact 2 Sales</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Funil de leads e atendimento — todas as filiais</p>
        </div>
        <PeriodSelect value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="space-y-4"><div className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" /><div className="h-40 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" /></div>
      ) : !funnel ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">CRM não configurado ou sem dados</div>
      ) : (
        <>
          {/* Funil */}
          <Section title="Funil de Leads" icon="📊">
            <div className="grid grid-cols-5 gap-2">
              {funnelSteps.map((step, i) => {
                const value = funnel[step.key]
                const pct = funnel.total > 0 ? ((value / funnel.total) * 100).toFixed(0) : '0'
                return (
                  <div key={step.key} className="relative">
                    <div className="rounded-xl p-4 text-center border border-zinc-800" style={{ background: step.bg }}>
                      <div className="text-xl mb-1">{step.icon}</div>
                      <div className="text-2xl font-bold text-white">{value}</div>
                      <div className="text-xs text-zinc-400 mt-1">{step.label}</div>
                      {step.key !== 'total' && <div className="text-xs text-zinc-600 mt-0.5">{pct}%</div>}
                    </div>
                    {i < funnelSteps.length - 1 && <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 text-zinc-600 text-lg hidden md:block">›</div>}
                  </div>
                )
              })}
            </div>
          </Section>

          {/* Por Atendente */}
          <Section title="Por Atendente" icon="👤">
            {sellers.length === 0 ? <p className="text-zinc-500 text-sm text-center py-4">Sem dados de atendentes</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-zinc-800">
                    {['Atendente', 'Total', 'Agendados', 'Em Negociação', 'Fechados', 'Tempo médio'].map(h => (
                      <th key={h} className={`py-2 px-3 text-zinc-500 font-normal text-xs ${h === 'Atendente' ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {sellers.map(s => (
                      <tr key={s.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                        <td className="py-2.5 px-3 text-zinc-200">{s.name}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{s.total}</td>
                        <td className="py-2.5 px-3 text-right text-indigo-400">{s.scheduled}</td>
                        <td className="py-2.5 px-3 text-right text-purple-400">{s.negotiating}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{s.closed}</td>
                        <td className="py-2.5 px-3 text-right text-zinc-400 text-xs">
                          {s.avgResponseMinutes > 0 ? (s.avgResponseMinutes < 60 ? `${s.avgResponseMinutes}min` : `${(s.avgResponseMinutes / 60).toFixed(1)}h`) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

// ─── Dashboard Principal ──────────────────────────────────────────────────────
export default function GPinheiroDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('florianopolis')
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">GP</div>
            <div>
              <h1 className="text-sm font-semibold text-white">GPinheiro</h1>
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
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
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
