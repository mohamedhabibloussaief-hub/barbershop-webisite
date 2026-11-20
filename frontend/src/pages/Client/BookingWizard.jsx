import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Loader } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')
import { useServices, useEmployees, useAvailability, useBookAppointment } from '../../hooks/useAppointments'

const STEPS = ['Service','Coiffeur','Date & Heure','Confirmation']

function ProgressStep({ i, current, label }) {
  const done   = i < current
  const active = i === current
  return (
    <div style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div style={{
          width:24, height:24, borderRadius:'50%', border:'1px solid',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, fontWeight:500,
          background: done||active ? 'var(--black)' : 'var(--white)',
          borderColor: done||active ? 'var(--black)' : 'var(--hint)',
          color: done||active ? 'var(--white)' : 'var(--hint)',
        }}>
          {done ? '✓' : i+1}
        </div>
        <span style={{
          fontSize:11, letterSpacing:'0.12em', textTransform:'uppercase',
          color: active ? 'var(--black)' : done ? 'var(--text-mid)' : 'var(--hint)',
        }}>{label}</span>
      </div>
      {i < STEPS.length-1 && (
        <div style={{ flex:1, height:1, background: done?'var(--black)':'var(--hint)', margin:'0 12px' }}/>
      )}
    </div>
  )
}

export default function BookingWizard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep]       = useState(0)
  const [service, setService] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [date, setDate]       = useState(dayjs().add(1,'day').format('YYYY-MM-DD'))
  const [slot, setSlot]       = useState(null)
  const [notes, setNotes]     = useState('')
  const [success, setSuccess] = useState(false)

  const { data:services, isLoading:loadSvc } = useServices()
  const { data:employees, isLoading:loadEmp } = useEmployees()

  useEffect(() => {
    const preSvcId = location.state?.serviceId
    const preEmpId = location.state?.employeeId
    if (preSvcId && services && !service) {
      const foundSvc = services.find(s => s.id === preSvcId)
      if (foundSvc) {
        setService(foundSvc)
        setStep(2)
      }
    }
    if (preEmpId && employees && !employee) {
      const foundEmp = employees.find(e => e.id === preEmpId)
      if (foundEmp) setEmployee(foundEmp)
    }
  }, [location.state, services, employees])
  const empId = employee?.id ?? employees?.[0]?.id
  const { data:availData, isLoading:loadAvail } = useAvailability(
    { employeeId:empId, date, serviceId:service?.id },
    step===2 && !!empId && !!service
  )
  const slots = availData?.slots ?? []
  const book  = useBookAppointment()

  const weddingSvcs  = (services??[]).filter(s => s.category==='The Wedding Collection')
  const regularSvcs  = (services??[]).filter(s => s.category!=='The Wedding Collection')

  const byCategory = regularSvcs.reduce((acc,s) => {
    const k = s.category||'Autres'; if(!acc[k]) acc[k]=[]; acc[k].push(s); return acc
  }, {})

  async function confirm() {
    const emp = employee ?? employees?.[0]
    if (!emp||!service||!slot) return
    try {
      await book.mutateAsync({ employee_id:emp.id, service_id:service.id, start_time:slot, notes })
      setSuccess(true)
    } catch {}
  }

  const SCISSORS = (
    <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="#fff" strokeWidth="1.2"/>
      <path d="M9 8C9 8 11 10 14 10C17 10 19 8 19 8" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M8 10L10.5 19" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M20 10L17.5 19" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="10" cy="20" rx="2.2" ry="1.4" stroke="#fff" strokeWidth="1" fill="none"/>
      <ellipse cx="18" cy="20" rx="2.2" ry="1.4" stroke="#fff" strokeWidth="1" fill="none"/>
    </svg>
  )

  if (success) return (
    <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column'}}>
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-logo-mark">{SCISSORS}</div>
          <span className="nav-brand">Hazem Coiff</span>
        </div>
      </nav>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',paddingTop:60}}>
        <div style={{textAlign:'center',maxWidth:480,padding:'60px 24px'}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'var(--black)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',fontSize:26,color:'#fff'}}>✓</div>
          <h2 style={{fontFamily:'var(--serif)',fontSize:32,fontWeight:400,marginBottom:8}}>Réservation confirmée !</h2>
          <p style={{fontSize:14,color:'var(--text-light)',fontWeight:300,marginBottom:32,lineHeight:1.7}}>
            Un e-mail de confirmation a été envoyé.<br/>
            Nous vous attendons {slot ? dayjs(slot).format('dddd D MMMM [à] HH:mm') : 'bientôt'}.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="btn btn-black" onClick={()=>navigate('/appointments')}>Voir mes RDV</button>
            <button className="btn btn-ghost-light" onClick={()=>{setSuccess(false);setStep(0);setService(null);setEmployee(null);setSlot(null)}}>
              Nouvelle réservation
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100dvh',background:'var(--white)',display:'flex',flexDirection:'column'}}>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          <div className="nav-logo-mark">{SCISSORS}</div>
          <span className="nav-brand">Hazem Coiff</span>
        </div>
        <Link to="/" style={{display:'flex',alignItems:'center',gap:8,fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--text-light)'}}>
          ← Retour
        </Link>
      </nav>

      {/* Progress bar */}
      <div style={{borderBottom:'1px solid var(--card-border)',background:'var(--white)',padding:'0 40px',display:'flex',alignItems:'center',gap:32,position:'sticky',top:60,zIndex:90,flexWrap:'nowrap',overflowX:'auto'}}>
        {STEPS.map((l,i) => <ProgressStep key={l} i={i} current={step} label={l}/>)}
      </div>

      {/* Main */}
      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 360px',maxWidth:1100,margin:'0 auto',width:'100%',paddingTop:60}}>
        {/* Steps area */}
        <div style={{padding:'40px 40px 60px',borderRight:'1px solid var(--card-border)',minHeight:'calc(100vh - 120px)'}}>

          {/* Step 1: Service */}
          {step === 0 && (
            <div>
              <h2 style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:400,marginBottom:4}}>
                Choisissez votre <em style={{fontStyle:'italic',color:'var(--text-mid)'}}>service</em>
              </h2>
              <p style={{fontSize:13,color:'var(--text-light)',fontWeight:300,marginBottom:32}}>
                Sélectionnez la prestation souhaitée. Le tarif inclut tous les soins associés.
              </p>

              {loadSvc ? <div style={{display:'flex',justifyContent:'center',padding:60}}><Loader size={20} style={{animation:'spin .8s linear infinite',color:'var(--text-light)'}}/></div> : (
                <>
                  {Object.entries(byCategory).map(([cat,svcs]) => (
                    <div key={cat}>
                      <span style={{fontSize:9,letterSpacing:'0.3em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:10,display:'block',marginTop:24}}>
                        {cat}
                      </span>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,background:'var(--card-border)'}}>
                        {svcs.map(svc => (
                          <div key={svc.id}
                            onClick={()=>setService(svc)}
                            style={{
                              background:'var(--white)',padding:'18px 20px',cursor:'pointer',
                              border:`2px solid ${service?.id===svc.id?'var(--black)':'transparent'}`,
                              transition:'all 0.15s',position:'relative',
                            }}
                            onMouseEnter={e=>{if(service?.id!==svc.id) e.currentTarget.style.background='var(--off,#f8f8f6)'}}
                            onMouseLeave={e=>{if(service?.id!==svc.id) e.currentTarget.style.background='var(--white)'}}>
                            {service?.id===svc.id && (
                              <div style={{position:'absolute',top:14,right:14,width:18,height:18,borderRadius:'50%',background:'var(--black)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:600}}>✓</div>
                            )}
                            <div style={{fontSize:13,fontWeight:500,color:'var(--text-dark)',marginBottom:3}}>{svc.name}</div>
                            <div style={{fontSize:11,color:'var(--text-light)',fontWeight:300,lineHeight:1.5,marginBottom:10}}>{svc.description||''}</div>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                              <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:400,color:'var(--text-dark)'}}>
                                {svc.price} <span style={{fontFamily:'var(--sans)',fontSize:11,color:'var(--text-light)',fontWeight:300}}>DT</span>
                              </div>
                              <div style={{fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--hint)'}}>~{svc.duration_minutes} min</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Wedding Collection */}
                  {weddingSvcs.length > 0 && (
                    <div style={{marginTop:24}}>
                      <span style={{fontSize:9,letterSpacing:'0.3em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:10,display:'block'}}>
                        The Wedding Collection
                      </span>
                      <div className="booking-wedding-grid">
                        {weddingSvcs.map(svc => (
                          <div key={svc.id}
                            className={`booking-wedding-card${service?.id===svc.id?' selected':''}`}
                            onClick={()=>setService(svc)}>
                            {service?.id===svc.id && (
                              <div style={{position:'absolute',top:12,right:12,width:16,height:16,borderRadius:'50%',background:'var(--white)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#000',fontWeight:700}}>✓</div>
                            )}
                            <div className="wedding-edition">{svc.name}</div>
                            <div className="wedding-included">{svc.description||'Package mariage complet avec finition premium.'}</div>
                            <div className="wedding-price">{svc.price} <span style={{fontFamily:'var(--sans)',fontSize:10,color:'rgba(255,255,255,0.3)'}}>DT</span></div>
                            <div className="wedding-duration">~{svc.duration_minutes} min</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Nav */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:40,paddingTop:24,borderTop:'1px solid var(--card-border)'}}>
                <button style={{padding:'12px 28px',border:'1px solid var(--card-border)',fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--text-mid)',cursor:'pointer',background:'none',fontFamily:'var(--sans)'}} disabled>
                  ← Retour
                </button>
                <button style={{padding:'12px 36px',background:'var(--black)',color:'var(--white)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:500,cursor:'pointer',border:'none',fontFamily:'var(--sans)',opacity:!service?0.3:1}}
                  disabled={!service} onClick={()=>setStep(1)}>
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Barber */}
          {step === 1 && (
            <div>
              <h2 style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:400,marginBottom:4}}>
                Choisissez votre <em style={{fontStyle:'italic',color:'var(--text-mid)'}}>coiffeur</em>
              </h2>
              <p style={{fontSize:13,color:'var(--text-light)',fontWeight:300,marginBottom:32}}>
                Tous nos coiffeurs sont certifiés et expérimentés.
              </p>

              {loadEmp ? <div style={{display:'flex',justifyContent:'center',padding:60}}><Loader size={20} style={{animation:'spin .8s linear infinite',color:'var(--text-light)'}}/></div> : (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                    {(employees??[]).map(emp => (
                      <div key={emp.id}
                        onClick={()=>setEmployee(emp)}
                        style={{
                          background: employee?.id===emp.id ? 'var(--white)' : 'var(--off,#f8f8f6)',
                          border:`2px solid ${employee?.id===emp.id?'var(--black)':'transparent'}`,
                          padding:'24px 20px',textAlign:'center',cursor:'pointer',
                          transition:'all 0.15s',position:'relative',
                        }}>
                        {employee?.id===emp.id && (
                          <div style={{position:'absolute',top:12,right:12,width:18,height:18,borderRadius:'50%',background:'var(--black)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:600}}>✓</div>
                        )}
                        <div style={{width:60,height:60,borderRadius:'50%',background:'var(--black)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--serif)',fontSize:22,fontWeight:400,fontStyle:'italic',color:'rgba(255,255,255,0.35)',margin:'0 auto 14px'}}>
                          {emp.user?.full_name?.[0]??'?'}
                        </div>
                        <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:400,color:'var(--text-dark)',marginBottom:3}}>{emp.user?.full_name}</div>
                        <div style={{fontSize:10,letterSpacing:'0.15em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:10}}>
                          {emp.specialties||'Coiffeur'}
                        </div>
                        {emp.years_experience && (
                          <div style={{fontSize:10,color:'var(--text-light)',fontWeight:300}}>{emp.years_experience} ans d'exp.</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div
                    onClick={()=>setEmployee(null)}
                    style={{
                      background: !employee ? 'var(--white)' : 'var(--off,#f8f8f6)',
                      border:`2px ${!employee?'solid':'dashed'} ${!employee?'var(--black)':'var(--border2,#ccc)'}`,
                      padding:'20px',textAlign:'center',cursor:'pointer',marginTop:16,
                      transition:'all 0.15s',
                    }}>
                    <div style={{fontSize:12,color:'var(--text-mid)',fontWeight:400}}>Peu importe le coiffeur</div>
                    <div style={{fontSize:11,color:'var(--text-light)',fontWeight:300,marginTop:3}}>Le premier coiffeur disponible</div>
                  </div>
                </>
              )}

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:40,paddingTop:24,borderTop:'1px solid var(--card-border)'}}>
                <button style={{padding:'12px 28px',border:'1px solid var(--card-border)',fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--text-mid)',cursor:'pointer',background:'none',fontFamily:'var(--sans)'}} onClick={()=>setStep(0)}>← Retour</button>
                <button style={{padding:'12px 36px',background:'var(--black)',color:'var(--white)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:500,cursor:'pointer',border:'none',fontFamily:'var(--sans)'}} onClick={()=>setStep(2)}>Suivant →</button>
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 2 && (
            <div>
              <h2 style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:400,marginBottom:4}}>
                Choisissez <em style={{fontStyle:'italic',color:'var(--text-mid)'}}>date & heure</em>
              </h2>
              <p style={{fontSize:13,color:'var(--text-light)',fontWeight:300,marginBottom:32}}>
                Sélectionnez un créneau disponible.
              </p>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32}}>
                {/* Date picker */}
                <div>
                  <p style={{fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:14}}>Date</p>
                  <input type="date" className="form-input"
                    value={date}
                    min={dayjs().add(1,'day').format('YYYY-MM-DD')}
                    style={{marginBottom:8}}
                    onChange={e=>{setDate(e.target.value);setSlot(null)}}/>
                </div>

                {/* Slots */}
                <div>
                  <p style={{fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:14}}>
                    Créneaux disponibles — {dayjs(date).format('D MMMM')}
                  </p>
                  {loadAvail ? (
                    <div style={{display:'flex',justifyContent:'center',padding:20}}><Loader size={18} style={{animation:'spin .8s linear infinite',color:'var(--text-light)'}}/></div>
                  ) : slots.length === 0 ? (
                    <p style={{fontSize:13,color:'var(--text-light)',fontStyle:'italic',fontWeight:300,padding:'20px 0'}}>
                      Aucun créneau disponible — essayez une autre date.
                    </p>
                  ) : (
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                      {slots.map(s => (
                        <button key={s} onClick={()=>setSlot(s)}
                          style={{
                            padding:'9px 6px',textAlign:'center',
                            border:`1px solid ${slot===s?'var(--black)':'var(--card-border)'}`,
                            fontSize:12,color:slot===s?'var(--white)':'var(--text-mid)',
                            cursor:'pointer',transition:'all 0.15s',
                            background:slot===s?'var(--black)':'var(--white)',
                            fontFamily:'var(--sans)',
                          }}>
                          {dayjs(s).format('HH:mm')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:40,paddingTop:24,borderTop:'1px solid var(--card-border)'}}>
                <button style={{padding:'12px 28px',border:'1px solid var(--card-border)',fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--text-mid)',cursor:'pointer',background:'none',fontFamily:'var(--sans)'}} onClick={()=>setStep(1)}>← Retour</button>
                <button style={{padding:'12px 36px',background:'var(--black)',color:'var(--white)',fontSize:11,letterSpacing:'0.2em',textTransform:'uppercase',fontWeight:500,cursor:'pointer',border:'none',fontFamily:'var(--sans)',opacity:!slot?0.3:1}} disabled={!slot} onClick={()=>setStep(3)}>Suivant →</button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 3 && (
            <div>
              <h2 style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:400,marginBottom:4}}>
                Confirmez votre <em style={{fontStyle:'italic',color:'var(--text-mid)'}}>réservation</em>
              </h2>
              <p style={{fontSize:13,color:'var(--text-light)',fontWeight:300,marginBottom:32}}>
                Vérifiez les détails avant de confirmer.
              </p>

              <div style={{background:'var(--off,#f8f8f6)',border:'1px solid var(--card-border)',padding:28,marginBottom:24}}>
                {[
                  ['Service', service?.name, ''],
                  ['Coiffeur', employee?.user?.full_name??'Disponible', ''],
                  ['Date', slot ? dayjs(slot).format('dddd D MMMM YYYY') : '—', ''],
                  ['Heure', slot ? `${dayjs(slot).format('HH:mm')} · ${service?.duration_minutes} min` : '—', ''],
                  ['Tarif', service ? `${service.price} DT` : '—', 'serif'],
                ].map(([k,v,style]) => (
                  <div key={k} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--card-border)',gap:16}}>
                    <div>
                      <div style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:3}}>{k}</div>
                      <div style={{fontFamily:style==='serif'?'var(--serif)':'var(--sans)',fontSize:style==='serif'?22:14,fontWeight:400,color:'var(--text-dark)'}}>{v}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{marginBottom:24}}>
                <span style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--text-light)',marginBottom:8,display:'block'}}>Notes pour votre coiffeur (optionnel)</span>
                <textarea
                  style={{width:'100%',padding:'10px 14px',background:'var(--off,#f8f8f6)',border:'1px solid var(--card-border)',color:'var(--text-dark)',fontFamily:'var(--sans)',fontSize:13,outline:'none',resize:'vertical',minHeight:72}}
                  placeholder="Demandes particulières…"
                  value={notes} onChange={e=>setNotes(e.target.value)}/>
              </div>

              {book.error && (
                <div className="alert alert-error">{book.error?.response?.data?.error?.message??'Erreur lors de la réservation.'}</div>
              )}

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:24,paddingTop:24,borderTop:'1px solid var(--card-border)'}}>
                <button style={{padding:'12px 28px',border:'1px solid var(--card-border)',fontSize:11,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--text-mid)',cursor:'pointer',background:'none',fontFamily:'var(--sans)'}} onClick={()=>setStep(2)}>← Retour</button>
                <button style={{padding:'14px 48px',background:'var(--black)',color:'var(--white)',fontSize:12,letterSpacing:'0.22em',textTransform:'uppercase',fontWeight:500,cursor:'pointer',border:'none',fontFamily:'var(--sans)',transition:'background 0.15s'}} disabled={book.isPending} onClick={confirm}>
                  {book.isPending ? <><span className="spinner" style={{borderTopColor:'#fff',width:14,height:14}}/>Réservation…</> : 'Confirmer la réservation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="booking-summary">
          <div className="booking-summary-title">Votre réservation</div>
          {!service ? (
            <p style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:300,fontStyle:'italic',color:'var(--hint,#ccc)',padding:'20px 0'}}>
              Aucune sélection
            </p>
          ) : (
            <>
              <div className="booking-summary-item">
                <span>Service</span>
                <strong>{service.name}</strong>
                <small>{service.duration_minutes} min</small>
              </div>
              <div className="booking-summary-item">
                <span>Coiffeur</span>
                <strong>{employee?.user?.full_name??'Disponible'}</strong>
              </div>
              <div className="booking-summary-item">
                <span>Date & heure</span>
                <strong>{slot ? dayjs(slot).format('D MMMM YYYY · HH:mm') : 'À choisir'}</strong>
              </div>
              <div className="booking-summary-total">
                <span>Total</span>
                <strong>{service.price} <span style={{fontFamily:'var(--sans)',fontSize:12,color:'var(--text-light)',fontWeight:300}}>DT</span></strong>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:860px){.booking-shell{grid-template-columns:1fr}}`}</style>
    </div>
  )
}
