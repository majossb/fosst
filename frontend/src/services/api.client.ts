// Cliente HTTP basado en fetch nativo — sin dependencias extra
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
export const BACKEND_URL = BASE_URL.replace(/\/api\/?$/, '')

export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ''
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${BACKEND_URL}${cleanPath}`
}

// ── Sanitización: trim recursivo de strings ──────────────────────
// Previene datos con espacios accidentales que pasan el frontend
// pero podrían fallar en validaciones del backend
function deepTrimStrings(obj: unknown): unknown {
  if (typeof obj === 'string') return obj.trim()
  if (Array.isArray(obj)) return obj.map(deepTrimStrings)
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, deepTrimStrings(v)])
    )
  }
  return obj
}

// ── Token refresh en progreso (singleton para evitar race conditions)
let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) return null

      const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      })

      if (!res.ok) return null

      const data = await res.json()
      if (data.access) {
        localStorage.setItem('token', data.access)
        return data.access as string
      }
      return null
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const token = localStorage.getItem('token')

  const isFormData = body instanceof FormData
  const sanitizedBody = body !== undefined && !isFormData ? deepTrimStrings(body) : body

  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  
  if (!isFormData) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    ...(sanitizedBody !== undefined ? { body: isFormData ? (sanitizedBody as FormData) : JSON.stringify(sanitizedBody) } : {}),
  })

  // Intentamos leer el body siempre (puede ser JSON o texto)
  let data: any
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    data = await res.text()
  }

  if (!res.ok) {
    // ── Auto-refresh en token expirado ────────────────────────────
    if (res.status === 401 && !path.includes('/auth/login')) {
      const newToken = await tryRefreshToken()
      if (newToken) {
        // Reintentar la petición con el nuevo token
        return request<T>(method, path, body)
      }
      // Si el refresh también falla → auto-logout
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('auth_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    // El backend devuelve { message: '...' } en los errores
    const message =
      (typeof data === 'object' && data?.message) ||
      `Error ${res.status}: ${res.statusText}`
    throw new Error(message)
  }

  return data as T
}

export const apiClient = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)   => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown)   => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown)   => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => request<T>('DELETE', path),
}