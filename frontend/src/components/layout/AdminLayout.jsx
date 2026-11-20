import { Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, Scissors, CalendarDays, BarChart2, Settings, User } from 'lucide-react'
import Sidebar from './Sidebar'
const NAV = [
  { to:'/admin/dashboard',    icon:LayoutDashboard, label:"Vue d'ensemble",  section:'Tableau de bord' },
  { to:'/admin/appointments', icon:CalendarDays,    label:'Rendez-vous' },
  { to:'/admin/analytics',    icon:BarChart2,       label:'Analytiques' },
  { to:'/admin/employees',    icon:Users,           label:'Employés',        section:'Gestion' },
  { to:'/admin/services',     icon:Scissors,        label:'Services & Tarifs' },
]
export default function AdminLayout() {
  return (
    <div className="layout-wrap portal-layout admin-portal" style={{display:'flex'}}>
      <Sidebar navItems={NAV} label="Manager & Fondateur" badge="Admin" />
      <div className="main-area" style={{display:'flex',flexDirection:'column',flex:1}}>
        <Outlet />
      </div>
    </div>
  )
}
