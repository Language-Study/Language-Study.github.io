const CACHE_VERSION = 'v2';
const CACHE_NAME = `language-study-${CACHE_VERSION}`;

// URLs to cache - add essential files for offline access
const CACHE_URLS = [
    '/',
    '/index.html',
    '/login.html',
    '/styles.css',
    '/manifest.json',
    '/js/config.js',
    '/js/auth.js',
    '/js/ui-utils.js'
];

// Install event - cache essential files
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For Firebase and external CDN requests, always use network
    if (
        event.request.url.includes('firebasejs') ||
        event.request.url.includes('firebaseapp.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('cdnjs.cloudflare.com')
    ) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Offline fallback for external resources
                    return new Response('External resource unavailable offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                })
        );
        return;
    }

    // For app resources: Cache first, fall back to network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        // Don't cache error responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response and cache it
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Offline fallback
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Background sync for future use (e.g., syncing data when online)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    try {
        // Implement data sync logic here
        console.log('Syncing data with server...');
        // Example: await fetch('/api/sync', { method: 'POST' });
    } catch (error) {
        console.error('Sync failed:', error);
    }
}
