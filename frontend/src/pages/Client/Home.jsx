import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useMyAppointments, useCancelAppointment, useServices, useEmployees } from '../../hooks/useAppointments'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')

const PILL_CLS = { confirmed:'status-pill status-confirmed', pending:'status-pill status-pending', completed:'status-pill status-completed', cancelled:'status-pill status-cancelled', arrived:'status-pill status-arrived', no_show:'status-pill status-no_show' }
const PILL_LBL = { pending:'En attente', confirmed:'Confirmé', arrived:'Arrivé', completed:'Terminé', no_show:'Absent', cancelled:'Annulé' }

export default function ClientHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: upcoming, isLoading } = useMyAppointments({ upcoming:'true' })
  const { data: recent }              = useMyAppointments({ status:'completed' })
  const { data: services }            = useServices()
  const { data: employees }           = useEmployees()
  const cancel                        = useCancelAppointment()

  const [qbServiceId, setQbServiceId]   = useState('')
  const [qbEmployeeId, setQbEmployeeId] = useState('')

  const quickServices = (services ?? []).slice(0, 4)
  useEffect(() => {
    if (!qbServiceId && quickServices.length > 0) {
      setQbServiceId(quickServices[0].id)
    }
  }, [quickServices, qbServiceId])

  const next       = upcoming?.[0] ?? null
  const recentList = (recent??[]).slice(0,4)

  async function handleCancelNext() {
    if (!next) return
    if (!window.confirm(`Annuler votre rendez-vous (${next.service_name}) du ${dayjs(next.start_time).format('D MMMM [à] HH:mm')} ?`)) return
    try {
      await cancel.mutateAsync({ id: next.id, reason: 'Annulé depuis le tableau de bord' })
    } catch {}
  }

  return (
    <div className="fade-up">

      {/* ── STATS ── */}
      <div className="stats-row">
        {[
          { icon:<svg width="16" height="16" fill="none" stroke="#555" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, badge:'Total', n: (upcoming?.length??0)+(recent?.length??0), l:'Rendez-vous' },
          { icon:<svg width="16" height="16" fill="none" stroke="#555" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>, badge:'À venir', n: upcoming?.length??0, l:'Prochains RDV' },
          { icon:<svg width="16" height="16" fill="none" stroke="#555" strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, badge:'Moyenne', n:'4.9', l:'Note donnée' },
          { icon:<svg width="16" height="16" fill="none" stroke="#555" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>, badge:'Depuis', n: new Date().getFullYear()-1, l:'Client fidèle' },
        ].map(({icon,badge,n,l}) => (
          <div key={l} className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon">{icon}</div>
              <span className="stat-badge">{badge}</span>
            </div>
            <div className="stat-num">{n}</div>
            <div className="stat-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* ── NEXT APPT HERO ── */}
      {isLoading ? (
        <div style={{height:140,background:'#111',marginBottom:36,animation:'pulse 1.4s ease infinite'}}/>
      ) : next ? (
        <div className="next-appt" style={{marginBottom:36}}>
          <div>
            <span className="next-appt-eyebrow">Prochain rendez-vous</span>
            <div className="next-appt-title">{next.service_name}</div>
            <div className="next-appt-sub">avec {next.employee_name}</div>
            <div className="next-appt-meta">
              {[
                ['Date',    dayjs(next.start_time).format('dddd D MMMM YYYY')],
                ['Heure',   `${dayjs(next.start_time).format('HH:mm')} → ${dayjs(next.start_time).add(next.duration_minutes,'minute').format('HH:mm')}`],
                ['Coiffeur',next.employee_name],
                ['Paiement',`Sur place · ${next.payment_amount ?? next.service_price ?? '—'} DT`],
              ].map(([lbl,val]) => (
                <div key={lbl} className="appt-meta-item">
                  <span className="appt-meta-lbl">{lbl}</span>
                  <span className="appt-meta-val">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="next-appt-sep"/>
          <div className="next-appt-actions">
            <Link to="/appointments" className="btn-white-solid">Gérer</Link>
            {['pending', 'confirmed'].includes(next.status) && (
              <button
                className="btn-white-outline"
                disabled={cancel.isPending}
                onClick={handleCancelNext}
              >
                {cancel.isPending ? 'Annulation…' : 'Annuler'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{background:'#111',padding:'28px 32px',marginBottom:36,display:'flex',alignItems:'center',justifyContent:'space-between',gap:24}}>
          <div>
            <p style={{fontSize:10,letterSpacing:'0.3em',textTransform:'uppercase',color:'rgba(255,255,255,0.3)',marginBottom:8}}>Aucun rendez-vous à venir</p>
            <p style={{fontFamily:'var(--serif)',fontSize:22,color:'#fff',marginBottom:4}}>Prêt pour une coupe ?</p>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',fontWeight:300}}>Réservez votre prochain rendez-vous en quelques secondes.</p>
          </div>
          <Link to="/book" className="btn-white-solid" style={{flexShrink:0}}>Réserver maintenant</Link>
        </div>
      )}

      {/* ── TWO COLUMN ── */}
      <div className="two-col" style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:24,marginBottom:36}}>

        {/* Upcoming list */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Rendez-vous <em>à venir</em></div>
            <Link to="/appointments" className="card-action">Tout voir →</Link>
          </div>
          <div className="appt-list">
            {(upcoming??[]).length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="20" height="20" fill="none" stroke="#aaa" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <div className="empty-title">Aucun rendez-vous</div>
                <div className="empty-desc">Réservez votre prochaine visite.</div>
                <Link to="/book" className="btn btn-black" style={{marginTop:8}}>Réserver</Link>
              </div>
            ) : (upcoming??[]).slice(0,4).map(a => (
              <div key={a.id} className="appt-row">
                <div className="appt-date-block">
                  <div className="appt-date-day">{dayjs(a.start_time).format('D')}</div>
                  <div className="appt-date-mon">{dayjs(a.start_time).format('MMM')}</div>
                </div>
                <div className="appt-info">
                  <div className="appt-service">{a.service_name}</div>
                  <div className="appt-employee">avec {a.employee_name}</div>
                </div>
                <div className="appt-right">
                  <div className="appt-time">{dayjs(a.start_time).format('HH:mm')}</div>
                  <span className={PILL_CLS[a.status]??'status-pill status-pending'}>{PILL_LBL[a.status]??a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick book */}
        <div className="quick-book card">
          <div className="card-head">
            <div className="card-title">Réserver <em>rapidement</em></div>
          </div>
          <div className="qb-body">
            <span className="qb-label">Choisir un service</span>
            <div className="qb-service-list">
              {quickServices.map(s => (
                <div
                  key={s.id}
                  className={`qb-svc-item${qbServiceId === s.id ? ' selected' : ''}`}
                  onClick={() => setQbServiceId(s.id)}
                >
                  <div>
                    <div className="qb-svc-name">{s.name}</div>
                    <div className="qb-svc-dur">{s.category || 'Prestation'} · {s.duration_minutes} min</div>
                  </div>
                  <div className="qb-svc-price">{s.price} DT</div>
                </div>
              ))}
            </div>
            <div className="qb-divider"/>
            <span className="qb-label">Choisir un coiffeur</span>
            <div className="qb-employees">
              {(employees ?? []).map(emp => (
                <div
                  key={emp.id}
                  className={`qb-emp${qbEmployeeId === emp.id ? ' selected' : ''}`}
                  onClick={() => setQbEmployeeId(emp.id)}
                >
                  {emp.user?.full_name}
                </div>
              ))}
              <div
                className={`qb-emp${qbEmployeeId === '' ? ' selected' : ''}`}
                onClick={() => setQbEmployeeId('')}
              >
                Peu importe
              </div>
            </div>
            <button
              type="button"
              className="qb-btn"
              style={{ width: '100%', border: 'none', cursor: 'pointer' }}
              onClick={() => navigate('/book', { state: { serviceId: qbServiceId, employeeId: qbEmployeeId || null } })}
            >
              Choisir une date →
            </button>
          </div>
        </div>
      </div>

      {/* ── RECENT VISITS ── */}
      {recentList.length > 0 && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">Dernières <em>visites</em></div>
            <Link to="/appointments" className="card-action">Historique complet →</Link>
          </div>
          <table className="history-table">
            <thead><tr><th>Service</th><th>Coiffeur</th><th>Date</th><th>Prix</th><th>Note</th><th/></tr></thead>
            <tbody>
              {recentList.map(a => (
                <tr key={a.id}>
                  <td className="ht-service">{a.service_name}</td>
                  <td>
                    <div className="ht-employee">
                      <div className="ht-avatar">{a.employee_name?.[0]}</div>
                      {a.employee_name}
                    </div>
                  </td>
                  <td>{dayjs(a.start_time).format('D MMM YYYY')}</td>
                  <td className="ht-price">{a.payment_amount ?? a.service_price ?? '—'} DT</td>
                  <td>
                    <div className="rating-stars">
                      {[1,2,3,4,5].map(i=><span key={i} className={`rs${i>4?' empty':''}`}>★</span>)}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ht-action"
                      onClick={() => navigate('/book', { state: { serviceId: a.service_id, employeeId: a.employee_id } })}
                    >
                      Rebooker
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
