/**
 * src/lib/axios.js
 * ----------------
 * Single Axios instance used by every API call in the app.
 *
 * Interceptors:
 *   Request  → attaches "Authorization: Bearer <token>" to every request
 *   Response → on 401, attempts a single token refresh then retries;
 *               if refresh fails, clears auth and redirects to /login
 *
 * Token storage:
 *   Tokens live in module-level variables (in-memory).
 *   This prevents XSS from reading tokens via localStorage.
 *   Tokens survive page navigation but are cleared on hard refresh —
 *   the app re-authenticates via /auth/me on mount to handle that case.
 */

import axios from 'axios'

// In-memory token store — not localStorage, not sessionStorage.
let _accessToken  = null
let _refreshToken = null

export const tokenStore = {
  get access()  { return _accessToken },
  get refresh() { return _refreshToken },

  set(access, refresh) {
    _accessToken  = access
    _refreshToken = refresh
  },

  clear() {
    _accessToken  = null
    _refreshToken = null
  },
}

// Create the Axios instance.
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
})

// -- Request interceptor: attach JWT ----------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = tokenStore.access
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// -- Response interceptor: handle 401 + refresh ------------------------------
let _isRefreshing   = false
let _failedQueue    = []

function processQueue(error, token = null) {
  _failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  _failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only intercept 401s that haven't been retried yet.
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Don't retry the refresh endpoint itself — that's an infinite loop.
    if (originalRequest.url?.includes('/auth/refresh/')) {
      tokenStore.clear()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (_isRefreshing) {
      // Another request is already refreshing. Queue this one.
      return new Promise((resolve, reject) => {
        _failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      })
    }

    originalRequest._retry = true
    _isRefreshing = true

    try {
      const refreshToken = tokenStore.refresh
      if (!refreshToken) {
        throw new Error('No refresh token')
      }

      const { data } = await axios.post('/api/auth/refresh/', {
        refresh: refreshToken,
      })

      const newAccess = data.access
      tokenStore.set(newAccess, refreshToken)

      processQueue(null, newAccess)
      originalRequest.headers.Authorization = `Bearer ${newAccess}`
      return api(originalRequest)

    } catch (refreshError) {
      processQueue(refreshError, null)
      tokenStore.clear()
      window.location.href = '/login'
      return Promise.reject(refreshError)

    } finally {
      _isRefreshing = false
    }
  }
)

export default api
