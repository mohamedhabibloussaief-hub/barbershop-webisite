import { useState } from 'react'
import { Calendar, Clock, Scissors, CheckCheck, UserX } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')
import { useEmployeeAppointments, useUpdateStatus } from '../../hooks/useAppointments'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'

const TABS = [
  { id: 'upcoming', label: 'À venir',   filter: { upcoming: 'true' } },
  { id: 'today',    label: "Aujourd'hui", filter: {} },
  { id: 'done',     label: 'Terminés',  filter: { status: 'completed' } },
]

const CAN_UPDATE = {
  pending: [
    { label: 'Confirmer', status: 'confirmed', style: 'info' },
    { label: 'Refuser',   status: 'cancelled', style: 'danger' },
  ],
  confirmed: [
    { label: 'Arrivé',   status: 'arrived',   style: 'info' },
  ],
  arrived: [
    { label: 'Terminé',  status: 'completed', style: 'success' },
    { label: 'Absent',   status: 'no_show',   style: 'danger' },
  ],
}

function ActionBtn({ label, onClick, variant, disabled }) {
  const colors = {
    info:    { bg: '#f0f4ff', color: '#2a4db0', border: '#c0ccee' },
    success: { bg: '#f0faf2', color: '#1a7a35', border: '#b0ddc0' },
    danger:  { bg: '#fdf0f0', color: '#c0392b', border: '#eebbbb' },
  }
  const c = colors[variant] ?? colors.info
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ padding: '5px 12px', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        cursor: 'pointer', fontFamily: 'var(--sans)', opacity: disabled ? 0.5 : 1 }}>
      {label}
    </button>
  )
}

export default function EmployeeAppointments() {
  const [tab, setTab] = useState('upcoming')
  const current = TABS.find(t => t.id === tab)
  const { data: appts, isLoading } = useEmployeeAppointments(current.filter)
  const updateStatus = useUpdateStatus()

  const list = tab === 'today'
    ? (appts ?? []).filter(a => dayjs(a.start_time).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD'))
    : (appts ?? [])

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Gestion</p>
        <h1 className="page-title">Mes rendez-vous</h1>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, background: 'var(--white)', animation: 'pulse 1.4s ease infinite' }} />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Calendar size={20} strokeWidth={1} />}
          title="Aucun rendez-vous"
          description="Rien à afficher pour cette période."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)' }}>
          {list.map(appt => {
            const actions = CAN_UPDATE[appt.status] ?? []
            return (
              <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px', background: 'var(--white)', flexWrap: 'wrap' }}>

                {/* Time block */}
                <div style={{ width: 56, flexShrink: 0, textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--text)', lineHeight: 1 }}>
                    {dayjs(appt.start_time).format('HH:mm')}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--hint)', marginTop: 3 }}>
                    {dayjs(appt.start_time).format('D MMM')}
                  </p>
                </div>

                <div style={{ width: 1, height: 36, background: 'var(--border)', flexShrink: 0 }} aria-hidden="true" />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>
                    {appt.client?.full_name ?? 'Client'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--light)', fontWeight: 300, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span><Scissors size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />{appt.service_name}</span>
                    <span><Clock size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />{appt.duration_minutes} min</span>
                  </p>
                </div>

                {/* Badge + actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                  <StatusBadge status={appt.status} />
                  {actions.map(a => (
                    <ActionBtn key={a.status} label={a.label} variant={a.style}
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: appt.id, status: a.status })} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
