import { useState } from 'react'
import { Loader } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import {
  useRevenue, useTopServices,
  useEmployeeStats, useCancellations,
} from '../../hooks/useAdmin'

/* ── Design tokens mirrored for Recharts ─────────────────────────────────── */
const GOLD   = '#c9a84c'
const BLACK  = '#111111'
const BORDER = '#e4e4e0'
const MID    = '#999999'
const LIGHT  = '#bbbbbb'

const CHART_COLORS = ['#111111','#c9a84c','#555555','#888888','#d4aa55','#333333']

/* ── Shared tooltip style ─────────────────────────────────────────────────── */
const tooltipStyle = {
  contentStyle: {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 0,
    fontFamily: 'Barlow, sans-serif',
    fontSize: 12,
  },
  labelStyle: { color: BLACK, fontWeight: 500, marginBottom: 4 },
  itemStyle:  { color: MID },
}

/* ── Date range presets ───────────────────────────────────────────────────── */
const RANGES = [
  { label: '7j',  days: 7  },
  { label: '30j', days: 30 },
  { label: '90j', days: 90 },
]

function RangePicker({ days, onChange }) {
  return (
    <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
      {RANGES.map(r => (
        <button key={r.days} onClick={() => onChange(r.days)}
          style={{
            padding: '7px 16px', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'var(--sans)', border: 'none',
            background: days === r.days ? BLACK : 'var(--white)',
            color: days === r.days ? 'var(--white)' : 'var(--mid)',
            transition: 'all 0.15s',
            borderRight: '1px solid var(--border)',
          }}>
          {r.label}
        </button>
      ))}
    </div>
  )
}

function ChartCard({ title, children, isLoading }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', padding: '24px' }}>
      <p style={{ fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: 'var(--text)', marginBottom: 20,
        borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {title}
      </p>
      {isLoading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader size={18} style={{ animation: 'spin .8s linear infinite', color: 'var(--hint)' }} />
          </div>
        : children
      }
    </div>
  )
}

/* ── Custom bar label showing DT ─────────────────────────────────────────── */
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`,
      padding: '10px 14px', fontFamily: 'Barlow, sans-serif', fontSize: 12 }}>
      <p style={{ color: BLACK, fontWeight: 500, marginBottom: 4 }}>{label}</p>
      <p style={{ color: GOLD }}>{parseFloat(payload[0].value).toFixed(2)} DT</p>
    </div>
  )
}

export default function AdminAnalytics() {
  const [rangeDays, setRangeDays] = useState(30)

  const fromDate = dayjs().subtract(rangeDays, 'day').format('YYYY-MM-DD')
  const toDate   = dayjs().format('YYYY-MM-DD')
  const params   = { from_date: fromDate, to_date: toDate }

  const { data: revenue,    isLoading: loadRev  } = useRevenue(params)
  const { data: topSvcs,    isLoading: loadSvcs } = useTopServices(params)
  const { data: empStats,   isLoading: loadEmp  } = useEmployeeStats(params)
  const { data: cancelData, isLoading: loadCanc } = useCancellations(params)

  /* ── Revenue chart data ──────────────────────────────────────────────────── */
  const revenueByDay = (revenue?.revenue_by_day ?? []).map(r => ({
    date:  dayjs(r.date).format(rangeDays <= 7 ? 'ddd D' : 'D MMM'),
    total: parseFloat(r.total),
  }))

  const revenueByMonth = (revenue?.revenue_by_month ?? []).map(r => ({
    month: dayjs(r.month).format('MMM YY'),
    total: parseFloat(r.total),
  }))

  /* ── Top services pie data ───────────────────────────────────────────────── */
  const pieData = (topSvcs?.services ?? []).slice(0, 5).map(s => ({
    name:  s.service_name,
    value: s.booking_count,
  }))

  /* ── Employee performance data ───────────────────────────────────────────── */
  const empData = (empStats?.employees ?? []).map(e => ({
    name:      e.employee_name.split(' ')[0],
    rdv:       e.total_appointments,
    termines:  e.completed_appointments,
    revenus:   parseFloat(e.total_revenue),
    note:      e.avg_rating,
  }))

  /* ── Status distribution ─────────────────────────────────────────────────── */
  const statusLabels = {
    pending: 'En attente', confirmed: 'Confirmé',
    arrived: 'Arrivé', completed: 'Terminé',
    no_show: 'Absent', cancelled: 'Annulé',
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Administration</p>
          <h1 className="page-title">Analytiques</h1>
        </div>
        <RangePicker days={rangeDays} onChange={setRangeDays} />
      </div>

      {/* KPI row */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        {[
          { n: revenue?.total ? `${parseFloat(revenue.total).toFixed(0)} DT` : '—',
            l: `Revenu (${rangeDays}j)` },
          { n: revenue?.paid_count ?? '—',     l: 'Paiements reçus' },
          { n: cancelData?.total_appointments ?? '—', l: 'RDV total' },
          { n: cancelData?.cancellation_rate_pct != null
              ? `${cancelData.cancellation_rate_pct}%` : '—',
            l: 'Taux d\'annulation' },
        ].map(({ n, l }) => (
          <div key={l} className="stat-cell">
            <div className="stat-n">{n}</div>
            <div className="stat-l">{l}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Revenue over time */}
        <div style={{ gridColumn: '1 / -1' }}>
          <ChartCard title={`Revenu journalier — ${rangeDays} derniers jours`} isLoading={loadRev}>
            {revenueByDay.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--light)',
                padding: '24px 0', fontStyle: 'italic' }}>Aucune donnée.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByDay} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: LIGHT, fontFamily: 'Barlow, sans-serif' }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: LIGHT, fontFamily: 'Barlow, sans-serif' }}
                    axisLine={false} tickLine={false} />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(201,168,76,0.06)' }} />
                  <Bar dataKey="total" fill={BLACK} radius={0} maxBarSize={40}>
                    {revenueByDay.map((_, i) => (
                      <Cell key={i}
                        fill={i === revenueByDay.length - 1 ? GOLD : BLACK}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Top services — pie */}
        <ChartCard title="Services les plus réservés" isLoading={loadSvcs}>
          {pieData.length === 0 ? (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--light)',
              padding: '24px 0', fontStyle: 'italic' }}>Aucune donnée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={44}
                  paddingAngle={2}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: MID, fontFamily: 'Barlow, sans-serif' }}>
                      {value}
                    </span>
                  )}
                  iconType="square"
                  iconSize={8}
                />
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Cancellation by initiator */}
        <ChartCard title="Annulations par initiateur" isLoading={loadCanc}>
          {!(cancelData?.by_initiator?.length) ? (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--light)',
              padding: '24px 0', fontStyle: 'italic' }}>Aucune annulation.</p>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {(cancelData.by_initiator ?? []).map(item => {
                const pct = cancelData.total_cancelled > 0
                  ? Math.round((item.count / cancelData.total_cancelled) * 100)
                  : 0
                const roleLabel = { client: 'Client', barber: 'Coiffeur', admin: 'Admin', unknown: 'Inconnu' }
                return (
                  <div key={item.initiator_role} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      fontSize: 12, color: 'var(--mid)', marginBottom: 6 }}>
                      <span>{roleLabel[item.initiator_role] ?? item.initiator_role}</span>
                      <span style={{ color: BLACK, fontWeight: 500 }}>{item.count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 4, background: BORDER, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`,
                        background: item.initiator_role === 'client' ? BLACK : GOLD,
                        transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                )
              })}
              <p style={{ fontSize: 11, color: 'var(--light)', marginTop: 8, fontStyle: 'italic' }}>
                Total : {cancelData.total_cancelled} / {cancelData.total_appointments} RDV annulés
              </p>
            </div>
          )}
        </ChartCard>

      </div>

      {/* Employee performance table */}
      <ChartCard title="Performance des coiffeurs" isLoading={loadEmp}>
        {empData.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--light)',
            padding: '24px 0', fontStyle: 'italic' }}>Aucune donnée.</p>
        ) : (
          <>
            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={empData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: LIGHT, fontFamily: 'Barlow, sans-serif' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: LIGHT, fontFamily: 'Barlow, sans-serif' }}
                  axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="rdv"      name="RDV total"  fill={BORDER}  maxBarSize={30} />
                <Bar dataKey="termines" name="Terminés"   fill={BLACK}   maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>

            {/* Summary table */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px 70px',
                padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                {['Coiffeur','RDV','Terminés','Revenu','Note'].map(h => (
                  <span key={h} style={{ fontSize: 10, letterSpacing: '0.15em',
                    textTransform: 'uppercase', color: 'var(--mid)', fontWeight: 500 }}>
                    {h}
                  </span>
                ))}
              </div>
              {empStats?.employees?.map(e => (
                <div key={e.employee_id} style={{ display: 'grid',
                  gridTemplateColumns: '1fr 80px 80px 90px 70px',
                  padding: '11px 0', borderBottom: '1px solid var(--border)',
                  alignItems: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>{e.employee_name}</p>
                  <p style={{ fontSize: 13, color: 'var(--mid)', fontWeight: 300 }}>{e.total_appointments}</p>
                  <p style={{ fontSize: 13, color: 'var(--mid)', fontWeight: 300 }}>{e.completed_appointments}</p>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: GOLD }}>
                    {parseFloat(e.total_revenue).toFixed(0)} DT
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--mid)' }}>
                    {e.avg_rating ? `${e.avg_rating.toFixed(1)} ★` : '—'}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </ChartCard>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
