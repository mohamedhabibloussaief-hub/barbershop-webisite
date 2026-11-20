import { Outlet } from 'react-router-dom'
import { LayoutDashboard, Calendar, ClipboardList } from 'lucide-react'
import Sidebar from './Sidebar'
const NAV = [
  { to:'/employee/dashboard',    icon:LayoutDashboard, label:'Tableau de bord', section:'Principal' },
  { to:'/employee/appointments', icon:ClipboardList,   label:'Rendez-vous' },
  { to:'/employee/calendar',     icon:Calendar,        label:'Planning & Horaires' },
]
export default function EmployeeLayout() {
  return (
    <div className="layout-wrap portal-layout employee-portal" style={{display:'flex'}}>
      <Sidebar navItems={NAV} label="Maître Coiffeur" />
      <div className="main-area" style={{display:'flex',flexDirection:'column',flex:1}}>
        <Outlet />
      </div>
    </div>
  )
}
