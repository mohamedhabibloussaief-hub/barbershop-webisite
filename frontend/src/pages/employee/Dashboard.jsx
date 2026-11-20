import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useEmployeeAppointments, useUpdateStatus } from '../../hooks/useAppointments'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')

const PILL_CLS = { pending:'pill pill-pending', confirmed:'pill pill-confirmed', arrived:'pill pill-arrived', completed:'pill pill-completed', no_show:'pill pill-noshow', cancelled:'pill pill-cancelled' }
const PILL_LBL = { pending:'En attente', confirmed:'Confirmé', arrived:'Arrivé', completed:'Terminé', no_show:'Absent', cancelled:'Annulé' }
const ACTIONS = {
  confirmed: [{ lbl:'Marquer arrivé', next:'arrived', cls:'success' }],
  arrived:   [{ lbl:'✓ Terminé', next:'completed', cls:'success' }, { lbl:'Absent', next:'no_show', cls:'danger' }],
  pending:   [{ lbl:'Confirmer', next:'confirmed', cls:'success' }, { lbl:'Refuser', next:'cancelled', cls:'danger' }],
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const today = dayjs().format('YYYY-MM-DD')
  const monthStart = dayjs().startOf('month')
  const { data:all, isLoading } = useEmployeeAppointments()
  const update = useUpdateStatus()

  const allList   = all ?? []
  const todayList = [...allList]
    .filter(a => dayjs(a.start_time).format('YYYY-MM-DD') === today)
    .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf())
  const next = [...allList]
    .filter(a => dayjs(a.start_time).isAfter(dayjs()) && ['pending','confirmed'].includes(a.status))
    .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf())[0] ?? null

  const done           = todayList.filter(a => a.status === 'completed').length
  const pending        = todayList.filter(a => a.status === 'pending').length
  const todayRevenue   = todayList
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + parseFloat(a.payment_amount ?? a.service_price ?? 0), 0)
  const monthCompleted = allList.filter(
    a => a.status === 'completed' && !dayjs(a.start_time).isBefore(monthStart)
  )
  const monthRevenue   = monthCompleted.reduce(
    (sum, a) => sum + parseFloat(a.payment_amount ?? a.service_price ?? 0), 0
  )
  const totalCompleted = allList.filter(a => a.status === 'completed').length

  return (
    <div>
      {/* Topbar */}
      <header className="topbar-dark">
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div className="page-title-dark" id="page-title">Tableau de <em>bord</em></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="date-chip">{dayjs().format('dddd D MMMM YYYY')}</div>
          <Link to="/employee/calendar" className="topbar-btn" style={{textDecoration:'none'}}>Gérer planning</Link>
        </div>
      </header>

      <div className="content-dark fade-up">

        {/* Stats */}
        <div className="stats-row-dark">
          {[
            {ico:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, tag:"Aujourd'hui", n:todayList.length, l:"RDV ce jour", delta:null},
            {ico:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, tag:"Ce mois", n:`${monthRevenue.toFixed(0)} DT`, l:"DT générés", delta:null},
            {ico:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, tag:"Moyenne", n:'4.9', l:"Note clients", delta:null},
            {ico:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>, tag:"Total", n:totalCompleted, l:"Clients servis", delta:null},
          ].map(({ico,tag,n,l,delta}) => (
            <div key={l} className="stat-card-dark">
              <div className="stat-top">
                <div className="stat-ico">{ico}</div>
                <span className="stat-tag">{tag}</span>
              </div>
              <div className="stat-num-dark">{n}</div>
              <div className="stat-lbl-dark">{l}</div>
              {delta && <div className="stat-delta">{delta}</div>}
            </div>
          ))}
        </div>

        {/* Today hero */}
        <div className="today-hero">
          <div>
            <span className="today-eyebrow">Vue d'aujourd'hui</span>
            <div className="today-title">{dayjs().format('dddd D MMMM YYYY')}</div>
            <div className="today-sub">Horaires · {dayjs().day()===1?'12:00 – 20:30':'09:00 – 20:30'}</div>
            <div className="today-pills">
              <div className="today-pill"><div className="tp-num">{todayList.filter(a=>a.status==='confirmed').length}</div><div className="tp-lbl">Confirmés</div></div>
              <div className="today-pill"><div className="tp-num">{pending}</div><div className="tp-lbl">En attente</div></div>
              <div className="today-pill"><div className="tp-num">{done}</div><div className="tp-lbl">Terminés</div></div>
            </div>
          </div>
          {next && (
            <div className="today-next">
              <div className="tn-lbl">Prochain client</div>
              <div className="tn-time">{dayjs(next.start_time).format('HH:mm')}</div>
              <div className="tn-client">{next.client?.full_name??'Client'}</div>
              <div className="tn-service">{next.service_name} · {next.payment_amount ?? next.service_price ?? '—'} DT</div>
            </div>
          )}
        </div>

        {/* Two-col: timeline + earnings mini */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:20,marginBottom:28}}>
          {/* Timeline */}
          <div className="card-dark">
            <div className="card-head-dark">
              <div className="card-title-dark">Planning <em>du jour</em></div>
              <Link to="/employee/appointments" className="card-act">Planning complet →</Link>
            </div>
            <div style={{padding:'16px 22px'}}>
              {isLoading ? (
                <div style={{display:'flex',justifyContent:'center',padding:40}}><span className="spinner-dark"/></div>
              ) : todayList.length === 0 ? (
                <div className="tl-empty">Aucun rendez-vous aujourd'hui.</div>
              ) : (
                <div className="timeline">
                  {todayList.map((a,i) => {
                    const isDone   = ['completed','no_show'].includes(a.status)
                    const isActive = a.status === 'arrived'
                    const acts = ACTIONS[a.status]??[]
                    return (
                      <div key={a.id} className="tl-slot">
                        <div className="tl-time">{dayjs(a.start_time).format('HH:mm')}</div>
                        <div className="tl-line">
                          <div className={`tl-dot${isActive?' active':isDone?' done':''}`}/>
                          {i < todayList.length-1 && <div className="tl-connector"/>}
                        </div>
                        <div className="tl-body">
                          <div className={`tl-appt${isDone?' done':isActive?' active-appt':''}`}>
                            <div>
                              <div className="tla-client">{a.client?.full_name??'Client'}</div>
                              <div className="tla-service">{a.service_name}</div>
                              <div className="tla-dur">{a.duration_minutes} min</div>
                            </div>
                            <div className="tla-right">
                              <div className="tla-price">{a.payment_amount ?? a.service_price ?? '—'} DT</div>
                              <span className={PILL_CLS[a.status]??'pill pill-pending'}>{PILL_LBL[a.status]??a.status}</span>
                              <div className="tla-actions">
                                {acts.map(act => (
                                  <button key={act.next} className={`btn-sm ${act.cls}`}
                                    disabled={update.isPending}
                                    onClick={()=>update.mutate({id:a.id,status:act.next})}>
                                    {act.lbl}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Gains */}
            <div className="card-dark">
              <div className="card-head-dark">
                <div className="card-title-dark">Gains <em>du jour</em></div>
              </div>
              <div style={{padding:'20px 20px'}}>
                <div style={{fontFamily:'var(--serif)',fontSize:38,fontWeight:400,color:'var(--white)',lineHeight:1,marginBottom:4}}>
                  {todayRevenue.toFixed(0)} <span style={{fontFamily:'var(--sans)',fontSize:14,color:'var(--muted)',fontWeight:300}}>DT</span>
                </div>
                <div style={{fontSize:11,color:'var(--muted)',fontWeight:300}}>{done} service{done!==1?'s':''} terminé{done!==1?'s':''}</div>
              </div>
            </div>
            {/* Pending */}
            {pending > 0 && (
              <div className="card-dark">
                <div className="card-head-dark">
                  <div className="card-title-dark">RDV <em>en attente</em></div>
                  <span className="pill pill-pending">{pending} nouveau{pending!==1?'x':''}</span>
                </div>
                <div style={{padding:'12px 0'}}>
                  {todayList.filter(a=>a.status==='pending').slice(0,3).map(a=>(
                    <div key={a.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 18px',borderBottom:'1px solid var(--border)'}}>
                      <div>
                        <div style={{fontSize:12,color:'var(--text)',fontWeight:400}}>{a.client?.full_name??'Client'}</div>
                        <div style={{fontSize:10,color:'var(--muted)'}}>{a.service_name} · {dayjs(a.start_time).format('HH:mm')}</div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn-sm success" disabled={update.isPending} onClick={()=>update.mutate({id:a.id,status:'confirmed'})}>✓</button>
                        <button className="btn-sm danger" disabled={update.isPending} onClick={()=>update.mutate({id:a.id,status:'cancelled'})}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
