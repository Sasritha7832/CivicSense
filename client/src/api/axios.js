import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://civicsense-iqs5.onrender.com/api'

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  timeout: 15000,
})

// ─── Request interceptor — inject access token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Response interceptor — handle common errors ──────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !original._retry) {
      localStorage.removeItem('token')
      // Only redirect if not already on login/register pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
      }
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default api
