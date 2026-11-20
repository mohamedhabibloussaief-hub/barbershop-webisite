import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'

// ── Helpers ───────────────────────────────────────────────────────────────────
const unwrap = (data) => data?.results?.data ?? data?.results ?? data?.data ?? data

// ── Dashboard stats ───────────────────────────────────────────────────────────
export function useAdminStats(params = {}) {
  return useQuery({
    queryKey: ['admin', 'stats', params],
    queryFn: async () => {
      const [appts, revenue, cancellations] = await Promise.all([
        api.get('/analytics/appointments/', { params }),
        api.get('/analytics/revenue/',      { params }),
        api.get('/analytics/cancellations/', { params }),
      ])
      return {
        appointments: appts.data.data,
        revenue:      revenue.data.data,
        cancellations: cancellations.data.data,
      }
    },
  })
}

// ── Revenue analytics ─────────────────────────────────────────────────────────
export function useRevenue(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'revenue', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/revenue/', { params })
      return data.data
    },
  })
}

export function useTopServices(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'top-services', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/top-services/', { params })
      return data.data
    },
  })
}

export function useEmployeeStats(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'employee-stats', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/employee-stats/', { params })
      return data.data
    },
  })
}

export function useCancellations(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'cancellations', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/cancellations/', { params })
      return data.data
    },
  })
}

// ── All appointments (admin view) ─────────────────────────────────────────────
export function useAllAppointments(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'appointments', filters],
    queryFn: async () => {
      const { data } = await api.get('/appointments/', { params: filters })
      return unwrap(data)
    },
  })
}

export function useAdminUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.post(`/appointments/${id}/status/`, { status })
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'appointments'] }),
  })
}

export function useAdminCancelAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const { data } = await api.post(`/appointments/${id}/cancel/`, {
        cancellation_reason: reason ?? '',
      })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useAdminMarkPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, method = 'cash' }) => {
      const { data } = await api.patch(`/appointments/${id}/payment/`, {
        status: 'paid',
        method,
      })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

// ── Employees (admin CRUD) ────────────────────────────────────────────────────
export function useAdminEmployees() {
  return useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: async () => {
      const { data } = await api.get('/employees/')
      return unwrap(data)
    },
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/employees/', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'employees'] }),
  })
}

export function useDeactivateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/employees/${id}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'employees'] }),
  })
}

// ── Barber users (for employee creation) ─────────────────────────────────────
export function useBarberUsers() {
  return useQuery({
    queryKey: ['admin', 'barber-users'],
    queryFn: async () => {
      // We list users and filter by role=barber on the backend if supported,
      // otherwise the admin creates barber users directly via Django admin.
      // This is a best-effort call.
      try {
        const { data } = await api.get('/auth/users/', { params: { role: 'barber' } })
        return unwrap(data)
      } catch {
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ── Services (admin CRUD) ─────────────────────────────────────────────────────
export function useAdminServices() {
  return useQuery({
    queryKey: ['admin', 'services'],
    queryFn: async () => {
      const { data } = await api.get('/services/')
      return unwrap(data)
    },
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/services/', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/services/${id}/`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  })
}

export function useDeactivateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/services/${id}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'services'] }),
  })
}
