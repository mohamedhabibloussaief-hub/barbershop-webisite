const MAP = {
  pending:  ['status-pill status-pending',   'En attente'],
  confirmed:['status-pill status-confirmed', 'Confirmé'],
  arrived:  ['status-pill status-arrived',   'Arrivé'],
  completed:['status-pill status-completed', 'Terminé'],
  no_show:  ['status-pill status-no_show',   'Absent'],
  cancelled:['status-pill status-cancelled', 'Annulé'],
}
export default function StatusBadge({ status, dark = false }) {
  const [cls, label] = MAP[status] ?? ['status-pill status-pending', status]
  if (dark) {
    const darkMap = { pending:'pill pill-pending', confirmed:'pill pill-confirmed', arrived:'pill pill-arrived', completed:'pill pill-completed', no_show:'pill pill-noshow', cancelled:'pill pill-cancelled' }
    return <span className={darkMap[status]??'pill pill-pending'}>{label}</span>
  }
  return <span className={cls}>{label}</span>
}
