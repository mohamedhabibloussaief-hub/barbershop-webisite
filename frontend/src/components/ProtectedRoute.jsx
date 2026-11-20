import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ROLE_HOME = { client:'/', barber:'/employee/dashboard', admin:'/admin/dashboard' }

function FullPageSpinner() {
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'100dvh',background:'var(--white)',
      flexDirection:'column',gap:16,
    }}>
      <div style={{
        width:36,height:36,background:'var(--black)',
        borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="13" stroke="#fff" strokeWidth="1.2"/>
          <path d="M9 8C9 8 11 10 14 10C17 10 19 8 19 8" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          <path d="M8 10L10.5 19" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M20 10L17.5 19" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
          <ellipse cx="10" cy="20" rx="2.2" ry="1.4" stroke="#fff" strokeWidth="1" fill="none"/>
          <ellipse cx="18" cy="20" rx="2.2" ry="1.4" stroke="#fff" strokeWidth="1" fill="none"/>
        </svg>
      </div>
      <span style={{fontSize:9,letterSpacing:'0.25em',textTransform:'uppercase',color:'var(--hint)'}}>Hazem Coiff</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function ProtectedRoute({ children, roles }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()
  if (isLoading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles?.length && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]??'/'} replace />
  return children
}
