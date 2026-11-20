import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Mail, Lock } from 'lucide-react'
import api from '../lib/axios'
import { useAuth } from '../contexts/AuthContext'

const SCISSORS = (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="13" stroke="#fff" strokeWidth="1.2"/>
    <path d="M9 8C9 8 11 10 14 10C17 10 19 8 19 8" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M8 10L10.5 19" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M20 10L17.5 19" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
    <ellipse cx="10" cy="20" rx="2.2" ry="1.4" stroke="#fff" strokeWidth="1" fill="none"/>
    <ellipse cx="18" cy="20" rx="2.2" ry="1.4" stroke="#fff" strokeWidth="1" fill="none"/>
    <line x1="10" y1="14" x2="18" y2="14" stroke="#fff" strokeWidth="0.8" strokeDasharray="1.5 1.5"/>
  </svg>
)

export default function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setServerError(''); setLoading(true)
    try {
      const res = await api.post('/auth/login/', data)
      login(res.data.data)
    } catch (err) {
      const d = err.response?.data?.error
      setServerError(d?.detail?.non_field_errors?.[0] || d?.message || 'Identifiants invalides.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{display:'flex',minHeight:'100dvh'}}>
      {/* Left — brand panel */}
      <div style={{
        flex:1,background:'var(--black)',
        display:'flex',flexDirection:'column',justifyContent:'flex-end',
        padding:'clamp(40px,8vh,80px) clamp(32px,6vw,72px)',
        position:'relative',overflow:'hidden',
      }} className="login-brand">
        {/* Grid pattern */}
        <div style={{position:'absolute',inset:0,opacity:0.03,
          backgroundImage:'repeating-linear-gradient(-20deg,transparent 0,transparent 38px,#fff 38px,#fff 39px),repeating-linear-gradient(70deg,transparent 0,transparent 38px,#fff 38px,#fff 39px)'
        }} aria-hidden="true"/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:32}}>
            <div className="nav-logo-mark">{SCISSORS}</div>
            <span style={{fontFamily:'var(--display)',fontSize:14,letterSpacing:'0.2em',color:'var(--white)'}}>HAZEM COIFF</span>
          </div>
          <p style={{fontFamily:'var(--serif)',fontSize:'clamp(28px,4vw,48px)',fontWeight:400,color:'var(--white)',lineHeight:1.1,marginBottom:16}}>
            L'art de<br/><em style={{color:'rgba(255,255,255,0.4)'}}>vous sublimer</em>
          </p>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.25)',fontWeight:300,lineHeight:1.8,maxWidth:320}}>
            Coiffure, soins du visage et collections prestige.<br/>
            Deux salons à Boumhel et Mégrine.
          </p>
          <div style={{marginTop:40,display:'grid',gridTemplateColumns:'1fr 1fr',gap:2,maxWidth:320}}>
            {[['2','Salons'],['2021','Fondé'],['7j/7','Ouvert'],['4.9★','Note']].map(([n,l])=>(
              <div key={l} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',padding:'18px 16px'}}>
                <div style={{fontFamily:'var(--serif)',fontSize:28,color:'var(--gold)',lineHeight:1,marginBottom:4}}>{n}</div>
                <div style={{fontSize:9,letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(255,255,255,0.28)'}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        width:'100%',maxWidth:460,
        background:'var(--white)',
        display:'flex',alignItems:'center',justifyContent:'center',
        padding:'clamp(24px,5vh,64px) clamp(24px,5vw,56px)',
      }}>
        <div style={{width:'100%',maxWidth:340}} className="fade-up">
          <div style={{textAlign:'center',marginBottom:36}}>
            <p className="eyebrow" style={{marginBottom:10}}>Espace client</p>
            <h1 style={{fontFamily:'var(--display)',fontSize:22,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--text)'}}>
              Connexion
            </h1>
            <div className="sec-rule" style={{margin:'14px auto 0'}}/>
          </div>

          {serverError && (
            <div className="alert alert-error">{serverError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
              <label className="form-label form-label-required" htmlFor="password">Mot de passe</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon" size={14}/>
                <input id="password" type="password" autoComplete="current-password" placeholder="••••••••"
                  className={`form-input input-with-icon${errors.password?' form-input--error':''}`}
                  {...register('password',{required:'Requis'})}/>
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <button type="submit" className="btn btn-black btn-full" disabled={loading} style={{marginTop:8}}>
              {loading ? <><span className="spinner" style={{width:14,height:14}}/>Connexion…</> : 'Se connecter'}
            </button>
          </form>

          <p style={{textAlign:'center',fontSize:12,color:'var(--light)',marginTop:24}}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{color:'var(--text)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>Créer un compte</Link>
          </p>
        </div>
      </div>

      <style>{`@media(max-width:700px){.login-brand{display:none!important}div[style*="maxWidth:460"]{max-width:100%!important}}`}</style>
    </div>
  )
}
