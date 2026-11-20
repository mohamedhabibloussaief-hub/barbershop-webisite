import { useState } from 'react'
import { Calendar, Clock, Search, Loader, X } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')
import { useAllAppointments, useAdminUpdateStatus, useAdminCancelAppointment, useAdminMarkPaid } from '../../hooks/useAdmin'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'

const TABS = [
  { id: 'upcoming',  label: 'À venir',    filter: { upcoming: 'true' } },
  { id: 'today',     label: "Aujourd'hui", filter: {} },
  { id: 'completed', label: 'Terminés',   filter: { status: 'completed' } },
  { id: 'cancelled', label: 'Annulés',    filter: { status: 'cancelled' } },
]

const ADMIN_TRANSITIONS = {
  pending:   [
    { label: 'Confirmer',  status: 'confirmed', color: '#2a4db0', bg: '#f0f4ff', border: '#c0ccee' },
  ],
  confirmed: [
    { label: 'Arrivé',    status: 'arrived',   color: '#5a3db0', bg: '#f5f0ff', border: '#ccc0ee' },
  ],
  arrived: [
    { label: 'Terminer',  status: 'completed', color: '#1a7a35', bg: '#f0faf2', border: '#b0ddc0' },
    { label: 'Absent',    status: 'no_show',   color: '#c0392b', bg: '#fdf0f0', border: '#eebbbb' },
  ],
}

function CancelModal({ appt, onClose }) {
  const [reason, setReason] = useState('')
  const cancel = useAdminCancelAppointment()
  async function confirm() {
    try { await cancel.mutateAsync({ id: appt.id, reason }); onClose() } catch {}
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Annuler ce rendez-vous ?</h3>
        <p className="modal-desc">
          {appt.client?.full_name} — {appt.service_name}<br />
          {dayjs(appt.start_time).format('dddd D MMMM [à] HH:mm')}
        </p>
        <div className="form-group">
          <label className="form-label">Motif d'annulation <span className="form-hint">(optionnel)</span></label>
          <input type="text" className="form-input" placeholder="ex. coiffeur indisponible"
            value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        {cancel.error && (
          <div className="alert alert-error">
            {cancel.error?.response?.data?.error?.message ?? 'Erreur.'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost-light" onClick={onClose}>Conserver</button>
          <button className="btn btn-danger" disabled={cancel.isPending} onClick={confirm}>
            {cancel.isPending
              ? <><span className="spinner" style={{ width: 12, height: 12 }} />…</>
              : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminAppointments() {
  const [tab, setTab]           = useState('upcoming')
  const [search, setSearch]     = useState('')
  const [cancelAppt, setCancelAppt] = useState(null)
  const current = TABS.find(t => t.id === tab)

  const { data: appts, isLoading } = useAllAppointments(current.filter)
  const updateStatus = useAdminUpdateStatus()
  const markPaid = useAdminMarkPaid()

  const today = dayjs().format('YYYY-MM-DD')
  const raw = (appts ?? [])
  const filtered = (() => {
    let list = raw
    if (tab === 'today') list = list.filter(a => dayjs(a.start_time).format('YYYY-MM-DD') === today)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.client?.full_name?.toLowerCase().includes(q) ||
        a.service_name?.toLowerCase().includes(q) ||
        a.employee_name?.toLowerCase().includes(q)
      )
    }
    return list
  })()

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Administration</p>
        <h1 className="page-title">Rendez-vous</h1>
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)', marginBottom: 0, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex' }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`}
              onClick={() => { setTab(t.id); setSearch('') }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: -1 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--hint)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px 8px 32px', border: '1px solid var(--border)',
              fontSize: 12, outline: 'none', fontFamily: 'var(--sans)',
              background: 'var(--white)', color: 'var(--text)', width: 200 }}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader size={20} style={{ animation: 'spin .8s linear infinite', color: 'var(--hint)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar size={20} strokeWidth={1} />}
          title="Aucun rendez-vous"
          description={search ? 'Aucun résultat pour cette recherche.' : 'Rien à afficher pour cette période.'}
        />
      ) : (
        <>
          {/* Table header */}
          <div style={{ display: 'grid',
            gridTemplateColumns: '90px 1fr 1fr 1fr 120px 160px',
            gap: 0, background: 'var(--off)',
            borderBottom: '1px solid var(--border)',
            padding: '9px 20px',
          }}>
            {['Heure','Client','Service','Coiffeur','Statut','Actions'].map(h => (
              <span key={h} style={{ fontSize: 10, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--mid)', fontWeight: 500 }}>
                {h}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)', marginTop: 2 }}>
            {filtered.map(appt => {
              const transitions = ADMIN_TRANSITIONS[appt.status] ?? []
              const cancellable = ['pending','confirmed','arrived'].includes(appt.status)
              return (
                <div key={appt.id}
                  style={{ display: 'grid',
                    gridTemplateColumns: '90px 1fr 1fr 1fr 120px 160px',
                    gap: 0, padding: '13px 20px', background: 'var(--white)',
                    alignItems: 'center', fontSize: 13 }}>

                  {/* Time */}
                  <div>
                    <p style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--text)', lineHeight: 1 }}>
                      {dayjs(appt.start_time).format('HH:mm')}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--hint)', marginTop: 2 }}>
                      {dayjs(appt.start_time).format('D MMM')}
                    </p>
                  </div>

                  <p style={{ color: 'var(--text)', fontWeight: 400 }}>
                    {appt.client?.full_name ?? '—'}
                  </p>
                  <p style={{ color: 'var(--mid)', fontWeight: 300 }}>{appt.service_name}</p>
                  <p style={{ color: 'var(--mid)', fontWeight: 300 }}>{appt.employee_name}</p>
                  <StatusBadge status={appt.status} />

                  {/* Actions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {transitions.map(tr => (
                      <button key={tr.status}
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: appt.id, status: tr.status })}
                        style={{ padding: '4px 10px', fontSize: 10, letterSpacing: '0.08em',
                          textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--sans)',
                          background: tr.bg, color: tr.color, border: `1px solid ${tr.border}` }}>
                        {tr.label}
                      </button>
                    ))}
                    {appt.status === 'completed' && appt.payment_status !== 'paid' && (
                      <button
                        disabled={markPaid.isPending}
                        onClick={() => markPaid.mutate({ id: appt.id, method: 'cash' })}
                        style={{ padding: '4px 10px', fontSize: 10, letterSpacing: '0.08em',
                          textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--sans)',
                          background: '#fcf8ec', color: '#8a6d1b', border: '1px solid #e6d59c' }}
                      >
                        Encaisser
                      </button>
                    )}
                    {cancellable && (
                      <button
                        onClick={() => setCancelAppt(appt)}
                        style={{ padding: '4px 10px', fontSize: 10, letterSpacing: '0.08em',
                          textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'var(--sans)',
                          background: 'var(--off)', color: 'var(--hint)',
                          border: '1px solid var(--border)', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fdf0f0'; e.currentTarget.style.color = '#c0392b' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--off)'; e.currentTarget.style.color = 'var(--hint)' }}
                      >
                        <X size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {cancelAppt && <CancelModal appt={cancelAppt} onClose={() => setCancelAppt(null)} />}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:900px){
          .appt-grid{grid-template-columns:80px 1fr 100px!important}
        }
      `}</style>
    </div>
  )
}
