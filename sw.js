/**
 * ONDA Service Worker
 * Garantiza funcionamiento offline durante emergencias sísmicas
 */

const CACHE_NAME = 'onda-v1';
const STATIC_CACHE = 'onda-static-v1';
const DATA_CACHE = 'onda-data-v1';

// Estado del service worker para seguimiento de sismos conocidos
let knownQuakeIds = new Set();
let lastPollTime = 0;
const POLL_INTERVAL = 60000; // Verificar cada 60 segundos

// Verificar si un sismo es relevante para Venezuela
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

// Calcular distancia entre dos coordenadas
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Obtener datos sísmicos de USGS
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

// Procesar sismos y mostrar notificaciones para nuevos relevantes
async function processSeismicData(quakes) {
  const newQuakes = [];
  
  quakes.forEach(quake => {
    const quakeId = quake.id;
    
    // Si es un sismo nuevo y relevante para Venezuela
    if (!knownQuakeIds.has(quakeId) && isRelevantToVenezuela(quake)) {
      knownQuakeIds.add(quakeId);
      newQuakes.push(quake);
    }
  });
  
  // Mostrar notificaciones para sismos nuevos relevantes
  for (const quake of newQuakes) {
    const mag = quake.properties.mag.toFixed(1);
    const place = quake.properties.place;
    const [lon, lat] = quake.geometry.coordinates;
    
    // Determinar urgencia
    let urgency = 'normal';
    if (mag >= 6.0) urgency = 'severe';
    else if (mag >= 4.5) urgency = 'moderate';
    
    // Verificar si está en Venezuela
    const inVenezuela = lat >= 0.5 && lat <= 12.2 && lon >= -73.5 && lon <= -60.0;
    
    const title = inVenezuela ? `🚨 SISMO EN VENEZUELA - M${mag}` : `⚠️ SISMO DETECTADO - M${mag}`;
    const body = `${place}. Magnitud ${mag}. ${inVenezuela ? '¡Requiere atención!' : 'Ver detalles.'}`;
    
    // Configurar vibración según urgencia
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

// Polling periódico de datos sísmicos en background
async function pollSeismicData() {
  const now = Date.now();
  
  // Verificar si es tiempo de hacer polling
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

// Recursos estáticos a cachear (HTML, CSS, JS, fuentes, iconos)
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

// Instalación del Service Worker
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
  
  // Forzar activación inmediata
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
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
      // Registrar periodic sync para polling en background
      self.registration.periodicSync.register('seismic-poll', {
        minInterval: POLL_INTERVAL // 60 segundos mínimo
      }).then(() => {
        console.log('[SW] Periodic Sync registrado para polling sísmico');
      }).catch((error) => {
        console.warn('[SW] Periodic Sync no disponible:', error);
      })
    ]).then(() => {
      return self.clients.claim();
    })
  );
  
  // Iniciar polling inmediatamente
  pollSeismicData();
});

// Intercepción de peticiones de red
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Estrategia para recursos estáticos: Cache First
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.href.includes(asset))) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Sirviendo desde cache:', event.request.url);
          return cachedResponse;
        }
        
        return fetch(event.request).then((networkResponse) => {
          // Cachear respuesta exitosa
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch((error) => {
          console.error('[SW] Error fetching recurso estático:', error);
          // Retornar respuesta offline si es posible
          return new Response('Offline - Recurso no disponible', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
    return;
  }
  
  // Estrategia para APIs sísmicas: Network First con fallback a caché
  if (url.hostname.includes('earthquake.usgs.gov') || 
      url.hostname.includes('seismicportal.eu') ||
      url.hostname.includes('www.seismicportal.eu')) {
    
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cachear datos sísmicos exitosos
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DATA_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async (error) => {
          console.log('[SW] API no disponible, usando caché:', event.request.url);
          
          // Intentar obtener datos cacheados
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            // Agregar header indicando que es datos cacheados
            const headers = new Headers(cachedResponse.headers);
            headers.set('X-From-Cache', 'true');
            
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers: headers
            });
          }
          
          // Si no hay caché, retornar error con información útil
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
  
  // Estrategia para otras peticiones: Network First
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch((error) => {
        console.log('[SW] Red no disponible, intentando caché:', event.request.url);
        return caches.match(event.request);
      })
  );
});

// Sincronización en background (para cuando vuelva la conexión)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronización en background:', event.tag);
  
  if (event.tag === 'seismic-poll') {
    event.waitUntil(pollSeismicData());
  }
  
  if (event.tag === 'sync-seismic-data') {
    event.waitUntil(
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson')
        .then(response => response.json())
        .then(data => {
          return caches.open(DATA_CACHE).then(cache => {
            return cache.put(
              new Request('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'),
              new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
              })
            );
          });
        })
        .catch(error => {
          console.error('[SW] Error en sincronización:', error);
        })
    );
  }
});

// Fallback: Iniciar polling periódico con setInterval (para navegadores sin periodic sync)
let pollingInterval = null;

function startPolling() {
  if (pollingInterval) return;
  
  console.log('[SW] Iniciando polling periódico con setInterval');
  pollingInterval = setInterval(() => {
    pollSeismicData();
  }, POLL_INTERVAL);
  
  // Ejecutar inmediatamente
  pollSeismicData();
}

// Iniciar polling cuando el service worker se activa
self.addEventListener('activate', () => {
  startPolling();
});

// También iniciar polling cuando el service worker se instala (para mayor confiabilidad)
self.addEventListener('install', () => {
  console.log('[SW] Instalado - iniciando polling inicial');
  // Esperar un poco antes del primer polling para asegurar que esté activo
  setTimeout(() => {
    pollSeismicData();
  }, 5000);
});

// Manejar eventos de notificación para iOS (que no soporta acciones)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic en notificación:', event.action);
  event.notification.close();
  
  // En iOS, event.action puede ser undefined, así que abrir la app en cualquier caso
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Manejo de mensajes del cliente (para notificaciones desde la app)
self.addEventListener('message', (event) => {
  console.log('[SW] Mensaje recibido del cliente:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, urgency, quakeData } = event.data;
    
    // Configurar vibración según urgencia
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

// Notificaciones push (para alertas críticas)
self.addEventListener('push', (event) => {
  console.log('[SW] Notificación push recibida');
  
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.warn('[SW] Error parseando datos de push:', e);
  }
  
  const title = data.title || 'ONDA - Alerta Sísmica';
  const body = data.body || 'Alerta sísmica detectada';
  const urgency = data.urgency || 'normal';
  
  // Configurar vibración según urgencia
  let vibratePattern = [200, 100, 200];
  if (urgency === 'severe') {
    vibratePattern = [500, 200, 500, 200, 500]; // Vibración más intensa
  } else if (urgency === 'moderate') {
    vibratePattern = [300, 150, 300];
  }
  
  const options = {
    body: body,
    icon: '/favicon.ico',
    badge: '/badge.png',
    vibrate: vibratePattern,
    tag: data.quakeId ? `quake-${data.quakeId}` : 'seismic-alert',
    requireInteraction: urgency === 'severe', // Requiere interacción para alertas severas
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      quakeData: data.quakeData,
      urgency: urgency
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver en Mapa',
        icon: '/images/explore.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/images/close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejo de clic en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic en notificación:', event.action);
  event.notification.close();
  
  // En iOS, event.action puede ser undefined, así que abrir la app en cualquier caso
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
