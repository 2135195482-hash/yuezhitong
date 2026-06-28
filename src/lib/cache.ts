// Simple in-memory cache
const store = new Map<string, { data: unknown; expiry: number }>()

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache(key: string, data: unknown, ttlMs: number = 5 * 60 * 1000): void {
  store.set(key, { data, expiry: Date.now() + ttlMs })
}

export function clearCache(): void {
  store.clear()
}
