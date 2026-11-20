import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock, User, Phone } from 'lucide-react'
import api from '../lib/axios'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const { login } = useAuth()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password')

  const onSubmit = async (data) => {
    setServerError(''); setLoading(true)
    try {
      const res = await api.post('/auth/register/', data)
      login(res.data.data)
    } catch (err) {
      const d = err.response?.data?.error
      setServerError(d?.detail?.email?.[0] || d?.message || 'Erreur. Veuillez réessayer.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{display:'flex',minHeight:'100dvh'}}>
      {/* Left brand */}
      <div style={{
        flex:1,background:'var(--black)',
        display:'flex',flexDirection:'column',justifyContent:'center',
        padding:'clamp(40px,8vh,80px) clamp(32px,6vw,72px)',
        position:'relative',overflow:'hidden',
      }} className="login-brand">
        <div style={{position:'absolute',inset:0,opacity:0.03,
          backgroundImage:'repeating-linear-gradient(-20deg,transparent 0,transparent 38px,#fff 38px,#fff 39px),repeating-linear-gradient(70deg,transparent 0,transparent 38px,#fff 38px,#fff 39px)'
        }} aria-hidden="true"/>
        <div style={{position:'relative',zIndex:1}}>
          <p style={{fontFamily:'var(--serif)',fontSize:'clamp(28px,4vw,48px)',fontWeight:400,color:'var(--white)',lineHeight:1.1,marginBottom:16}}>
            Rejoignez<br/><em style={{color:'rgba(255,255,255,0.4)'}}>Hazem Coiff</em>
          </p>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.25)',fontWeight:300,lineHeight:1.9,maxWidth:300}}>
            Créez votre compte et réservez votre prochain rendez-vous en quelques secondes.
          </p>
          <div style={{marginTop:40,display:'flex',flexDirection:'column',gap:16}}>
            {[['01','Créer votre compte'],['02','Choisir un service'],['03','Sélectionner un créneau'],['04','Confirmer & profiter']].map(([n,l])=>(
              <div key={n} style={{display:'flex',alignItems:'center',gap:16}}>
                <span style={{fontFamily:'var(--display)',fontSize:11,color:'var(--gold)',letterSpacing:'0.1em',minWidth:24}}>{n}</span>
                <span style={{fontSize:13,color:'rgba(255,255,255,0.32)',fontWeight:300}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div style={{
        width:'100%',maxWidth:480,
        background:'var(--white)',
        display:'flex',alignItems:'center',justifyContent:'center',
        padding:'clamp(24px,5vh,56px) clamp(24px,5vw,56px)',
        overflowY:'auto',
      }}>
        <div style={{width:'100%',maxWidth:360,paddingBlock:'16px'}} className="fade-up">
          <div style={{textAlign:'center',marginBottom:32}}>
            <p className="eyebrow" style={{marginBottom:10}}>Nouveau client</p>
            <h1 style={{fontFamily:'var(--display)',fontSize:22,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text)'}}>
              Créer un compte
            </h1>
            <div className="sec-rule" style={{margin:'14px auto 0'}}/>
          </div>

          {serverError && <div className="alert alert-error">{serverError}</div>}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="full_name">Nom complet</label>
              <div className="input-icon-wrap">
                <User className="input-icon" size={14}/>
                <input id="full_name" type="text" autoComplete="name" placeholder="Ahmed Ben Ali"
                  className={`form-input input-with-icon${errors.full_name?' form-input--error':''}`}
                  {...register('full_name',{required:'Requis',minLength:{value:2,message:'Min. 2 caractères'}})}/>
              </div>
              {errors.full_name && <span className="form-error">{errors.full_name.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="email">Adresse e-mail</label>
              <div className="input-icon-wrap">
                <Mail className="input-icon" size={14}/>
                <input id="email" type="email" autoComplete="email" placeholder="vous@exemple.com"
                  className={`form-input input-with-icon${errors.email?' form-input--error':''}`}
                  {...register('email',{required:'Requis',pattern:{value:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,message:'Email invalide'}})}/>
              </div>
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">Téléphone <span className="form-hint">(optionnel)</span></label>
              <div className="input-icon-wrap">
                <Phone className="input-icon" size={14}/>
                <input id="phone" type="tel" autoComplete="tel" placeholder="+216 XX XXX XXX"
                  className="form-input input-with-icon" {...register('phone')}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="password">Mot de passe</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon" size={14}/>
                <input id="password" type="password" autoComplete="new-password" placeholder="Minimum 8 caractères"
                  className={`form-input input-with-icon${errors.password?' form-input--error':''}`}
                  {...register('password',{required:'Requis',minLength:{value:8,message:'Min. 8 caractères'}})}/>
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="password_confirm">Confirmer le mot de passe</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon" size={14}/>
                <input id="password_confirm" type="password" autoComplete="new-password" placeholder="Répéter le mot de passe"
                  className={`form-input input-with-icon${errors.password_confirm?' form-input--error':''}`}
                  {...register('password_confirm',{required:'Requis',validate:v=>v===password||'Les mots de passe ne correspondent pas'})}/>
              </div>
              {errors.password_confirm && <span className="form-error">{errors.password_confirm.message}</span>}
            </div>
            <button type="submit" className="btn btn-black btn-full" disabled={loading} style={{marginTop:4}}>
              {loading ? <><span className="spinner" style={{width:14,height:14}}/>Création…</> : 'Créer mon compte'}
            </button>
          </form>
          <p style={{textAlign:'center',fontSize:12,color:'var(--light)',marginTop:24}}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{color:'var(--text)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>Se connecter</Link>
          </p>
        </div>
      </div>
      <style>{`@media(max-width:700px){.login-brand{display:none!important}div[style*="maxWidth:480"]{max-width:100%!important}}`}</style>
    </div>
  )
}
