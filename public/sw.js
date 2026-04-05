const CACHE_NAME = 'budgetmaster-v1'

const PRECACHE_ROUTES = ['/', '/dashboard']

// Static asset patterns to cache-first
const STATIC_PATTERNS = ['/_next/static/', '/icon', '/favicon.ico']

// Patterns that should always go network-first (data)
const NETWORK_FIRST_PATTERNS = ['/api/', 'supabase.co']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ROUTES))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Network-first: API calls and Supabase (always need fresh data)
  const isNetworkFirst = NETWORK_FIRST_PATTERNS.some(
    (p) => url.pathname.startsWith(p) || url.hostname.includes(p)
  )
  if (isNetworkFirst) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ??
            new Response(JSON.stringify({ error: 'You are offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            })
        )
      )
    )
    return
  }

  // Cache-first: Next.js static chunks (hashed filenames — safe to cache indefinitely)
  const isStatic = STATIC_PATTERNS.some((p) => url.pathname.startsWith(p))
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            return response
          })
      )
    )
    return
  }

  // Navigation requests: network-first, fall back to cached version
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? caches.match('/'))
            .then((cached) => cached ?? new Response('You are offline', { status: 503 }))
        )
    )
    return
  }
})
