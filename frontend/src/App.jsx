import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute  from './components/ProtectedRoute'
import ClientLayout    from './components/layout/ClientLayout'
import EmployeeLayout  from './components/layout/EmployeeLayout'
import AdminLayout     from './components/layout/AdminLayout'

import LoginPage    from './pages/Login'
import RegisterPage from './pages/Register'
import NotFoundPage from './pages/NotFound'

// Client
const ClientHome     = lazy(() => import('./pages/client/Home'))
const BookingWizard  = lazy(() => import('./pages/client/BookingWizard'))
const MyAppointments = lazy(() => import('./pages/client/MyAppointments'))
const ProfilePage    = lazy(() => import('./pages/client/Profile'))

// Employee
const EmpDashboard    = lazy(() => import('./pages/employee/Dashboard'))
const EmpCalendar     = lazy(() => import('./pages/employee/Calendar'))
const EmpAppointments = lazy(() => import('./pages/employee/Appointments'))

// Admin
const AdminDashboard  = lazy(() => import('./pages/admin/Dashboard'))
const AdminEmployees  = lazy(() => import('./pages/admin/Employees'))
const AdminServices   = lazy(() => import('./pages/admin/Services'))
const AdminAppts      = lazy(() => import('./pages/admin/Appointments'))
const AdminAnalytics  = lazy(() => import('./pages/admin/Analytics'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 300_000, retry: 2, refetchOnWindowFocus: false },
  },
})

function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <span className="spinner" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Client */}
              <Route element={<ProtectedRoute roles={['client']}><ClientLayout /></ProtectedRoute>}>
                <Route path="/"             element={<ClientHome />} />
                <Route path="/book"         element={<BookingWizard />} />
                <Route path="/appointments" element={<MyAppointments />} />
                <Route path="/profile"      element={<ProfilePage />} />
              </Route>

              {/* Employee */}
              <Route element={<ProtectedRoute roles={['barber']}><EmployeeLayout /></ProtectedRoute>}>
                <Route path="/employee/dashboard"    element={<EmpDashboard />} />
                <Route path="/employee/appointments" element={<EmpAppointments />} />
                <Route path="/employee/calendar"     element={<EmpCalendar />} />
              </Route>

              {/* Admin */}
              <Route element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
                <Route path="/admin/dashboard"    element={<AdminDashboard />} />
                <Route path="/admin/appointments" element={<AdminAppts />} />
                <Route path="/admin/employees"    element={<AdminEmployees />} />
                <Route path="/admin/services"     element={<AdminServices />} />
                <Route path="/admin/analytics"    element={<AdminAnalytics />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
