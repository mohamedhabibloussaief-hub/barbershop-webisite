import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'100dvh',flexDirection:'column',gap:20,padding:40,textAlign:'center',
      background:'var(--white)'}}>
      <p style={{fontFamily:'var(--display)',fontSize:60,fontWeight:600,letterSpacing:'0.05em',
        color:'var(--off2)',lineHeight:1}}>404</p>
      <div style={{width:36,height:1,background:'var(--border)',margin:'0 auto'}}/>
      <p style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:400,color:'var(--text)'}}>Page introuvable</p>
      <p style={{fontSize:13,color:'var(--light)',fontWeight:300,maxWidth:300}}>La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link to="/" className="btn btn-black">Retour à l'accueil</Link>
    </div>
  )
}
