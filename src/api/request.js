const API_PREFIX = '/api'

export class ApiError extends Error {
  constructor(message, code, status, data) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.data = data
  }
}

export async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers
  })

  const payload = await response.json().catch(() => null)
  const ok = response.ok && payload?.code === 0

  if (!ok) {
    throw new ApiError(
      payload?.message || '请求失败',
      payload?.code ?? response.status,
      response.status,
      payload?.data
    )
  }

  return payload.data
}
