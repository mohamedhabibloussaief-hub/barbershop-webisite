import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { User, Mail, Phone, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/axios'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [saved, setSaved] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(()=>{
    if (user) reset({ full_name:user.full_name, email:user.email, phone:user.phone??'' })
  },[user,reset])

  async function onSubmit(data) {
    setServerErr(''); setLoading(true)
    try {
      const res = await api.patch('/auth/me/', data)
      if (res.data?.data?.user) updateUser(res.data.data.user)
      setSaved(true); setTimeout(()=>setSaved(false),3000)
    } catch (err) {
      setServerErr(err.response?.data?.error?.message ?? 'Erreur lors de la mise à jour.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{maxWidth:560}}>
      <div style={{marginBottom:28,paddingBottom:20,borderBottom:'1px solid var(--border)'}}>
        <p className="eyebrow" style={{marginBottom:6}}>Compte</p>
        <h1 className="page-title">Mon profil</h1>
      </div>

      {/* Avatar row */}
      <div style={{display:'flex',alignItems:'center',gap:20,padding:'24px 0',borderBottom:'1px solid var(--border)',marginBottom:28}}>
        <div style={{
          width:52,height:52,background:'var(--black)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:'var(--serif)',fontSize:22,fontWeight:400,color:'var(--white)',
          flexShrink:0,
        }} aria-hidden="true">
          {user?.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:400,color:'var(--text)',marginBottom:2}}>
            {user?.full_name}
          </p>
          <p style={{fontSize:10,letterSpacing:'0.2em',textTransform:'uppercase',color:'var(--light)'}}>
            {user?.role}
          </p>
        </div>
      </div>

      {serverErr && <div className="alert alert-error">{serverErr}</div>}
      {saved && (
        <div className="alert alert-success" style={{display:'flex',alignItems:'center',gap:8}}>
          <Check size={14}/>Profil mis à jour avec succès
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-group">
          <label className="form-label form-label-required" htmlFor="full_name">Nom complet</label>
          <div className="input-icon-wrap">
            <User className="input-icon" size={14}/>
            <input id="full_name" type="text" autoComplete="name"
              className={`form-input input-with-icon${errors.full_name?' form-input--error':''}`}
              {...register('full_name',{required:'Requis',minLength:{value:2,message:'Min. 2 caractères'}})}/>
          </div>
          {errors.full_name && <span className="form-error">{errors.full_name.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label form-label-required" htmlFor="email">Adresse e-mail</label>
          <div className="input-icon-wrap">
            <Mail className="input-icon" size={14}/>
            <input id="email" type="email" autoComplete="email"
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
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
          <button type="submit" className="btn btn-black" disabled={loading}>
            {loading ? <><span className="spinner" style={{width:14,height:14,borderTopColor:'#fff'}}/>Enregistrement…</> : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  )
}
