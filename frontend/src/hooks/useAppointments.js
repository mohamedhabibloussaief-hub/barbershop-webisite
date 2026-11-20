/**
 * src/hooks/useAppointments.js
 * TanStack Query hooks for all client-facing data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'

function unwrapList(data) {
  const value = data?.results?.data ?? data?.results ?? data?.data ?? data
  return Array.isArray(value) ? value : []
}

// ── Services ──────────────────────────────────────────────────────────────────
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get('/services/')
      return unwrapList(data)
    },
    staleTime: 5 * 60 * 1000, // services rarely change
  })
}

// ── Employees ─────────────────────────────────────────────────────────────────
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await api.get('/employees/')
      return unwrapList(data)
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ── Availability ─────────────────────────────────────────────────────────────
export function useAvailability({ employeeId, date, serviceId }, enabled = true) {
  return useQuery({
    queryKey: ['availability', employeeId, date, serviceId],
    queryFn: async () => {
      const { data } = await api.get('/availability/', {
        params: { employee: employeeId, date, service: serviceId },
      })
      return data.data
    },
    enabled: enabled && !!employeeId && !!date && !!serviceId,
    staleTime: 30 * 1000, // availability changes quickly
  })
}

// ── My Appointments ───────────────────────────────────────────────────────────
export function useMyAppointments(filters = {}) {
  return useQuery({
    queryKey: ['appointments', 'mine', filters],
    queryFn: async () => {
      const { data } = await api.get('/appointments/', { params: filters })
      return unwrapList(data)
    },
  })
}

// ── Book appointment ─────────────────────────────────────────────────────────
export function useBookAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/appointments/', payload)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

// ── Cancel appointment ───────────────────────────────────────────────────────
export function useCancelAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const { data } = await api.post(`/appointments/${id}/cancel/`, {
        cancellation_reason: reason ?? '',
      })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

// ── Update profile ───────────────────────────────────────────────────────────
export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (payload) => {
      // Profile endpoint — added as /api/auth/me/ PATCH in a future step
      // For now we use the stub
      const { data } = await api.patch('/auth/me/', payload)
      return data.data?.user
    },
  })
}

// ── Employee: own appointments ────────────────────────────────────────────────
export function useEmployeeAppointments(filters = {}) {
  return useQuery({
    queryKey: ['appointments', 'employee', filters],
    queryFn: async () => {
      const { data } = await api.get('/appointments/', { params: filters })
      return unwrapList(data)
    },
  })
}

// ── Employee: update appointment status ───────────────────────────────────────
export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.post(`/appointments/${id}/status/`, { status })
      return data.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

// ── Employee: own schedule ────────────────────────────────────────────────────
export function useMySchedule(employeeId) {
  return useQuery({
    queryKey: ['schedules', employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/schedules/`)
      return unwrapList(data)
    },
    enabled: !!employeeId,
  })
}

// ── Employee: time off ────────────────────────────────────────────────────────
export function useMyTimeOff(employeeId) {
  return useQuery({
    queryKey: ['timeoff', employeeId],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${employeeId}/time-off/`)
      return unwrapList(data)
    },
    enabled: !!employeeId,
  })
}

export function useAddTimeOff(employeeId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post(`/employees/${employeeId}/time-off/`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeoff', employeeId] }),
  })
}

export function useDeleteTimeOff(employeeId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (timeOffId) => {
      await api.delete(`/employees/${employeeId}/time-off/${timeOffId}/`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timeoff', employeeId] }),
  })
}

// ── Employee: own profile ─────────────────────────────────────────────────────
export function useMyEmployeeProfile() {
  return useQuery({
    queryKey: ['employee-profile'],
    queryFn: async () => {
      const { data } = await api.get('/employees/')
      const list = unwrapList(data)
      return list[0] ?? null
    },
  })
}

// ── Admin: all appointments ───────────────────────────────────────────────────
export function useAllAppointments(filters = {}) {
  return useQuery({
    queryKey: ['appointments', 'all', filters],
    queryFn: async () => {
      const { data } = await api.get('/appointments/', { params: filters })
      return unwrapList(data)
    },
  })
}

// ── Admin: update payment status ──────────────────────────────────────────────
export function useMarkPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ appointmentId, method }) => {
      const { data } = await api.patch(`/appointments/${appointmentId}/payment/`, {
        status: 'paid', method,
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

// ── Admin: services CRUD ──────────────────────────────────────────────────────
export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/services/', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/services/${id}/`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => { await api.delete(`/services/${id}/`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

// ── Admin: employees CRUD ─────────────────────────────────────────────────────
export function useAllEmployees() {
  return useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/employees/')
      return unwrapList(data)
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useDeactivateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => { await api.delete(`/employees/${id}/`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

// ── Admin: analytics ──────────────────────────────────────────────────────────
export function useAnalyticsRevenue(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'revenue', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/revenue/', { params })
      return data.data
    },
  })
}

export function useAnalyticsAppointments(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'appointments', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/appointments/', { params })
      return data.data
    },
  })
}

export function useAnalyticsCancellations(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'cancellations', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/cancellations/', { params })
      return data.data
    },
  })
}

export function useAnalyticsTopServices(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'top-services', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/top-services/', { params })
      return data.data
    },
  })
}

export function useAnalyticsEmployeeStats(params = {}) {
  return useQuery({
    queryKey: ['analytics', 'employee-stats', params],
    queryFn: async () => {
      const { data } = await api.get('/analytics/employee-stats/', { params })
      return data.data
    },
  })
}
