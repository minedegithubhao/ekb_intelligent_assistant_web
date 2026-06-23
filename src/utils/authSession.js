const AUTH_STORAGE_KEYS = [
  'token',
  'userInfo',
  'roles',
  'knowledge_base_type',
  'knowledge_base_name'
]

export function clearAuthSession() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
}
