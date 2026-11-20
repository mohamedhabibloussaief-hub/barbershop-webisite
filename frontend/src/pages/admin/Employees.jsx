import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, UserMinus, Loader, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAdminEmployees, useCreateEmployee, useDeactivateEmployee, useBarberUsers } from '../../hooks/useAdmin'
import EmptyState from '../../components/ui/EmptyState'

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 className="modal-title" style={{ marginBottom: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--hint)', cursor: 'pointer',
            background: 'none', border: 'none', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function EmployeeRow({ emp, onDeactivate }) {
  const [open, setOpen] = useState(false)
  const deactivate = useDeactivateEmployee()

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 20px', background: 'var(--white)', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div style={{ width: 38, height: 38, background: emp.is_active ? 'var(--black)' : 'var(--off)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
          fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 400,
          color: emp.is_active ? 'var(--white)' : 'var(--hint)' }}>
          {emp.user?.full_name?.[0]?.toUpperCase() ?? '?'}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
            {emp.user?.full_name}
          </p>
          <p style={{ fontSize: 11, color: 'var(--light)', fontWeight: 300 }}>
            {emp.user?.email}
            {emp.years_experience != null && ` · ${emp.years_experience} ans d'exp.`}
            {emp.specialties ? ` · ${emp.specialties}` : ''}
          </p>
        </div>

        {/* Status */}
        <span style={{
          padding: '3px 10px', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', border: '1px solid',
          background: emp.is_active ? '#f0faf2' : 'var(--off)',
          color: emp.is_active ? '#1a7a35' : 'var(--hint)',
          borderColor: emp.is_active ? '#b0ddc0' : 'var(--border)',
        }}>
          {emp.is_active ? 'Actif' : 'Inactif'}
        </span>

        {/* Expand */}
        <button onClick={() => setOpen(v => !v)}
          style={{ color: 'var(--hint)', cursor: 'pointer', background: 'none',
            border: 'none', display: 'flex', padding: 4 }}
          aria-label="Détails">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div style={{ padding: '16px 20px 20px 74px', background: 'var(--off)',
          borderBottom: '1px solid var(--border)' }}>
          {emp.bio && (
            <p style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 300,
              fontStyle: 'italic', marginBottom: 14 }}>
              {emp.bio}
            </p>
          )}
          {emp.is_active && (
            <button
              onClick={() => { if (window.confirm('Désactiver ce coiffeur ?')) deactivate.mutate(emp.id) }}
              disabled={deactivate.isPending}
              className="btn btn-danger"
              style={{ minHeight: 36, padding: '6px 16px', fontSize: 10, gap: 6 }}
            >
              <UserMinus size={12} />
              {deactivate.isPending ? 'Désactivation…' : 'Désactiver le coiffeur'}
            </button>
          )}
          {deactivate.error && (
            <p style={{ fontSize: 11, color: '#c0392b', marginTop: 8 }}>
              {deactivate.error?.response?.data?.error?.message ?? 'Erreur.'}
            </p>
          )}
        </div>
      )}
    </>
  )
}

export default function AdminEmployees() {
  const [showForm, setShowForm] = useState(false)
  const { data: employees, isLoading, error } = useAdminEmployees()
  const { data: barberUsers } = useBarberUsers()
  const createEmployee = useCreateEmployee()

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  async function onSubmit(data) {
    try {
      await createEmployee.mutateAsync({
        user_id:          data.user_id,
        bio:              data.bio || '',
        specialties:      data.specialties || '',
        years_experience: parseInt(data.years_experience) || 0,
      })
      reset()
      setShowForm(false)
    } catch {}
  }

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Administration</p>
          <h1 className="page-title">Coiffeurs</h1>
        </div>
        <button className="btn btn-black" style={{ gap: 8 }} onClick={() => setShowForm(true)}>
          <Plus size={14} />Ajouter
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader size={20} style={{ animation: 'spin .8s linear infinite', color: 'var(--hint)' }} />
        </div>
      ) : error ? (
        <div className="alert alert-error">Impossible de charger les coiffeurs.</div>
      ) : (employees ?? []).length === 0 ? (
        <EmptyState title="Aucun coiffeur" description="Ajoutez votre premier coiffeur."
          action={<button className="btn btn-black" onClick={() => setShowForm(true)}>Ajouter</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)' }}>
          {(employees ?? []).map(emp => (
            <EmployeeRow key={emp.id} emp={emp} />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <Modal title="Ajouter un coiffeur" onClose={() => { setShowForm(false); reset() }}>
          <p className="modal-desc">
            Le coiffeur doit avoir un compte avec le rôle "barber" créé depuis Django Admin.
            Entrez ici son UUID d'utilisateur.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="form-group">
              <label className="form-label form-label-required">Utilisateur (rôle barber)</label>
              {(barberUsers ?? []).filter(u => !(employees ?? []).some(e => e.user?.id === u.id)).length > 0 ? (
                <select className={`form-input${errors.user_id ? ' form-input--error' : ''}`}
                  {...register('user_id', { required: 'Requis' })}>
                  <option value="">— Sélectionner un coiffeur —</option>
                  {(barberUsers ?? [])
                    .filter(u => !(employees ?? []).some(e => e.user?.id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                    ))}
                </select>
              ) : (
                <input type="text" className={`form-input${errors.user_id ? ' form-input--error' : ''}`}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  {...register('user_id', { required: 'Requis' })} />
              )}
              {errors.user_id && <span className="form-error">{errors.user_id.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Spécialités</label>
              <input type="text" className="form-input" placeholder="ex. fades, barbe, kératine"
                {...register('specialties')} />
            </div>
            <div className="form-group">
              <label className="form-label">Années d'expérience</label>
              <input type="number" min="0" className="form-input"
                {...register('years_experience')} />
            </div>
            <div className="form-group">
              <label className="form-label">Biographie</label>
              <textarea rows={3} className="form-input"
                placeholder="Courte présentation du coiffeur…"
                {...register('bio')} />
            </div>
            {createEmployee.error && (
              <div className="alert alert-error">
                {createEmployee.error?.response?.data?.error?.message ?? 'Erreur lors de la création.'}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost-light"
                onClick={() => { setShowForm(false); reset() }}>Annuler</button>
              <button type="submit" className="btn btn-black" disabled={createEmployee.isPending}>
                {createEmployee.isPending
                  ? <><span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />Création…</>
                  : 'Créer le profil'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
