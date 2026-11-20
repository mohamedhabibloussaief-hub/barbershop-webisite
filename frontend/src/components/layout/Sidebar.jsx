import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const SCISSORS = (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="13" stroke="#111" strokeWidth="1.2"/>
    <path d="M9 8C9 8 11 10 14 10C17 10 19 8 19 8" stroke="#111" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M8 10L10.5 19" stroke="#111" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M20 10L17.5 19" stroke="#111" strokeWidth="1.2" strokeLinecap="round"/>
    <ellipse cx="10" cy="20" rx="2.2" ry="1.4" stroke="#111" strokeWidth="1" fill="none"/>
    <ellipse cx="18" cy="20" rx="2.2" ry="1.4" stroke="#111" strokeWidth="1" fill="none"/>
    <line x1="10" y1="14" x2="18" y2="14" stroke="#111" strokeWidth="0.8" strokeDasharray="1.5 1.5"/>
  </svg>
)

export default function Sidebar({ navItems, label = 'Client', badge = null }) {
  const { user, logout } = useAuth()
  const initials = (user?.full_name ?? 'H').split(' ').map(p => p[0]).slice(0,2).join('')

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-badge">{SCISSORS}</div>
          <span className="brand-name">Hazem Coiff</span>
          {badge && <span className="nav-badge" style={{marginLeft:'auto'}}>{badge}</span>}
        </div>

        {/* User */}
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.full_name}</div>
            <div className="user-tag">{label}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label: lbl, section, badge: nb }) => (
            <div key={to}>
              {section && <div className="nav-section-label">{section}</div>}
              <NavLink
                to={to}
                end={to.split('/').length <= 2}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <Icon className="nav-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
                {lbl}
                {nb != null && <span className={`nav-badge${nb === 'red' ? ' red' : ''}`}>{nb}</span>}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-footer-link" onClick={logout}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M17 16l4-4-4-4M21 12H9M13 4H5a2 2 0 00-2 2v12a2 2 0 002 2h8"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {navItems.filter(n => !n.section).slice(0, 5).map(({ to, icon: Icon, label: lbl }) => (
            <NavLink
              key={to}
              to={to}
              end={to.split('/').length <= 2}
              className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden="true"/>
              {lbl}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
