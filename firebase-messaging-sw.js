/**
 * Firebase Cloud Messaging Service Worker
 * Este archivo maneja las notificaciones push de Firebase cuando la app está cerrada
 * También incluye todas las funcionalidades del service worker original (caching, polling sísmico)
 * 
 * © 2026 Cesar Sarmiento. Todos los derechos reservados.
 * Creado por Cesar Sarmiento
 */

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// --- Firebase Configuration (MISMAS CREDENCIALES QUE EN script.js) ---
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_AUTH_DOMAIN_AQUI",
  projectId: "TU_PROJECT_ID_AQUI",
  storageBucket: "TU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUI",
  appId: "TU_APP_ID_AQUI"
};

// --- Configuración de Caching ---
const CACHE_NAME = 'onda-v1';
const STATIC_CACHE = 'onda-static-v1';
const DATA_CACHE = 'onda-data-v1';

// --- Estado del service worker para seguimiento de sismos conocidos ---
let knownQuakeIds = new Set();
let lastPollTime = 0;
const POLL_INTERVAL = 60000; // Verificar cada 60 segundos

// --- Recursos estáticos a cachear ---
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// --- Inicializar Firebase en el service worker ---
let messaging = null;
if (firebaseConfig.apiKey !== "TU_API_KEY_AQUI") {
  try {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    console.log('[FIREBASE SW] Firebase inicializado en service worker');
    
    // Manejar mensajes en background (cuando app está cerrada)
    messaging.onBackgroundMessage((payload) => {
      console.log('[FIREBASE SW] Mensaje recibido en background:', payload);
      
      const notification = payload.notification;
      const data = payload.data || {};
      
      // Configurar vibración según urgencia
      let vibratePattern = [200, 100, 200];
      if (data.urgency === 'severe') {
        vibratePattern = [500, 200, 500, 200, 500];
      } else if (data.urgency === 'moderate') {
        vibratePattern = [300, 150, 300];
      }
      
      const notificationOptions = {
        body: notification.body,
        icon: notification.icon || '/favicon.ico',
        badge: '/badge.png',
        vibrate: vibratePattern,
        tag: data.quakeId || 'seismic-alert',
        requireInteraction: data.urgency === 'severe',
        data: data,
        actions: [
          {
            action: 'view',
            title: 'Ver en Mapa',
            icon: '/images/map.png'
          },
          {
            action: 'dismiss',
            title: 'Descartar',
            icon: '/images/close.png'
          }
        ]
      };
      
      return self.registration.showNotification(notification.title, notificationOptions);
    });
    
  } catch (error) {
    console.error('[FIREBASE SW] Error inicializando Firebase:', error);
  }
} else {
  console.warn('[FIREBASE SW] Credenciales de Firebase no configuradas');
}

// --- Funciones de Polling Sísmico (del sw.js original) ---
function isRelevantToVenezuela(quake) {
  const venezuelaBounds = {
    north: 12.2,
    south: 0.5,
    west: -73.5,
    east: -60.0
  };
  
  const [lon, lat] = quake.geometry.coordinates;
  
  const inBounds = lat >= venezuelaBounds.south && 
                   lat <= venezuelaBounds.north && 
                   lon >= venezuelaBounds.west && 
                   lon <= venezuelaBounds.east;
  
  const isSignificant = quake.properties.mag >= 5.0;
  
  return inBounds || isSignificant;
}

async function fetchSeismicData() {
  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
    if (!response.ok) throw new Error('USGS API error');
    
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('[SW] Error obteniendo datos sísmicos:', error);
    return [];
  }
}

async function processSeismicData(quakes) {
  const newQuakes = [];
  
  quakes.forEach(quake => {
    const quakeId = quake.id;
    
    if (!knownQuakeIds.has(quakeId) && isRelevantToVenezuela(quake)) {
      knownQuakeIds.add(quakeId);
      newQuakes.push(quake);
    }
  });
  
  for (const quake of newQuakes) {
    const mag = quake.properties.mag.toFixed(1);
    const place = quake.properties.place;
    const [lon, lat] = quake.geometry.coordinates;
    
    let urgency = 'normal';
    if (mag >= 6.0) urgency = 'severe';
    else if (mag >= 4.5) urgency = 'moderate';
    
    const inVenezuela = lat >= 0.5 && lat <= 12.2 && lon >= -73.5 && lon <= -60.0;
    
    const title = inVenezuela ? `🚨 SISMO EN VENEZUELA - M${mag}` : `⚠️ SISMO DETECTADO - M${mag}`;
    const body = `${place}. Magnitud ${mag}. ${inVenezuela ? '¡Requiere atención!' : 'Ver detalles.'}`;
    
    let vibratePattern = [200, 100, 200];
    if (urgency === 'severe') {
      vibratePattern = [500, 200, 500, 200, 500];
    } else if (urgency === 'moderate') {
      vibratePattern = [300, 150, 300];
    }
    
    const options = {
      body: body,
      icon: '/favicon.ico',
      badge: '/badge.png',
      vibrate: vibratePattern,
      tag: `quake-${quake.id}`,
      requireInteraction: urgency === 'severe',
      data: {
        quakeData: {
          id: quake.id,
          coordinates: quake.geometry.coordinates,
          magnitude: mag,
          place: place
        },
        urgency: urgency,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'Ver en Mapa',
          icon: '/images/map.png'
        },
        {
          action: 'dismiss',
          title: 'Descartar',
          icon: '/images/close.png'
        }
      ]
    };
    
    await self.registration.showNotification(title, options);
    console.log('[SW] Notificación mostrada para sismo:', title);
  }
}

async function pollSeismicData() {
  const now = Date.now();
  
  if (now - lastPollTime < POLL_INTERVAL) {
    return;
  }
  
  lastPollTime = now;
  console.log('[SW] Iniciando polling de datos sísmicos...');
  
  const quakes = await fetchSeismicData();
  if (quakes.length > 0) {
    await processSeismicData(quakes);
  }
}

// --- Eventos del Service Worker ---

// Instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Cacheando recursos estáticos');
      return cache.addAll(STATIC_ASSETS);
    }).catch((error) => {
      console.error('[SW] Error cacheando recursos estáticos:', error);
    })
  );
  
  self.skipWaiting();
  
  // Iniciar polling inicial
  setTimeout(() => {
    pollSeismicData();
  }, 5000);
});

// Activación
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
              console.log('[SW] Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.registration.periodicSync.register('seismic-poll', {
        minInterval: POLL_INTERVAL
      }).then(() => {
        console.log('[SW] Periodic Sync registrado');
      }).catch((error) => {
        console.warn('[SW] Periodic Sync no disponible:', error);
      })
    ]).then(() => {
      return self.clients.claim();
    })
  );
  
  pollSeismicData();
});

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.href.includes(asset))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch((error) => {
          return new Response('Offline - Recurso no disponible', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
    return;
  }
  
  if (url.hostname.includes('earthquake.usgs.gov') || 
      url.hostname.includes('seismicportal.eu') ||
      url.hostname.includes('www.seismicportal.eu')) {
    
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async (error) => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-From-Cache', 'true');
            
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: headers
            });
          }
          
          return new Response(JSON.stringify({
            error: 'offline',
            message: 'Sin conexión a internet. Mostrando última información disponible.',
            timestamp: Date.now()
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch((error) => {
        return caches.match(event.request);
      })
  );
});

// Sync events
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronización en background:', event.tag);
  
  if (event.tag === 'seismic-poll') {
    event.waitUntil(pollSeismicData());
  }
});

// Polling fallback
let pollingInterval = null;

function startPolling() {
  if (pollingInterval) return;
  
  console.log('[SW] Iniciando polling periódico');
  pollingInterval = setInterval(() => {
    pollSeismicData();
  }, POLL_INTERVAL);
  
  pollSeismicData();
}

self.addEventListener('activate', () => {
  startPolling();
});

// Manejo de mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Mensaje recibido del cliente:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, urgency, quakeData } = event.data;
    
    let vibratePattern = [200, 100, 200];
    if (urgency === 'severe') {
      vibratePattern = [500, 200, 500, 200, 500];
    } else if (urgency === 'moderate') {
      vibratePattern = [300, 150, 300];
    }
    
    const options = {
      body: body,
      icon: '/favicon.ico',
      badge: '/badge.png',
      vibrate: vibratePattern,
      tag: quakeData ? `quake-${quakeData.id}` : 'seismic-alert',
      requireInteraction: urgency === 'severe',
      data: {
        quakeData: quakeData,
        urgency: urgency,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'Ver en Mapa',
          icon: '/images/map.png'
        },
        {
          action: 'dismiss',
          title: 'Descartar',
          icon: '/images/close.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Manejar clic en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic en notificación:', event.action);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          if (event.notification.data && event.notification.data.quakeData) {
            const [lon, lat] = event.notification.data.quakeData.coordinates;
            client.postMessage({
              type: 'CENTER_MAP',
              lat: lat,
              lon: lon
            });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

