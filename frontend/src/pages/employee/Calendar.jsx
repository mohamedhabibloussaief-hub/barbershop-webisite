import { useState } from 'react'
import { Plus, Trash2, Loader } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
dayjs.locale('fr')
import { useForm } from 'react-hook-form'
import {
  useMyEmployeeProfile, useMySchedule, useMyTimeOff,
  useAddTimeOff, useDeleteTimeOff
} from '../../hooks/useAppointments'

const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']
const REASONS = [
  { value: 'vacation', label: 'Vacances' },
  { value: 'sick',     label: 'Maladie' },
  { value: 'break',    label: 'Congé' },
  { value: 'other',    label: 'Autre' },
]

export default function EmployeeCalendar() {
  const [showTimeOff, setShowTimeOff] = useState(false)
  const { data: profile } = useMyEmployeeProfile()
  const empId = profile?.id
  const { data: schedules, isLoading: loadSched } = useMySchedule(empId)
  const { data: timeoffs, isLoading: loadTOff } = useMyTimeOff(empId)
  const addTO  = useAddTimeOff(empId)
  const delTO  = useDeleteTimeOff(empId)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  async function submitTimeOff(data) {
    try { await addTO.mutateAsync(data); reset(); setShowTimeOff(false) } catch {}
  }

  // Group schedules by day
  const byDay = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    label: DAYS[i],
    slots: (schedules ?? []).filter(s => s.day_of_week === i && s.is_active),
  }))

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Planification</p>
        <h1 className="page-title">Mon planning</h1>
      </div>

      {/* ── Weekly schedule ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.2em',
          textTransform: 'uppercase', borderBottom: '1px solid var(--border)',
          paddingBottom: 12, marginBottom: 0 }}>
          Horaires hebdomadaires
        </p>

        {loadSched ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader size={20} style={{ animation: 'spin .8s linear infinite', color: 'var(--hint)' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)', marginTop: 2 }}>
            {byDay.map(({ day, label, slots }) => (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 20,
                padding: '14px 20px', background: 'var(--white)', minHeight: 56 }}>
                <div style={{ width: 80, flexShrink: 0 }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: slots.length ? 'var(--text)' : 'var(--hint)', fontWeight: slots.length ? 500 : 300 }}>
                    {label}
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  {slots.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--hint)', fontStyle: 'italic', fontWeight: 300 }}>
                      Repos
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {slots.map(s => (
                        <span key={s.id} style={{
                          padding: '4px 12px', border: '1px solid var(--border)',
                          fontSize: 12, color: 'var(--text)', fontFamily: 'var(--serif)',
                          background: 'var(--off)',
                        }}>
                          {s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--light)', fontStyle: 'italic', marginTop: 12, fontWeight: 300 }}>
          Pour modifier vos horaires, contactez l'administration.
        </p>
      </div>

      {/* ── Time off ───────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 0 }}>
          <p style={{ fontFamily: 'var(--display)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text)' }}>
            Absences et congés
          </p>
          <button className="btn btn-black" style={{ padding: '7px 16px', fontSize: 10, gap: 6, minHeight: 36 }}
            onClick={() => setShowTimeOff(v => !v)}>
            <Plus size={13} />Ajouter
          </button>
        </div>

        {/* Add form */}
        {showTimeOff && (
          <form onSubmit={handleSubmit(submitTimeOff)} style={{
            background: 'var(--off)', border: '1px solid var(--border)',
            padding: '20px 24px', marginTop: 2,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16,
            alignItems: 'end',
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label form-label-required">Date</label>
              <input type="date" className={`form-input${errors.date ? ' form-input--error' : ''}`}
                min={dayjs().add(1,'day').format('YYYY-MM-DD')}
                {...register('date', { required: 'Requis' })} />
              {errors.date && <span className="form-error">{errors.date.message}</span>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label form-label-required">Motif</label>
              <select className="form-input" {...register('reason', { required: 'Requis' })}>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Note</label>
              <input type="text" className="form-input" placeholder="Optionnel"
                {...register('note')} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-black" style={{ flex: 1, minHeight: 44 }}
                disabled={addTO.isPending}>
                {addTO.isPending ? <span className="spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} /> : 'Enregistrer'}
              </button>
              <button type="button" className="btn btn-ghost-light" style={{ minHeight: 44 }}
                onClick={() => setShowTimeOff(false)}>
                Annuler
              </button>
            </div>
            {addTO.error && (
              <div className="alert alert-error" style={{ gridColumn: '1/-1', marginBottom: 0 }}>
                {addTO.error?.response?.data?.error?.message ?? 'Erreur.'}
              </div>
            )}
          </form>
        )}

        {/* List */}
        {loadTOff ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Loader size={18} style={{ animation: 'spin .8s linear infinite', color: 'var(--hint)' }} />
          </div>
        ) : (timeoffs ?? []).length === 0 ? (
          <p style={{ padding: '24px 0', fontSize: 13, color: 'var(--light)', fontStyle: 'italic', textAlign: 'center' }}>
            Aucune absence enregistrée.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)', marginTop: 2 }}>
            {(timeoffs ?? []).map(to => (
              <div key={to.id} style={{ display: 'flex', alignItems: 'center', gap: 16,
                padding: '12px 20px', background: 'var(--white)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'var(--text)' }}>
                    {dayjs(to.date).format('dddd D MMMM YYYY')}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--light)', fontWeight: 300 }}>
                    {REASONS.find(r => r.value === to.reason)?.label ?? to.reason}
                    {to.note ? ` — ${to.note}` : ''}
                  </p>
                </div>
                <button onClick={() => delTO.mutate(to.id)} disabled={delTO.isPending}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--border)', background: 'var(--off)', color: 'var(--hint)',
                    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                  aria-label="Supprimer"
                  onMouseEnter={e => { e.currentTarget.style.background = '#fdf0f0'; e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.borderColor = '#eebbbb' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--off)'; e.currentTarget.style.color = 'var(--hint)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
