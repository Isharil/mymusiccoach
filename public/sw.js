// Service Worker pour MyMusicCoach PWA
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `mymusiccoach-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mymusiccoach-dynamic-${CACHE_VERSION}`;

// Assets statiques à pré-cacher
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/input-fix.css',
  '/icons/icon.svg',
  '/sounds/click.mp3',
  '/sounds/wood.mp3',
  '/sounds/digital.mp3',
  '/sounds/soft.mp3'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pré-cache des assets statiques');
        // Ajouter les assets un par un pour éviter l'échec complet
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn(`[SW] Impossible de cacher ${url}:`, err))
          )
        );
      })
  );
  // Activer immédiatement le nouveau SW
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('mymusiccoach-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Prendre le contrôle immédiat
  self.clients.claim();
});

// Stratégies de cache selon le type de ressource
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Ignorer les requêtes externes
  if (url.origin !== self.location.origin) return;

  // Ignorer les requêtes vers les API Chrome/extension
  if (url.protocol === 'chrome-extension:') return;

  // Stratégie selon le type de ressource
  if (isStaticAsset(url.pathname)) {
    // Cache First pour les assets statiques (JS, CSS, images, sons)
    event.respondWith(cacheFirst(request));
  } else {
    // Network First pour les pages HTML
    event.respondWith(networkFirst(request));
  }
});

// Déterminer si c'est un asset statique
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|mp3|wav|ogg)$/i.test(pathname) ||
         pathname.startsWith('/assets/') ||
         pathname.startsWith('/icons/') ||
         pathname.startsWith('/sounds/');
}

// Stratégie Cache First (pour les assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Mettre à jour le cache en arrière-plan (stale-while-revalidate)
    fetchAndCache(request);
    return cachedResponse;
  }
  return fetchAndCache(request);
}

// Stratégie Network First (pour les pages)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Fallback vers la page d'accueil en cas d'erreur
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

// Fetch et cache en arrière-plan
async function fetchAndCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
