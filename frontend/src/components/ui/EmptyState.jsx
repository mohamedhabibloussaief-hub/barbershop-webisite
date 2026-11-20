export default function EmptyState({ icon, title, description, action, dark = false }) {
  return dark ? (
    <div className="empty-state-dark">
      {icon && <div style={{width:48,height:48,border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--hint)',margin:'0 auto'}}>{icon}</div>}
      <p className="empty-title-dark">{title}</p>
      {description && <p className="empty-desc-dark">{description}</p>}
      {action}
    </div>
  ) : (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      {action}
    </div>
  )
}
