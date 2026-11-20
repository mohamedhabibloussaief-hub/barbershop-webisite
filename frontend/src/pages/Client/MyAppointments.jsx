import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, Scissors, X } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')
import { useMyAppointments, useCancelAppointment } from '../../hooks/useAppointments'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'

export default function MyAppointments() {
  const [tab, setTab]             = useState('upcoming')
  const [cancelId, setCancelId]   = useState(null)
  const [reason, setReason]       = useState('')
  const { data: upcoming, isLoading: loadUp } = useMyAppointments({ upcoming:'true' })
  const { data: past, isLoading: loadPast }   = useMyAppointments({ status:'completed' })
  const cancel = useCancelAppointment()
  const list = tab === 'upcoming' ? (upcoming??[]) : (past??[])
  const loading = tab === 'upcoming' ? loadUp : loadPast

  async function doCancel() {
    if (!cancelId) return
    try { await cancel.mutateAsync({ id:cancelId, reason }); setCancelId(null); setReason('') } catch {}
  }

  return (
    <div style={{maxWidth:800}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,
        paddingBottom:20,borderBottom:'1px solid var(--border)'}}>
        <div>
          <p className="eyebrow" style={{marginBottom:6}}>Gestion</p>
          <h1 className="page-title">Mes rendez-vous</h1>
        </div>
        <Link to="/book" className="btn btn-black" style={{gap:8}}>
          <Scissors size={13} strokeWidth={1.5}/>Réserver
        </Link>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['upcoming','past'].map(t=>(
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
            {t==='upcoming' ? 'À venir' : 'Historique'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{display:'flex',flexDirection:'column',gap:2,background:'var(--border)'}}>
          {[1,2,3].map(i=><div key={i} style={{height:72,background:'var(--white)',animation:'pulse 1.4s ease infinite'}}/>)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Calendar size={20} strokeWidth={1}/>}
          title={tab==='upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun historique'}
          description={tab==='upcoming' ? 'Prêt pour une nouvelle coupe ?' : 'Vos visites apparaîtront ici'}
          action={tab==='upcoming' && <Link to="/book" className="btn btn-black">Réserver</Link>}
        />
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:2,background:'var(--border)'}}>
          {list.map((a,i)=>(
            <div key={a.id} style={{
              display:'flex',alignItems:'center',gap:16,
              padding:'16px 20px',background:'var(--white)',
              flexWrap:'wrap',
            }} className={`fade-up fade-up-${Math.min(i+1,4)}`}>
              <div style={{width:36,height:36,background:'var(--off)',border:'1px solid var(--border)',
                display:'flex',alignItems:'center',justifyContent:'center',color:'var(--hint)',flexShrink:0}}>
                <Scissors size={14} strokeWidth={1.5}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,color:'var(--text)',marginBottom:3}}>{a.service_name}</p>
                <p style={{fontSize:11,color:'var(--light)',fontWeight:300,display:'flex',flexWrap:'wrap',gap:12}}>
                  <span><Calendar size={10} style={{display:'inline',marginRight:4,verticalAlign:-1}}/>{dayjs(a.start_time).format('D MMM YYYY')}</span>
                  <span><Clock size={10} style={{display:'inline',marginRight:4,verticalAlign:-1}}/>{dayjs(a.start_time).format('HH:mm')}</span>
                  <span>avec {a.employee_name}</span>
                </p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
                <StatusBadge status={a.status}/>
                {(a.status==='pending'||a.status==='confirmed') && (
                  <button onClick={()=>setCancelId(a.id)} style={{
                    display:'flex',alignItems:'center',gap:4,
                    fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',
                    color:'var(--light)',cursor:'pointer',background:'none',border:'none',
                    fontFamily:'var(--sans)',transition:'color 0.15s',
                  }}
                  onMouseEnter={e=>e.currentTarget.style.color='#c0392b'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--light)'}
                  >
                    <X size={11} strokeWidth={1.5}/>Annuler
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelId && (
        <div className="modal-backdrop" onClick={()=>setCancelId(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3 className="modal-title">Annuler ce rendez-vous ?</h3>
            <p className="modal-desc">Cette action est irréversible. Vous pourrez réserver un autre créneau à tout moment.</p>
            <div className="form-group">
              <label className="form-label">Motif <span className="form-hint">(optionnel)</span></label>
              <input type="text" className="form-input" placeholder="ex. conflit d'agenda"
                value={reason} onChange={e=>setReason(e.target.value)}/>
            </div>
            {cancel.error && <div className="alert alert-error">{cancel.error?.response?.data?.error?.message ?? 'Erreur.'}</div>}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost-light" onClick={()=>setCancelId(null)}>Conserver</button>
              <button className="btn btn-danger" disabled={cancel.isPending} onClick={doCancel}>
                {cancel.isPending ? <><span className="spinner" style={{width:12,height:12}}/>…</> : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
