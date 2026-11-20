import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Pencil, Trash2, Loader, X } from 'lucide-react'
import {
  useAdminServices, useCreateService,
  useUpdateService, useDeactivateService,
} from '../../hooks/useAdmin'
import EmptyState from '../../components/ui/EmptyState'

const CATEGORIES = ['Hair','Beard','Skin Care','Cheveux','Mariage','Autre']

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 className="modal-title" style={{ marginBottom: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ color: 'var(--hint)', cursor: 'pointer',
            background: 'none', border: 'none', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ServiceForm({ defaultValues, onSubmit, isPending, error, onCancel, submitLabel }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues })
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-group">
        <label className="form-label form-label-required">Nom du service</label>
        <input type="text" className={`form-input${errors.name ? ' form-input--error' : ''}`}
          placeholder="ex. Coupe + Barbe"
          {...register('name', { required: 'Requis' })} />
        {errors.name && <span className="form-error">{errors.name.message}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="form-group">
          <label className="form-label form-label-required">Prix (DT)</label>
          <input type="number" step="0.5" min="0"
            className={`form-input${errors.price ? ' form-input--error' : ''}`}
            {...register('price', { required: 'Requis', min: { value: 0.5, message: '≥ 0.5' } })} />
          {errors.price && <span className="form-error">{errors.price.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label form-label-required">Durée (min)</label>
          <input type="number" min="5" step="5"
            className={`form-input${errors.duration_minutes ? ' form-input--error' : ''}`}
            {...register('duration_minutes', { required: 'Requis', min: { value: 5, message: '≥ 5 min' } })} />
          {errors.duration_minutes && <span className="form-error">{errors.duration_minutes.message}</span>}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Catégorie</label>
        <select className="form-input" {...register('category')}>
          <option value="">— Choisir —</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea rows={2} className="form-input" placeholder="Courte description…"
          {...register('description')} />
      </div>
      {error && (
        <div className="alert alert-error">
          {error?.response?.data?.error?.message ?? 'Erreur.'}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost-light" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn-black" disabled={isPending}>
          {isPending
            ? <><span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />…</>
            : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default function AdminServices() {
  const [showCreate, setShowCreate] = useState(false)
  const [editSvc, setEditSvc]       = useState(null)

  const { data: services, isLoading, error } = useAdminServices()
  const create     = useCreateService()
  const update     = useUpdateService()
  const deactivate = useDeactivateService()

  async function handleCreate(data) {
    try {
      await create.mutateAsync(data)
      setShowCreate(false)
    } catch {}
  }

  async function handleEdit(data) {
    try {
      await update.mutateAsync({ id: editSvc.id, ...data })
      setEditSvc(null)
    } catch {}
  }

  // Group by category for display
  const grouped = (services ?? []).reduce((acc, svc) => {
    const cat = svc.category || 'Autres'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 6 }}>Administration</p>
          <h1 className="page-title">Services</h1>
        </div>
        <button className="btn btn-black" style={{ gap: 8 }} onClick={() => setShowCreate(true)}>
          <Plus size={14} />Nouveau service
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader size={20} style={{ animation: 'spin .8s linear infinite', color: 'var(--hint)' }} />
        </div>
      ) : error ? (
        <div className="alert alert-error">Impossible de charger les services.</div>
      ) : (services ?? []).length === 0 ? (
        <EmptyState title="Aucun service" description="Ajoutez votre premier service."
          action={<button className="btn btn-black" onClick={() => setShowCreate(true)}>Ajouter</button>} />
      ) : (
        Object.entries(grouped).map(([cat, svcs]) => (
          <div key={cat} style={{ marginBottom: 32 }}>
            <p style={{ fontFamily: 'var(--display)', fontSize: 10, letterSpacing: '0.25em',
              textTransform: 'uppercase', color: 'var(--mid)',
              borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 0 }}>
              {cat}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)', marginTop: 2 }}>
              {svcs.map(svc => (
                <div key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: 16,
                  padding: '13px 20px', background: 'var(--white)', flexWrap: 'wrap' }}>

                  {/* Dot-leader row */}
                  <div style={{ display: 'flex', alignItems: 'baseline', flex: 1, gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: svc.is_active ? 'var(--text)' : 'var(--hint)',
                      whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {svc.name}
                    </span>
                    <span style={{ flex: 1, borderBottom: '1px dotted var(--hint)',
                      position: 'relative', top: -4, minWidth: 20 }} aria-hidden="true" />
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 15,
                      color: svc.is_active ? 'var(--text)' : 'var(--hint)',
                      whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {svc.price} DT
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--hint)', flexShrink: 0 }}>
                      · {svc.duration_minutes} min
                    </span>
                  </div>

                  {/* Status pill */}
                  <span style={{
                    padding: '2px 9px', fontSize: 10, letterSpacing: '0.1em',
                    textTransform: 'uppercase', border: '1px solid',
                    background: svc.is_active ? '#f0faf2' : 'var(--off)',
                    color: svc.is_active ? '#1a7a35' : 'var(--hint)',
                    borderColor: svc.is_active ? '#b0ddc0' : 'var(--border)',
                    flexShrink: 0,
                  }}>
                    {svc.is_active ? 'Actif' : 'Inactif'}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => setEditSvc(svc)}
                      style={{ width: 30, height: 30, border: '1px solid var(--border)',
                        background: 'var(--off)', color: 'var(--mid)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s' }}
                      aria-label="Modifier"
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--black)'; e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.borderColor = 'var(--black)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--off)'; e.currentTarget.style.color = 'var(--mid)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <Pencil size={12} />
                    </button>
                    {!svc.is_active && (
                      <button
                        onClick={() => update.mutate({ id: svc.id, is_active: true })}
                        disabled={update.isPending}
                        style={{ padding: '0 10px', height: 30, border: '1px solid #b0ddc0',
                          background: '#f0faf2', color: '#1a7a35', cursor: 'pointer',
                          fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                          fontFamily: 'var(--sans)' }}
                      >
                        Réactiver
                      </button>
                    )}
                    {svc.is_active && (
                      <button
                        onClick={() => { if (window.confirm('Désactiver ce service ?')) deactivate.mutate(svc.id) }}
                        disabled={deactivate.isPending}
                        style={{ width: 30, height: 30, border: '1px solid var(--border)',
                          background: 'var(--off)', color: 'var(--hint)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s' }}
                        aria-label="Désactiver"
                        onMouseEnter={e => { e.currentTarget.style.background = '#fdf0f0'; e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.borderColor = '#eebbbb' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--off)'; e.currentTarget.style.color = 'var(--hint)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create modal */}
      {showCreate && (
        <Modal title="Nouveau service" onClose={() => setShowCreate(false)}>
          <ServiceForm
            onSubmit={handleCreate}
            isPending={create.isPending}
            error={create.error}
            onCancel={() => setShowCreate(false)}
            submitLabel="Créer le service"
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editSvc && (
        <Modal title="Modifier le service" onClose={() => setEditSvc(null)}>
          <ServiceForm
            defaultValues={{
              name:             editSvc.name,
              price:            editSvc.price,
              duration_minutes: editSvc.duration_minutes,
              category:         editSvc.category,
              description:      editSvc.description,
            }}
            onSubmit={handleEdit}
            isPending={update.isPending}
            error={update.error}
            onCancel={() => setEditSvc(null)}
            submitLabel="Enregistrer"
          />
        </Modal>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
