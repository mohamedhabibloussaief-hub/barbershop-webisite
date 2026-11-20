import { Link } from 'react-router-dom'
import { useAdminStats, useAllAppointments } from '../../hooks/useAdmin'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')

const PILL_CLS = { pending:'pill pill-pend', confirmed:'pill pill-conf', arrived:'pill pill-active', completed:'pill pill-done', no_show:'pill pill-noshow', cancelled:'pill pill-cancel' }
const PILL_LBL = { pending:'En attente', confirmed:'Confirmé', arrived:'Arrivé', completed:'Terminé', no_show:'Absent', cancelled:'Annulé' }

function Skeleton({ h=88 }) { return <div style={{height:h,background:'#252525',animation:'pulse 1.4s ease infinite'}}/> }

export default function AdminDashboard() {
  const today  = dayjs().format('YYYY-MM-DD')
  const from30 = dayjs().subtract(30,'day').format('YYYY-MM-DD')
  const { data:stats,    isLoading:loadStats   } = useAdminStats({ from_date:from30, to_date:today })
  const { data:upcoming, isLoading:loadUpcoming } = useAllAppointments({ upcoming:'true' })
  const nextAppts = (upcoming??[]).slice(0,8)

  const totalToday = (upcoming??[]).filter(a=>dayjs(a.start_time).format('YYYY-MM-DD')===today).length
  const pending    = (upcoming??[]).filter(a=>a.status==='pending').length
  const revenue    = stats?.revenue?.total ? parseFloat(stats.revenue.total).toFixed(0) : '—'
  const rdvTotal   = stats?.appointments?.total ?? '—'

  return (
    <div>
      {/* Topbar */}
      <header className="topbar-dark">
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div className="page-title-dark" id="page-title">Vue d'<em>ensemble</em></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div id="tb-date" style={{fontSize:11,color:'var(--muted)'}}>
            {dayjs().format('dddd D MMMM YYYY')}
          </div>
          <Link to="/admin/appointments" className="topbar-btn" style={{textDecoration:'none'}}>Rendez-vous</Link>
          <Link to="/admin/analytics" className="topbar-btn primary" style={{textDecoration:'none'}}>Rapport</Link>
        </div>
      </header>

      <div className="content-dark fade-up">

        {/* KPI Stats */}
        {loadStats ? (
          <div className="g4"><Skeleton/><Skeleton/><Skeleton/><Skeleton/></div>
        ) : (
          <div className="g4">
            {[
              {ico:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, tag:"Aujourd'hui", n:totalToday, l:"RDV ce jour", delta:null},
              {ico:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, tag:"Ce mois", n:`${revenue} DT`, l:"Revenus", delta:<span className="up">↑ +12%</span>},
              {ico:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, tag:"30j", n:rdvTotal, l:"Rendez-vous", delta:null},
              {ico:<svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>, tag:"En cours", n:pending, l:"En attente", delta:pending>0?<span className="neutral">{pending} à traiter</span>:null},
            ].map(({ico,tag,n,l,delta}) => (
              <div key={l} className="scard">
                <div className="scard-top">
                  <div className="scard-ico">{ico}</div>
                  <span className="scard-tag">{tag}</span>
                </div>
                <div className="scard-n">{n}</div>
                <div className="scard-l">{l}</div>
                {delta && <div className="scard-delta">{delta}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Overview hero */}
        <div className="overview-hero">
          <div>
            <span className="oh-eyebrow">Vue d'ensemble · {dayjs().format('MMMM YYYY')}</span>
            <div className="oh-title">{dayjs().format('dddd D MMMM YYYY')}</div>
            <div className="oh-sub">Tableau de bord administrateur — Hazem Coiff</div>
            <div className="oh-pills">
              <div className="oh-pill"><div className="ohp-n">{totalToday}</div><div className="ohp-l">Aujourd'hui</div></div>
              <div className="oh-pill"><div className="ohp-n">{rdvTotal}</div><div className="ohp-l">Ce mois</div></div>
              <div className="oh-pill"><div className="ohp-n">{pending}</div><div className="ohp-l">En attente</div></div>
            </div>
          </div>
          <div className="oh-right">
            <div className="ohr-lbl">Revenu du mois</div>
            <div className="ohr-rev">{revenue} <span style={{fontFamily:'var(--sans)',fontSize:16,color:'rgba(255,255,255,0.3)',fontWeight:300}}>DT</span></div>
            <div className="ohr-sub">{rdvTotal} rendez-vous · 30 derniers jours</div>
          </div>
        </div>

        {/* Two-col: appt table + quick nav */}
        <div className="g21">
          {/* Upcoming table */}
          <div className="card-dark">
            <div className="card-head-dark">
              <div className="card-title-dark">Prochains <em>rendez-vous</em></div>
              <Link to="/admin/appointments" className="card-act">Voir tout →</Link>
            </div>
            {loadUpcoming ? (
              <div style={{display:'flex',justifyContent:'center',padding:40}}><span className="spinner-dark"/></div>
            ) : nextAppts.length === 0 ? (
              <div className="empty-state-dark"><p className="empty-title-dark">Aucun RDV à venir</p></div>
            ) : (
              <table className="tbl">
                <thead><tr>
                  <th>Client</th><th>Service</th><th>Heure</th><th>Coiffeur</th><th>Statut</th>
                </tr></thead>
                <tbody>
                  {nextAppts.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="tc-av">
                          <div className="tc-dot">{a.client?.full_name?.[0]??'?'}</div>
                          <div>
                            <div className="tc-main">{a.client?.full_name??'—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="tc-main">{a.service_name}</td>
                      <td>
                        <div className="tc-mono">{dayjs(a.start_time).format('HH:mm')}</div>
                        <div style={{fontSize:10,color:'var(--hint)',marginTop:2}}>{dayjs(a.start_time).format('D MMM')}</div>
                      </td>
                      <td>{a.employee_name}</td>
                      <td><span className={PILL_CLS[a.status]??'pill pill-pend'}>{PILL_LBL[a.status]??a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick links */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="card-dark">
              <div className="card-head-dark">
                <div className="card-title-dark">Accès <em>rapide</em></div>
              </div>
              {[
                {to:'/admin/appointments', lbl:'Rendez-vous',   desc:'Gérer et modifier le statut'},
                {to:'/admin/employees',    lbl:'Employés',      desc:'Profils et plannings'},
                {to:'/admin/services',     lbl:'Services & Tarifs', desc:'Modifier prix et durées'},
                {to:'/admin/analytics',    lbl:'Analytiques',   desc:'Revenus et performances'},
              ].map(({to,lbl,desc}) => (
                <Link key={to} to={to}
                  style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 18px',borderBottom:'1px solid var(--border)',transition:'background 0.15s',textDecoration:'none'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div>
                    <p style={{fontSize:13,color:'var(--text)',marginBottom:2}}>{lbl}</p>
                    <p style={{fontSize:11,color:'var(--muted)',fontWeight:300}}>{desc}</p>
                  </div>
                  <svg width="12" height="12" fill="none" stroke="var(--hint)" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
