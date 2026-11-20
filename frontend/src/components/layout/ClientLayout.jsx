import { Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, Calendar, Clock, User } from 'lucide-react'
import Sidebar from './Sidebar'
const NAV = [
  { to:'/',             icon:LayoutDashboard, label:'Tableau de bord', section:'Menu' },
  { to:'/appointments', icon:Calendar,        label:'Mes rendez-vous' },
  { to:'/book',         icon:Clock,           label:'Réserver' },
  { to:'/profile',      icon:User,            label:'Mon profil' },
]
export default function ClientLayout() {
  return (
    <div className="layout-wrap portal-layout client-portal">
      <Sidebar navItems={NAV} label="Client" />
      <div className="main-area" style={{display:'flex',flexDirection:'column'}}>
        <header className="topbar-client">
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div className="page-title-client" id="page-title">Tableau de <em>bord</em></div>
          </div>
          <div className="topbar-right">
            <div className="topbar-notif">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span className="notif-dot"/>
            </div>
            <Link to="/book" className="topbar-book">+ Réserver</Link>
          </div>
        </header>
        <div className="content-client">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
