/**
 * ONDA - Pulso Sísmico en Tiempo Real
 * Lógica principal, visualizador de canvas a 60 FPS, mapa Leaflet y Audio Ambiental.
 * 
 * © 2026 Cesar Sarmiento. Todos los derechos reservados.
 * Creado por Cesar Sarmiento
 */

// --- Firebase Configuration (COMPLETAR CON CREDENCIALES DE FIREBASE) ---
// Para obtener estas credenciales:
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un proyecto llamado "ONDA"
// 3. En Project Settings → General, agrega una app web
// 4. Copia las credenciales aquí
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_AUTH_DOMAIN_AQUI",
  projectId: "TU_PROJECT_ID_AQUI",
  storageBucket: "TU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUI",
  appId: "TU_APP_ID_AQUI"
};

// Inicializar Firebase (solo si las credenciales están configuradas)
let messaging = null;
if (firebaseConfig.apiKey !== "TU_API_KEY_AQUI") {
  try {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    console.log('[FIREBASE] Firebase inicializado correctamente');
  } catch (error) {
    console.error('[FIREBASE] Error inicializando Firebase:', error);
  }
} else {
  console.warn('[FIREBASE] Credenciales de Firebase no configuradas - Notificaciones push no funcionarán cuando app esté cerrada');
}

// --- Verificaciones de Compatibilidad Móvil ---
function checkMobileCompatibility() {
  const compatibility = {
    webAudio: 'audioContext' in window || 'webkitAudioContext' in window,
    vibration: 'vibrate' in navigator,
    geolocation: 'geolocation' in navigator,
    localStorage: 'localStorage' in window,
    serviceWorker: 'serviceWorker' in navigator,
    canvas: 'HTMLCanvasElement' in window,
    requestAnimationFrame: 'requestAnimationFrame' in window,
    notifications: 'Notification' in window
  };
  
  console.log('[MÓVIL] Compatibilidad de APIs:', compatibility);
  
  // Mostrar advertencias si hay APIs críticas no disponibles
  if (!compatibility.webAudio) {
    console.warn('[MÓVIL] Web Audio API no disponible - Alertas sonoras no funcionarán');
  }
  if (!compatibility.vibration) {
    console.warn('[MÓVIL] Vibration API no disponible - Vibración SOS no funcionará');
  }
  if (!compatibility.geolocation) {
    console.warn('[MÓVIL] Geolocation API no disponible - Ubicación GPS no funcionará');
  }
  if (!compatibility.notifications) {
    console.warn('[MÓVIL] Notification API no disponible - Notificaciones del sistema no funcionarán');
  }
  
  return compatibility;
}

// Inicializar audio context con fallback para móviles
function initAudioContext() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.error('[MÓVIL] AudioContext no disponible en este navegador');
      return null;
    }
    
    state.audioCtx = new AudioContext();
    
    // Desbloquear audio en móviles (requiere interacción del usuario)
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume().catch(e => {
        console.warn('[MÓVIL] No se pudo reanudar audio context:', e);
      });
    }
    
    return state.audioCtx;
  } catch (e) {
    console.error('[MÓVIL] Error inicializando audio context:', e);
    return null;
  }
}

// Verificar y solicitar permisos para APIs móviles
async function requestMobilePermissions() {
  // Geolocation (iOS 13+ requiere permiso explícito)
  if ('geolocation' in navigator && 'permissions' in navigator) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === 'prompt') {
        console.log('[MÓVIL] Solicitando permiso de geolocalización');
      }
    } catch (e) {
      console.warn('[MÓVIL] No se puede verificar permiso de geolocalización:', e);
    }
  }
  
  // Notificaciones del sistema (CRÍTICO para alertas sísmicas)
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      console.log('[NOTIFICACIONES] Solicitando permiso para notificaciones del sistema');
      try {
        const permission = await Notification.requestPermission();
        console.log('[NOTIFICACIONES] Permiso concedido:', permission === 'granted');
        
        if (permission === 'granted') {
          // Mostrar notificación de prueba para confirmar funcionamiento
          new Notification('ONDA - Sistema Activo', {
            body: 'Notificaciones de alertas sísmicas activadas. Estás protegido.',
            icon: '/favicon.ico',
            badge: '/badge.png',
            vibrate: [200, 100, 200]
          });
        } else {
          console.warn('[NOTIFICACIONES] Permiso denegado - Las alertas no funcionarán en background');
        }
      } catch (e) {
        console.error('[NOTIFICACIONES] Error solicitando permiso:', e);
      }
    } else if (Notification.permission === 'granted') {
      console.log('[NOTIFICACIONES] Permisos ya concedidos - Sistema listo');
    } else {
      console.warn('[NOTIFICACIONES] Permisos denegados - Habilita notificaciones en configuración del navegador');
    }
  }
  
  // Vibration API no requiere permiso, pero verificar disponibilidad
  if (!('vibrate' in navigator)) {
    console.warn('[MÓVIL] Vibración no disponible en este dispositivo');
  }
  
  // Suscribirse a notificaciones push de Firebase si está configurado
  if (messaging) {
    subscribeToFirebasePush();
  }
}

// --- Firebase Cloud Messaging ---
async function subscribeToFirebasePush() {
  if (!messaging) {
    console.warn('[FIREBASE] Messaging no inicializado');
    return;
  }
  
  try {
    // Solicitar permiso de notificación
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FIREBASE] Permiso de notificación denegado');
      return;
    }
    
    // Obtener token de FCM
    const token = await messaging.getToken({
      vapidKey: "TU_VAPID_KEY_AQUI" // Necesario para web push - obtener de Firebase Console → Project Settings → Cloud Messaging
    });
    
    if (token) {
      console.log('[FIREBASE] Token FCM obtenido:', token);
      
      // Guardar token en IndexedDB o localStorage
      localStorage.setItem('fcm_token', token);
      
      // Aquí deberías enviar el token a tu backend
      await sendTokenToBackend(token);
    } else {
      console.warn('[FIREBASE] No se pudo obtener token FCM');
    }
  } catch (error) {
    console.error('[FIREBASE] Error suscribiendo a push:', error);
  }
}

// Enviar token al backend (placeholder - necesitas implementar esto)
async function sendTokenToBackend(token) {
  console.log('[FIREBASE] Token para enviar al backend:', token);
  // Aquí implementarías la llamada a tu API para guardar el token
  // Ejemplo:
  // await fetch('https://tu-backend.com/api/fcm-token', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ token })
  // });
}

// Manejar mensajes de Firebase cuando la app está en foreground
messaging?.onMessage((payload) => {
  console.log('[FIREBASE] Mensaje recibido en foreground:', payload);
  
  const notification = payload.notification;
  const data = payload.data;
  
  // Mostrar notificación del sistema
  if (Notification.permission === 'granted') {
    new Notification(notification.title || 'Alerta Sísmica', {
      body: notification.body,
      icon: notification.icon || '/favicon.ico',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      data: data
    });
  }
});

// Manejar token refresh
messaging?.onTokenRefresh(async () => {
  console.log('[FIREBASE] Token refrescado');
  try {
    const newToken = await messaging.getToken();
    localStorage.setItem('fcm_token', newToken);
    await sendTokenToBackend(newToken);
  } catch (error) {
    console.error('[FIREBASE] Error refrescando token:', error);
  }
});

// Optimizar performance para móviles
function optimizeForMobile() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    console.log('[MÓVIL] Detectado dispositivo móvil - Optimizando...');
    
    // Reducir calidad de canvas en móviles para mejor performance
    const canvas = document.getElementById('pulse-canvas');
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio, 2); // Limitar a 2x en móviles
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
    
    // Reducir FPS objetivo en móviles para ahorrar batería
    state.targetFPS = 50; // 50 FPS en móviles vs 60 en desktop
    state.frameInterval = 1000 / state.targetFPS;
    
    // Reducir cantidad de ondas simultáneas en móviles
    state.maxWaves = 15; // vs 20 en desktop
    
    console.log('[MÓVIL] Optimizaciones aplicadas:', {
      targetFPS: state.targetFPS,
      maxWaves: state.maxWaves,
      devicePixelRatio: Math.min(window.devicePixelRatio, 2)
    });
  }
  
  return isMobile;
}

// --- Estado Global ---
const state = {
  earthquakes: [],
  filteredQuakes: [],
  map: null,
  markers: {},
  userCoords: null,
  selectedQuakeId: null,
  gsi: 15, // Global Seismic Index (10 - 100)
  targetGsi: 15,
  minMagnitude: 'all',
  apiSource: 'auto', // 'auto', 'usgs', 'emsc'
  lastUpdateTime: null,
  
  // IndexedDB
  db: null,
  dbVersion: 1,
  
  // Estado de conexión
  isOnline: navigator.onLine,
  
  // Sistema de alertas rápidas
  knownQuakeIds: new Set(), // IDs de sismos ya procesados
  lastAlertTime: 0,
  alertCooldown: 300000, // 5 minutos entre alertas del mismo sismo
  activeAlerts: new Map(), // Mapa de alertas activas: quakeId -> { quake, urgency, startTime, endTime }
  
  // Simulación de latencia (para pruebas)
  simulateLatency: false,
  latencyMs: 2000, // 2 segundos de latencia simulada
  
  // Optimización de renderizado
  targetFPS: 60,
  lastFrameTime: 0,
  frameInterval: 1000 / 60, // ~16.67ms para 60 FPS
  debugMode: false, // Mostrar FPS y stats
  
  // Modo SOS Atrapado
  trappedSOSActive: false,
  trappedSOSInterval: null,
  trappedCoordinates: null,
  emergencySoundInterval: null,
  
  // Animación de fondo (Calm por defecto)
  currentBgStart: { r: 7, g: 8, b: 12 },
  targetBgStart: { r: 7, g: 8, b: 12 },
  currentBgEnd: { r: 13, g: 20, b: 36 },
  targetBgEnd: { r: 13, g: 20, b: 36 },
  respRate: 1.0,
  targetRespRate: 1.0,
  pulsePhase: 0,
  
  // Ondas activas
  waves: [],
  maxWaves: 20, // Máximo de ondas simultáneas (reducido a 15 en móviles)
  
  // Audio
  audioCtx: null,
  soundEnabled: false,
  oscillator: null,
  gainNode: null,
  filterNode: null,

  // Simulación y Alertas Inteligentes
  simDistance: 150,
  simDepth: 30,
  activeAlertInterval: null,

  // Modo Supervivencia SOS
  sosActive: false,
  soundBeaconActive: false,
  morseInterval: null,
};

// --- Configuración e Inicialización ---
window.addEventListener('DOMContentLoaded', () => {
  // Verificar compatibilidad móvil
  checkMobileCompatibility();
  
  // Solicitar permisos móviles
  requestMobilePermissions();
  
  // Optimizar para móvil si es necesario
  optimizeForMobile();
  
  initCanvas();
  initMap();
  initEventListeners();
  
  // Inicializar IndexedDB
  initIndexedDB();
  
  // Inicializar detección de conexión
  initConnectionMonitoring();
  
  // Cargar coordenadas guardadas
  loadSavedCoordinates();
  
  // Carga inicial y temporizador
  fetchSeismicData();
  setInterval(fetchSeismicData, 60000); // Actualiza cada minuto
  
  // Actualizar indicador de última actualización cada segundo
  setInterval(updateLastUpdateDisplay, 1000);

  // Iniciar verificación de alertas expiradas
  startAlertExpirationCheck();
  
  // Iniciar bucle de animación
  requestAnimationFrame(animationLoop);
});

// --- Motor Canvas "Pulso Dinámico" ---
let canvas, ctx;

function initCanvas() {
  canvas = document.getElementById('pulse-canvas');
  ctx = canvas.getContext('2d');
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Genera una onda concéntrica en el canvas
function createSeismicWave(x, y, magnitude) {
  const isLarge = magnitude >= 6.0;
  const isMid = magnitude >= 4.0 && magnitude < 6.0;
  
  let color = 'rgba(0, 255, 102, '; // Verde neón para sismicidad baja (Calma)
  if (isLarge) color = 'rgba(255, 0, 64, '; // Rojo carmesí para sismicidad alta (Peligro)
  else if (isMid) color = 'rgba(255, 235, 0, '; // Amarillo neón para sismicidad media (Advertencia)

  const maxRadius = Math.max(150, magnitude * 90);
  
  // Agregar Onda P (Primaria, rápida, de menor amplitud)
  state.waves.push({
    x, y,
    radius: 0,
    maxRadius: maxRadius * 1.2,
    speed: 3.5 + (magnitude * 0.4),
    amplitude: magnitude * 2.5,
    lineWidth: 1.5,
    color: color,
    type: 'P',
    alpha: 0.8
  });

  // Agregar Onda S (Secundaria, lenta, destructiva/potente)
  setTimeout(() => {
    state.waves.push({
      x, y,
      radius: 0,
      maxRadius: maxRadius,
      speed: 1.8 + (magnitude * 0.2),
      amplitude: magnitude * 6.5,
      lineWidth: 3 + (magnitude * 0.5),
      color: color,
      type: 'S',
      alpha: 1.0
    });
  }, 150 + (magnitude * 30)); // Delay entre P y S
  
  // Actualizar estadísticas del pulso en UI
  document.getElementById('pstat-active-waves').textContent = state.waves.length;
}

// Bucle de animación optimizado (60 FPS estables)
function animationLoop(timestamp) {
  // Inicializar lastFrameTime en la primera iteración
  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp;
  }
  
  // Calcular delta time para animaciones suaves independientes del framerate
  const deltaTime = timestamp - state.lastFrameTime;
  state.lastFrameTime = timestamp;
  
  // Frame throttling: limitar a targetFPS para evitar sobrecarga
  if (deltaTime < state.frameInterval) {
    requestAnimationFrame(animationLoop);
    return;
  }
  
  // 1. Limpieza y preparación
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 2. Transición suave del GSI (lerp)
  state.gsi += (state.targetGsi - state.gsi) * 0.05;
  document.getElementById('stat-gsi').querySelector('.stat-val').textContent = Math.round(state.gsi);
  
  // Definir colores objetivo según GSI
  let theme = getGSITheme(state.gsi);
  state.targetBgStart = theme.bgStart;
  state.targetBgEnd = theme.bgEnd;
  state.targetRespRate = theme.respRate;
  
  // Lerpeado de colores (optimizado con delta time)
  const lerpFactor = 0.02 * (deltaTime / 16.67); // Normalizar a 60 FPS
  state.currentBgStart.r += (state.targetBgStart.r - state.currentBgStart.r) * lerpFactor;
  state.currentBgStart.g += (state.targetBgStart.g - state.currentBgStart.g) * lerpFactor;
  state.currentBgStart.b += (state.targetBgStart.b - state.currentBgStart.b) * lerpFactor;
  
  state.currentBgEnd.r += (state.targetBgEnd.r - state.currentBgEnd.r) * lerpFactor;
  state.currentBgEnd.g += (state.targetBgEnd.g - state.currentBgEnd.g) * lerpFactor;
  state.currentBgEnd.b += (state.targetBgEnd.b - state.currentBgEnd.b) * lerpFactor;

  state.respRate += (state.targetRespRate - state.respRate) * lerpFactor;
  
  // Actualizar interfaz del estado del pulso
  document.getElementById('pstat-bg-color').textContent = theme.name;
  document.getElementById('pstat-bg-color').className = `pstat-val text-${theme.cssClass}`;
  document.getElementById('pstat-resp-rate').textContent = `${state.respRate.toFixed(1)} Hz`;

  // 3. Dibujar fondo degradado dinámico ("Hum" visual)
  state.pulsePhase += (0.015 * state.respRate) * (deltaTime / 16.67);
  const breath = Math.sin(state.pulsePhase);
  const intensity = 0.4 + (breath * 0.15) + (state.gsi / 200); 

  const bgStartStr = `rgb(${Math.round(state.currentBgStart.r)}, ${Math.round(state.currentBgStart.g)}, ${Math.round(state.currentBgStart.b)})`;
  const bgEndStr = `rgb(${Math.round(state.currentBgEnd.r)}, ${Math.round(state.currentBgEnd.g)}, ${Math.round(state.currentBgEnd.b)})`;
  
  // Degradado radial interactivo centrado o siguiendo sismo seleccionado
  let centerX = canvas.width / 2;
  let centerY = canvas.height / 2;
  
  if (state.selectedQuakeId && state.markers[state.selectedQuakeId]) {
    const latlng = state.markers[state.selectedQuakeId].getLatLng();
    const mapContainer = document.getElementById('map');
    const rect = mapContainer.getBoundingClientRect();
    const point = state.map.latLngToContainerPoint(latlng);
    
    if (point.x >= 0 && point.x <= rect.width && point.y >= 0 && point.y <= rect.height) {
      centerX = rect.left + point.x;
      centerY = rect.top + point.y;
    }
  }

  const grad = ctx.createRadialGradient(
    centerX, centerY, 50,
    centerX, centerY, Math.max(canvas.width, canvas.height) * intensity
  );
  grad.addColorStop(0, bgEndStr);
  grad.addColorStop(1, bgStartStr);
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. Modulación del sintetizador de audio
  updateAudioSynth(breath);

  // 5. Dibujar y actualizar ondas sísmicas (optimizado con culling)
  const visibleWaves = [];
  for (let i = state.waves.length - 1; i >= 0; i--) {
    const w = state.waves[i];
    w.radius += w.speed * (deltaTime / 16.67); // Normalizar a 60 FPS
    
    const lifeRatio = w.radius / w.maxRadius;
    w.alpha = (1 - lifeRatio) * (w.type === 'P' ? 0.6 : 0.9);
    
    // Culling: remover ondas invisibles
    if (w.radius >= w.maxRadius || w.alpha <= 0.01) {
      state.waves.splice(i, 1);
      continue;
    }
    
    // Solo renderizar ondas visibles
    visibleWaves.push(w);
  }
  
  // Batch rendering de ondas para mejor rendimiento
  visibleWaves.forEach(w => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `${w.color}${w.alpha})`;
    ctx.lineWidth = w.lineWidth;
    
    if (w.type === 'P') {
      ctx.setLineDash([4, 6]);
    } else {
      ctx.setLineDash([]);
      ctx.shadowColor = w.color.replace(', ', ', 1)').replace('rgba', 'rgb');
      ctx.shadowBlur = 10 + (w.alpha * 12);
    }
    
    ctx.stroke();
    ctx.restore();
  });
  
  document.getElementById('pstat-active-waves').textContent = state.waves.length;

  // 6. Stats de rendimiento (solo en modo debug)
  if (state.debugMode) {
    const fps = Math.round(1000 / deltaTime);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '14px monospace';
    ctx.fillText(`FPS: ${fps}`, 10, 20);
    ctx.fillText(`Ondas: ${state.waves.length}`, 10, 40);
    ctx.fillText(`Delta: ${deltaTime.toFixed(2)}ms`, 10, 60);
    ctx.fillText(`GSI: ${state.gsi.toFixed(1)}`, 10, 80);
  }

  requestAnimationFrame(animationLoop);
}

// Obtener parámetros según el nivel de sismicidad global (Paleta de Colores Solicitada)
function getGSITheme(gsi) {
  if (gsi < 30) {
    // Calma - Verde Neón (Negro Profundo y Verde muy sutil)
    return {
      name: 'Calma Sísmica',
      respRate: 0.6,
      bgStart: { r: 0, g: 0, b: 0 },
      bgEnd: { r: 0, g: 15, b: 5 },
      cssClass: 'info' // Mapas a .text-info
    };
  } else if (gsi < 55) {
    // Advertencia - Amarillo Neón (Gris Oscuro y Amarillo muy sutil)
    return {
      name: 'Sismicidad Moderada',
      respRate: 1.6,
      bgStart: { r: 2, g: 2, b: 2 },
      bgEnd: { r: 24, g: 22, b: 2 },
      cssClass: 'warn' // Mapas a .text-warn
    };
  } else {
    // Peligro Inminente - Rojo Carmesí Neón (Negro profundo y Carmesí)
    return {
      name: 'Peligro Inminente',
      respRate: 3.5,
      bgStart: { r: 0, g: 0, b: 0 },
      bgEnd: { r: 42, g: 0, b: 10 },
      cssClass: 'alert' // Mapas a .text-alert
    };
  }
}

// --- Integración del Mapa Leaflet ---
function initMap() {
  // Inicializar mapa centrado globalmente
  state.map = L.map('map', {
    zoomControl: true,
    minZoom: 1.5,
    maxZoom: 10,
    attributionControl: false
  }).setView([15, 0], 2);
  
  // Capa base oscura minimalista
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(state.map);

  // Agregar control de zoom abajo a la derecha
  state.map.zoomControl.setPosition('bottomright');
}

// Actualiza los marcadores en el mapa
function updateMapMarkers() {
  // Remover marcadores antiguos
  Object.values(state.markers).forEach(marker => state.map.removeLayer(marker));
  state.markers = {};

  state.filteredQuakes.forEach(quake => {
    const [lng, lat] = quake.geometry.coordinates;
    const mag = quake.properties.mag;
    const place = quake.properties.place;
    const id = quake.id;

    // Determinar color de magnitud
    let color = 'var(--color-low)';
    if (mag >= 6.0) color = 'var(--color-high)';
    else if (mag >= 4.0) color = 'var(--color-mid)';

    // Crear ícono concéntrico animado
    const size = Math.max(16, mag * 6.5);
    const pulseIcon = L.divIcon({
      className: 'map-pulse-marker',
      html: `<div class="map-pulse-icon" style="color: ${color}; width: ${size}px; height: ${size}px; margin-left: -${size/2}px; margin-top: -${size/2}px;"></div>`,
      iconSize: [size, size]
    });

    const marker = L.marker([lat, lng], { icon: pulseIcon }).addTo(state.map);
    
    // Popup estilizado
    marker.bindPopup(`
      <div style="color: #fff; font-family: 'Outfit', sans-serif; padding: 4px;">
        <strong style="color: ${color}; font-size: 1.05rem;">M ${mag.toFixed(1)}</strong><br>
        <span style="font-size: 0.85rem; font-weight:600; display:block; margin: 4px 0;">${place}</span>
        <span style="font-size: 0.75rem; color: #9aa2b5;">Profundidad: ${quake.geometry.coordinates[2]} km</span>
      </div>
    `, {
      closeButton: false,
      className: 'custom-leaflet-popup'
    });

    // Eventos del marcador
    marker.on('click', () => {
      selectEarthquake(id, true);
    });

    state.markers[id] = marker;
  });
}

// --- Integración de Datos (USGS API con fallback EMSC) ---
async function fetchSeismicData() {
  // Si está offline, no intentar conectar
  if (!state.isOnline) {
    console.log('Modo offline - No intentando conectar a APIs');
    document.querySelector('.system-status .status-text').textContent = 'Modo Offline (Datos Cacheados)';
    return;
  }
  
  document.querySelector('.system-status .status-dot').className = 'status-dot loading';
  document.querySelector('.system-status .status-text').textContent = 'Consultando API...';

  try {
    let data;
    let sourceName = '';

    if (state.apiSource === 'usgs') {
      document.querySelector('.system-status .status-text').textContent = 'Consultando USGS...';
      data = await fetchWithRetry('usgs');
      sourceName = 'USGS';
    } else if (state.apiSource === 'emsc') {
      document.querySelector('.system-status .status-text').textContent = 'Consultando EMSC...';
      data = await fetchWithRetry('emsc');
      sourceName = 'EMSC';
    } else {
      // Modo auto: intentar USGS primero, fallback a EMSC
      document.querySelector('.system-status .status-text').textContent = 'Consultando USGS...';
      try {
        data = await fetchWithRetry('usgs');
        sourceName = 'USGS';
      } catch (error) {
        console.warn('USGS falló, intentando EMSC como fallback:', error);
        document.querySelector('.system-status .status-text').textContent = 'Fallback a EMSC...';
        data = await fetchWithRetry('emsc');
        sourceName = 'EMSC (Fallback)';
      }
    }
    
    if (data) {
      // Detectar sismos nuevos antes de actualizar el estado
      const newQuakes = detectNewQuakes(data.quakes);
      
      state.earthquakes = data.quakes;
      state.lastUpdateTime = Date.now();
      calculateGSI(data.hourQuakes);
      applyFilters();
      
      // Guardar sismos en IndexedDB (solo los significativos M4.0+)
      const significantQuakes = data.quakes.filter(q => q.properties.mag >= 4.0);
      if (significantQuakes.length > 0) {
        saveQuakesBatch(significantQuakes);
      }
      
      // Emitir alertas rápidas para sismos nuevos significativos
      if (newQuakes.length > 0) {
        processNewQuakeAlerts(newQuakes);
      }
      
      document.querySelector('.system-status .status-dot').className = 'status-dot green';
      document.querySelector('.system-status .status-text').textContent = `Conexión ${sourceName} Estable`;
      updateLastUpdateDisplay();
    }
  } catch (error) {
    console.error('Error obteniendo datos sísmicos:', error);
    document.querySelector('.system-status .status-dot').className = 'status-dot';
    document.querySelector('.system-status .status-text').textContent = 'Error de Conexión';
    
    // Si falla la conexión, cargar datos cacheados
    loadCachedQuakes();
  }
}

// Función con reintentos automáticos
async function fetchWithRetry(apiSource, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let data;
      
      if (apiSource === 'usgs') {
        data = await fetchUSGSData();
      } else if (apiSource === 'emsc') {
        data = await fetchEMSCData();
      }
      
      return data;
    } catch (error) {
      console.warn(`Intento ${attempt}/${maxRetries} falló para ${apiSource}:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Esperar exponencial antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return null;
}

// Obtener datos de USGS
async function fetchUSGSData() {
  // Simular latencia si está activado
  if (state.simulateLatency) {
    console.log(`[SIMULACIÓN] Latencia de ${state.latencyMs}ms antes de conectar a USGS...`);
    await new Promise(resolve => setTimeout(resolve, state.latencyMs));
  }
  
  // 1. Obtener sismos de la última hora (para pulso vivo y GSI exacto)
  const hourRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
  if (!hourRes.ok) throw new Error('USGS hour endpoint failed');
  const hourData = await hourRes.json();
  
  // 2. Obtener sismos del último día (para poblar el feed si la hora está muy tranquila)
  const dayRes = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
  if (!dayRes.ok) throw new Error('USGS day endpoint failed');
  const dayData = await dayRes.json();
  
  // Mezclar evitando duplicados
  const mergedMap = new Map();
  dayData.features.forEach(f => mergedMap.set(f.id, f));
  hourData.features.forEach(f => mergedMap.set(f.id, f)); // Sobrescribir/agregar más recientes
  
  const quakes = Array.from(mergedMap.values());
  
  // Ordenar por tiempo descendente
  quakes.sort((a, b) => b.properties.time - a.properties.time);
  
  return {
    quakes: quakes,
    hourQuakes: hourData.features
  };
}

// Obtener datos de EMSC (European-Mediterranean Seismological Centre)
async function fetchEMSCData() {
  // Simular latencia si está activado
  if (state.simulateLatency) {
    console.log(`[SIMULACIÓN] Latencia de ${state.latencyMs}ms antes de conectar a EMSC...`);
    await new Promise(resolve => setTimeout(resolve, state.latencyMs));
  }
  
  // EMSC API - últimos eventos (últimas 24 horas)
  const emscRes = await fetch('https://www.seismicportal.eu/fdsnws/event/1/query?format=geojson&limit=100');
  if (!emscRes.ok) throw new Error('EMSC endpoint failed');
  const emscData = await emscRes.json();
  
  // Convertir formato EMSC a formato compatible con USGS
  const convertedQuakes = emscData.features.map(feature => {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    
    return {
      id: feature.id || `emsc-${props.time}`,
      geometry: {
        type: 'Point',
        coordinates: coords // [lon, lat, depth]
      },
      properties: {
        mag: props.mag,
        place: props.place || props.flynn_region || 'Ubicación Desconocida',
        time: props.time,
        depth: coords[2] || 10
      }
    };
  });
  
  // Filtrar eventos de la última hora para GSI
  const oneHourAgo = Date.now() - 3600000;
  const hourQuakes = convertedQuakes.filter(q => q.properties.time >= oneHourAgo);
  
  // Ordenar por tiempo descendente
  convertedQuakes.sort((a, b) => b.properties.time - a.properties.time);
  
  return {
    quakes: convertedQuakes,
    hourQuakes: hourQuakes
  };
}

// Calcula el Índice Sísmico Global (GSI) basado en la energía acumulada
function calculateGSI(recentQuakes) {
  if (!recentQuakes || recentQuakes.length === 0) {
    state.targetGsi = 15; // Calma total
    return;
  }

  // Fórmula basada en el logaritmo de energía liberada: E ~ 10^(1.5 * M)
  // Escala empírica para el dashboard
  let energySum = 0;
  let maxMag = 0;

  recentQuakes.forEach(q => {
    const mag = Math.max(0.5, q.properties.mag);
    if (mag > maxMag) maxMag = mag;
    // Ponderación de energía
    energySum += Math.pow(1.8, mag);
  });

  // Mapeo del índice (mínimo 15, máximo 100)
  const calculated = 15 + Math.log10(energySum + 1) * 16 + (maxMag * 5);
  state.targetGsi = Math.min(100, Math.max(15, Math.round(calculated)));

  // Actualizar tarjeta de estadísticas generales
  document.getElementById('stat-count').querySelector('.stat-val').textContent = recentQuakes.length;
}

// Aplica filtros y actualiza lista/mapa
function applyFilters() {
  const minMag = state.minMagnitude === 'all' ? 0 : parseFloat(state.minMagnitude);
  
  state.filteredQuakes = state.earthquakes.filter(q => {
    const mag = q.properties.mag || 0;
    return mag >= minMag;
  });

  renderFeedList();
  updateMapMarkers();
  updateGeneralStats();
}

// Renderiza la lista lateral (Feed)
function renderFeedList() {
  const listContainer = document.getElementById('earthquake-list');
  listContainer.innerHTML = '';

  if (state.filteredQuakes.length === 0) {
    listContainer.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-circle-info"></i>
        <p>No se encontraron sismos con el filtro actual.</p>
      </div>
    `;
    return;
  }

  state.filteredQuakes.forEach(quake => {
    const id = quake.id;
    const mag = quake.properties.mag || 0;
    const place = quake.properties.place || 'Ubicación Desconocida';
    const time = new Date(quake.properties.time);
    
    // Categorización visual
    let magClass = 'mag-low';
    if (mag >= 6.0) magClass = 'mag-high';
    else if (mag >= 4.0) magClass = 'mag-mid';

    // Distancia y dirección
    let distanceStr = '';
    if (state.userCoords) {
      const [lng, lat] = quake.geometry.coordinates;
      const dist = calculateDistance(state.userCoords.lat, state.userCoords.lng, lat, lng);
      const bearing = calculateBearing(state.userCoords.lat, state.userCoords.lng, lat, lng);
      const cardinal = bearingToCardinal(bearing);
      distanceStr = `<span class="eq-item-dist">${Math.round(dist)} km ${cardinal}</span>`;
    }

    const item = document.createElement('div');
    item.className = `eq-item ${magClass} ${state.selectedQuakeId === id ? 'active' : ''}`;
    item.dataset.id = id;
    
    item.innerHTML = `
      <div class="eq-item-mag">${mag.toFixed(1)}</div>
      <div class="eq-item-details">
        <div class="eq-item-loc">${place}</div>
        <div class="eq-item-meta">
          <span class="eq-item-time">${formatTimeAgo(time)}</span>
          ${distanceStr}
        </div>
      </div>
    `;

    item.addEventListener('click', () => {
      selectEarthquake(id, false);
    });

    listContainer.appendChild(item);
  });
}

// Actualiza métricas globales
function updateGeneralStats() {
  if (state.earthquakes.length === 0) return;

  // Encontrar el sismo máximo en las últimas 24 horas
  let maxQuake = state.earthquakes[0];
  state.earthquakes.forEach(q => {
    if (q.properties.mag > maxQuake.properties.mag) {
      maxQuake = q;
    }
  });

  const maxValEl = document.getElementById('stat-max').querySelector('.stat-val');
  const maxLocEl = document.getElementById('stat-max-loc');

  const maxMag = maxQuake.properties.mag;
  maxValEl.textContent = `M ${maxMag.toFixed(1)}`;
  maxLocEl.textContent = maxQuake.properties.place;

  // Cambiar color del texto del máximo
  maxValEl.className = 'stat-val';
  if (maxMag >= 6.0) maxValEl.classList.add('text-alert');
  else if (maxMag >= 4.0) maxValEl.classList.add('text-warn');
  else maxValEl.classList.add('text-info');

  // Evaluar alertas de cercanía al usuario
  checkProximityAlerts();
}

// Acción al seleccionar un terremoto (click en feed o mapa)
function selectEarthquake(id, clickedOnMap) {
  state.selectedQuakeId = id;
  
  // Resaltar en el feed
  document.querySelectorAll('.eq-item').forEach(item => {
    if (item.dataset.id === id) item.classList.add('active');
    else item.classList.remove('active');
  });

  // Obtener datos
  const quake = state.earthquakes.find(q => q.id === id);
  if (!quake) return;

  const [lng, lat] = quake.geometry.coordinates;
  const mag = quake.properties.mag;
  const depth = quake.geometry.coordinates[2] !== undefined ? quake.geometry.coordinates[2] : 10;
  const place = quake.properties.place || 'Ubicación Desconocida';

  // Enfocar en mapa
  if (!clickedOnMap && state.markers[id]) {
    state.map.setView([lat, lng], 5, { animate: true, duration: 1.2 });
    setTimeout(() => {
      if (state.markers[id]) state.markers[id].openPopup();
    }, 1200);
  }

  // Detonar la simulación de ondas en el canvas
  setTimeout(() => {
    const mapContainer = document.getElementById('map');
    const rect = mapContainer.getBoundingClientRect();
    const point = state.map.latLngToContainerPoint([lat, lng]);
    
    // Generar la onda si el punto queda en pantalla
    const x = rect.left + point.x;
    const y = rect.top + point.y;
    createSeismicWave(x, y, mag);
    
    // Calcular distancia al usuario (geolocalización activa) o distancia simulada
    const distance = state.userCoords 
      ? calculateDistance(state.userCoords.lat, state.userCoords.lng, lat, lng) 
      : state.simDistance;
    
    // Lanzar alerta sísmica interactiva simulada (comienza como si acabara de ocurrir)
    startSmartAlertCountdown(mag, distance, depth, place);
  }, clickedOnMap ? 0 : 600);
}

// --- Geolocalización y Proximidad ---
function requestGeolocation() {
  const geoBox = document.getElementById('geo-status-box');
  const geoTitle = document.getElementById('geo-title');
  const geoDesc = document.getElementById('geo-desc');
  const btn = document.getElementById('btn-request-geo');

  if (!navigator.geolocation) {
    geoTitle.textContent = 'No soportado';
    geoDesc.textContent = 'Tu navegador no admite geolocalización.';
    return;
  }

  geoTitle.textContent = 'Localizando...';
  btn.disabled = true;

  // Opciones de geolocalización con alta precisión
  const geoOptions = {
    enableHighAccuracy: true,    // Usar GPS si disponible
    timeout: 10000,              // 10 segundos timeout
    maximumAge: 300000           // Aceptar datos de hasta 5 minutos
  };

  navigator.geolocation.getCurrentPosition(
    position => {
      state.userCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,    // Precisión en metros
        altitude: position.coords.altitude,    // Altitud en metros
        timestamp: position.timestamp
      };
      
      // Guardar en localStorage para persistencia
      localStorage.setItem('userCoords', JSON.stringify(state.userCoords));
      
      geoBox.classList.add('active');
      geoTitle.textContent = 'Ubicación Activa';
      
      const accuracyStr = state.userCoords.accuracy 
        ? ` (±${Math.round(state.userCoords.accuracy)}m)` 
        : '';
      geoDesc.textContent = `${state.userCoords.lat.toFixed(4)}°, ${state.userCoords.lng.toFixed(4)}°${accuracyStr}`;
      btn.style.display = 'none';
      
      // Mostrar botón de limpiar
      document.getElementById('btn-clear-geo').style.display = 'block';

      // Refrescar el feed para mostrar distancias
      applyFilters();
      
      // Verificar alertas de proximidad inmediatamente
      checkProximityAlerts();
    },
    error => {
      console.warn('Error de geolocalización:', error);
      geoBox.classList.remove('active');
      
      let errorMsg = 'Error desconocido';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = 'Permiso denegado por el usuario';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = 'Ubicación no disponible';
          break;
        case error.TIMEOUT:
          errorMsg = 'Tiempo de espera agotado';
          break;
      }
      
      geoTitle.textContent = 'Error de Ubicación';
      geoDesc.textContent = errorMsg;
      btn.disabled = false;
      btn.textContent = 'Reintentar';
    },
    geoOptions
  );
}

// Cargar coordenadas guardadas al iniciar
function loadSavedCoordinates() {
  const saved = localStorage.getItem('userCoords');
  if (saved) {
    try {
      const coords = JSON.parse(saved);
      // Solo usar si tiene menos de 1 hora
      const oneHourAgo = Date.now() - 3600000;
      if (coords.timestamp && coords.timestamp >= oneHourAgo) {
        state.userCoords = coords;
        
        const geoBox = document.getElementById('geo-status-box');
        const geoTitle = document.getElementById('geo-title');
        const geoDesc = document.getElementById('geo-desc');
        const btn = document.getElementById('btn-request-geo');
        
        geoBox.classList.add('active');
        geoTitle.textContent = 'Ubicación Activa';
        
        const accuracyStr = coords.accuracy 
          ? ` (±${Math.round(coords.accuracy)}m)` 
          : '';
        geoDesc.textContent = `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°${accuracyStr}`;
        btn.style.display = 'none';
        
        // Mostrar botón de limpiar
        document.getElementById('btn-clear-geo').style.display = 'block';
        
        console.log('Coordenadas cargadas desde localStorage:', coords);
      }
    } catch (e) {
      console.warn('Error cargando coordenadas guardadas:', e);
      localStorage.removeItem('userCoords');
    }
  }
}

// Limpiar geolocalización guardada
function clearGeolocation() {
  state.userCoords = null;
  localStorage.removeItem('userCoords');
  
  const geoBox = document.getElementById('geo-status-box');
  const geoTitle = document.getElementById('geo-title');
  const geoDesc = document.getElementById('geo-desc');
  const btn = document.getElementById('btn-request-geo');
  const clearBtn = document.getElementById('btn-clear-geo');
  
  geoBox.classList.remove('active');
  geoTitle.textContent = 'Ubicación desactivada';
  geoDesc.textContent = 'Actívala para calcular distancias a epicentros e impactos locales.';
  btn.style.display = 'block';
  btn.textContent = 'Activar';
  btn.disabled = false;
  clearBtn.style.display = 'none';
  
  // Refrescar feed para ocultar distancias
  applyFilters();
  
  // Ocultar banner de proximidad
  document.getElementById('proximity-banner').classList.add('hidden');
}

// Verifica si hay sismos destructivos cerca y gatilla un banner
function checkProximityAlerts() {
  if (!state.userCoords || state.earthquakes.length === 0) return;

  const thresholdKm = 600; // km
  let closestQuake = null;
  let minDistance = Infinity;
  let closestDirection = '';

  // Filtrar sismos de la última hora o significativos
  state.earthquakes.slice(0, 30).forEach(q => {
    const [lng, lat] = q.geometry.coordinates;
    const dist = calculateDistance(state.userCoords.lat, state.userCoords.lng, lat, lng);
    
    if (dist < minDistance) {
      minDistance = dist;
      closestQuake = q;
      const bearing = calculateBearing(state.userCoords.lat, state.userCoords.lng, lat, lng);
      closestDirection = bearingToCardinal(bearing);
    }
  });

  const banner = document.getElementById('proximity-banner');
  
  if (closestQuake && minDistance <= thresholdKm && closestQuake.properties.mag >= 4.0) {
    const distVal = document.getElementById('prox-dist');
    distVal.textContent = `${Math.round(minDistance)} km ${closestDirection}`;
    banner.classList.remove('hidden');

    // Si es muy cercano e importante, perturbar el GSI temporalmente
    if (minDistance < 250 && closestQuake.properties.mag >= 5.0) {
      state.targetGsi = Math.max(state.targetGsi, 75);
    }
  } else {
    banner.classList.add('hidden');
  }
}

// --- Sintetizador de Audio Hum (Web Audio API) ---
function toggleAudioSynth() {
  const btn = document.getElementById('audio-toggle-btn');
  
  if (!state.soundEnabled) {
    // Inicializar Audio por primera vez
    if (!state.audioCtx) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Reanudar contexto si está suspendido (requerido por navegadores modernos)
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume().then(() => {
        console.log('AudioContext reanudado');
      }).catch(err => {
        console.warn('Error reanudando AudioContext:', err);
      });
    }

    startHumOscillator();
    state.soundEnabled = true;
    btn.classList.add('playing');
    document.getElementById('audio-icon').className = 'fa-solid fa-volume-high';
    document.getElementById('audio-text').textContent = 'Hum Sísmico Activo';
  } else {
    stopHumOscillator();
    state.soundEnabled = false;
    btn.classList.remove('playing');
    document.getElementById('audio-icon').className = 'fa-solid fa-volume-xmark';
    document.getElementById('audio-text').textContent = 'Hum Sísmico Desactivado';
  }
}

// Inicializar contexto de audio al primer clic del usuario (requerido por políticas de navegador)
function initAudioContext() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

function startHumOscillator() {
  if (!state.audioCtx) return;

  // Crear Nodos
  state.oscillator = state.audioCtx.createOscillator();
  state.gainNode = state.audioCtx.createGain();
  state.filterNode = state.audioCtx.createBiquadFilter();

  // Configurar oscilador de muy baja frecuencia (hum de la tierra)
  state.oscillator.type = 'triangle';
  state.oscillator.frequency.value = 55; // Nota La (A1)
  
  // Filtro de paso bajo para eliminar frecuencias molestas y simular acústica subterránea
  state.filterNode.type = 'lowpass';
  state.filterNode.frequency.value = 90;

  // Volumen tenue para evitar molestia (muy suave)
  state.gainNode.gain.setValueAtTime(0.005, state.audioCtx.currentTime);

  // Conectar nodos: Oscilador -> Filtro -> Volumen -> Altavoces
  state.oscillator.connect(state.filterNode);
  state.filterNode.connect(state.gainNode);
  state.gainNode.connect(state.audioCtx.destination);

  state.oscillator.start();
}

function stopHumOscillator() {
  if (state.oscillator) {
    try {
      state.oscillator.stop();
      state.oscillator.disconnect();
    } catch(e) {}
    state.oscillator = null;
  }
}

// Modula volumen y tono de acuerdo a la respiración del fondo y el GSI
function updateAudioSynth(breathValue) {
  if (!state.soundEnabled || !state.audioCtx || !state.oscillator) return;

  const now = state.audioCtx.currentTime;
  
  // 1. Modulación de Tono (GSI más alto = frecuencia ligeramente más alta/tensa)
  const baseFreq = 50 + (state.gsi * 0.25); // Rango ~50Hz - 75Hz
  // Variación sutil con la respiración
  const freqVar = breathValue * 1.5; 
  state.oscillator.frequency.setTargetAtTime(baseFreq + freqVar, now, 0.1);

  // 2. Modulación de Filtro
  const filterFreq = 80 + (state.gsi * 0.5) + (breathValue * 5);
  state.filterNode.frequency.setTargetAtTime(filterFreq, now, 0.1);

  // 3. Modulación de Volumen (Swell/respiración)
  const baseVolume = 0.003 + (state.gsi / 8000); // GSI 100 -> ~0.015 volumen
  const volMod = (breathValue + 1) * 0.5; // Escala a 0 - 1
  const targetVolume = baseVolume * (0.6 + volMod * 0.8);
  state.gainNode.gain.setTargetAtTime(targetVolume, now, 0.15);
}

// Sonido de estruendo / impacto de sismo
function triggerRumbleSound(magnitude, force = false) {
  if (!state.soundEnabled && !force) return;
  if (!state.audioCtx) return;
  
  // Reanudar audio context si está suspendido (CRÍTICO para móviles)
  ensureAudioContextReady().then(() => {
    triggerRumbleSoundSound(magnitude);
  });
}

function triggerRumbleSoundSound(magnitude) {
  if (!state.audioCtx) return;
  
  const now = state.audioCtx.currentTime;
  
  // Crear múltiples osciladores para sonido complejo
  const osc1 = state.audioCtx.createOscillator();
  const osc2 = state.audioCtx.createOscillator();
  const osc3 = state.audioCtx.createOscillator();
  const gain1 = state.audioCtx.createGain();
  const gain2 = state.audioCtx.createGain();
  const gain3 = state.audioCtx.createGain();
  const filter = state.audioCtx.createBiquadFilter();
  const masterGain = state.audioCtx.createGain();

  // Oscilador 1 - Bajos profundos (sawtooth)
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(80 + (magnitude * 10), now);
  osc1.frequency.exponentialRampToValueAtTime(25, now + 2.0 + (magnitude * 0.3));

  // Oscilador 2 - Medios (square)
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(120 + (magnitude * 12), now);
  osc2.frequency.exponentialRampToValueAtTime(40, now + 1.5 + (magnitude * 0.2));

  // Oscilador 3 - Altos sutiles (triangle)
  osc3.type = 'triangle';
  osc3.frequency.setValueAtTime(200 + (magnitude * 15), now);
  osc3.frequency.exponentialRampToValueAtTime(60, now + 1.0);

  // Filtro de paso bajo para eliminar frecuencias agudas
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(150, now);
  filter.frequency.exponentialRampToValueAtTime(40, now + 2.5);
  filter.Q.value = 2; // Resonancia sutil

  // Ganancias individuales
  const baseVolume = 0.06 + (magnitude * 0.015);
  gain1.gain.setValueAtTime(baseVolume * 0.5, now);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

  gain2.gain.setValueAtTime(baseVolume * 0.3, now);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

  gain3.gain.setValueAtTime(baseVolume * 0.15, now);
  gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

  // Master gain para control total
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(1, now + 0.05);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0 + (magnitude * 0.4));

  // Conectar nodos
  osc1.connect(gain1);
  osc2.connect(gain2);
  osc3.connect(gain3);
  
  gain1.connect(filter);
  gain2.connect(filter);
  gain3.connect(filter);
  
  filter.connect(masterGain);
  masterGain.connect(state.audioCtx.destination);

  // Iniciar y detener
  osc1.start(now);
  osc1.stop(now + 3.0 + (magnitude * 0.4));
  osc2.start(now);
  osc2.stop(now + 2.5 + (magnitude * 0.3));
  osc3.start(now);
  osc3.stop(now + 2.0);

  // Limpiar nodos
  setTimeout(() => {
    osc1.disconnect();
    osc2.disconnect();
    osc3.disconnect();
    gain1.disconnect();
    gain2.disconnect();
    gain3.disconnect();
    filter.disconnect();
    masterGain.disconnect();
  }, (3.5 + magnitude * 0.5) * 1000);
}

// --- Modo de Supervivencia SOS ---
function toggleSOSMode(active) {
  state.sosActive = active;
  const panel = document.getElementById('sos-overlay-panel');
  
  if (active) {
    panel.classList.remove('hidden');
    // Silenciar el Hum de fondo para emergencias
    if (state.soundEnabled && state.oscillator) {
      state.gainNode.gain.setValueAtTime(0, state.audioCtx.currentTime);
    }
  } else {
    panel.classList.add('hidden');
    // Desactivar alarmas y estrobos
    stopStrobeFlashlight();
    stopSoundBeacon();
    // Reactivar Hum
    if (state.soundEnabled && state.oscillator) {
      updateAudioSynth(0);
    }
  }
}

function startStrobeFlashlight() {
  state.strobeActive = true;
  document.getElementById('sos-strobe-layer').classList.add('active');
  document.getElementById('btn-toggle-strobe').textContent = 'Apagar Linterna Estroboscópica';
  document.getElementById('btn-toggle-strobe').classList.add('active');
}

function stopStrobeFlashlight() {
  state.strobeActive = false;
  document.getElementById('sos-strobe-layer').classList.remove('active');
  document.getElementById('btn-toggle-strobe').textContent = 'Activar Linterna Estroboscópica';
  document.getElementById('btn-toggle-strobe').classList.remove('active');
}

function toggleStrobeFlashlight() {
  if (state.strobeActive) {
    stopStrobeFlashlight();
  } else {
    startStrobeFlashlight();
  }
}

function playMorseSequence() {
  if (!state.soundBeaconActive || !state.audioCtx) return;
  
  try {
    const now = state.audioCtx.currentTime;
    const u = 0.12; // 120ms Morse unit (más rápido para mayor urgencia)
    
    const scheduleBeep = (startOffset, durationUnits) => {
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();
      const filter = state.audioCtx.createBiquadFilter();
      
      // Tono más alto y penetrante para emergencias
      osc.type = 'square'; // Onda cuadrada más penetrante que sine
      osc.frequency.setValueAtTime(2500, now + startOffset);
      
      // Filtro para suavizar armónicos agresivos pero mantener penetración
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, now + startOffset);
      filter.Q.value = 3;
      
      // Envolvente más agresiva
      gain.gain.setValueAtTime(0, now + startOffset);
      gain.gain.linearRampToValueAtTime(0.25, now + startOffset + 0.005);
      gain.gain.setValueAtTime(0.25, now + startOffset + (durationUnits * u) - 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + (durationUnits * u));
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(state.audioCtx.destination);
      
      osc.start(now + startOffset);
      osc.stop(now + startOffset + (durationUnits * u) + 0.1);
      
      // Limpiar nodos
      setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
        filter.disconnect();
      }, ((startOffset + durationUnits * u + 0.2) * 1000));
    };
    
    // Morse SOS: ... --- ...
    // S: . . .
    scheduleBeep(0 * u, 1);
    scheduleBeep(2 * u, 1);
    scheduleBeep(4 * u, 1);
    
    // O: - - -
    scheduleBeep(8 * u, 3);
    scheduleBeep(12 * u, 3);
    scheduleBeep(16 * u, 3);
    
    // S: . . .
    scheduleBeep(22 * u, 1);
    scheduleBeep(24 * u, 1);
    scheduleBeep(26 * u, 1);
  } catch (e) {
    console.warn("Error en el transmisor Morse:", e);
  }
}

function startSoundBeacon() {
  // Asegurar contexto de audio
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }

  state.soundBeaconActive = true;
  document.getElementById('btn-toggle-sound-beacon').textContent = 'Apagar Alarma Morse SOS';
  document.getElementById('btn-toggle-sound-beacon').classList.add('active');
  
  // Ejecutar de inmediato y programar intervalo
  playMorseSequence();
  state.morseInterval = setInterval(playMorseSequence, 5500);
}

function stopSoundBeacon() {
  state.soundBeaconActive = false;
  document.getElementById('btn-toggle-sound-beacon').textContent = 'Activar Alarma Morse SOS';
  document.getElementById('btn-toggle-sound-beacon').classList.remove('active');
  
  if (state.morseInterval) {
    clearInterval(state.morseInterval);
    state.morseInterval = null;
  }
}

function toggleSoundBeacon() {
  if (state.soundBeaconActive) {
    stopSoundBeacon();
  } else {
    startSoundBeacon();
  }
}

// --- Pitidos de Advertencia (Web Audio API) ---
function playBeep(frequency, duration, type = 'sine', intensity = 0.5) {
  if (!state.soundEnabled || !state.audioCtx) return;
  
  try {
    const now = state.audioCtx.currentTime;
    
    // Crear oscilador principal
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();
    
    // Configurar tipo de onda según intensidad
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    
    // Envolvente ADSR (Attack, Decay, Sustain, Release)
    const attackTime = 0.01;
    const decayTime = 0.05;
    const sustainLevel = intensity * 0.15;
    const releaseTime = duration * 0.3;
    
    // Attack rápido para sonido penetrante
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(intensity * 0.25, now + attackTime);
    
    // Decay
    gain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    
    // Release suave
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    
    osc.connect(gain);
    gain.connect(state.audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + duration + 0.1);
    
    // Limpiar nodos después
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, (duration + 0.2) * 1000);
    
  } catch (e) {
    console.warn("Error reproduciendo pitido:", e);
  }
}

// Tono de alerta severa - muy penetrante con armónicos
function playSevereAlert(force = false) {
  if (!state.soundEnabled && !force) return;
  if (!state.audioCtx) return;
  
  // Reanudar audio context si está suspendido (CRÍTICO para móviles)
  ensureAudioContextReady().then(() => {
    playSevereAlertSound();
  });
}

function playSevereAlertSound() {
  if (!state.audioCtx) return;
  
  const now = state.audioCtx.currentTime;
  
  // Oscilador principal - onda de sierra para sonido agresivo
  const osc1 = state.audioCtx.createOscillator();
  const gain1 = state.audioCtx.createGain();
  
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(880, now); // A5
  osc1.frequency.linearRampToValueAtTime(980, now + 0.1); // Slide a B5
  
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.2, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  
  // Segundo oscilador - detune para efecto disonante
  const osc2 = state.audioCtx.createOscillator();
  const gain2 = state.audioCtx.createGain();
  
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(880, now);
  osc2.detune.setValueAtTime(15, now); // Ligero detune
  
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.1, now + 0.02);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  
  // Filtro para suavizar armónicos agresivos
  const filter = state.audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + 0.2);
  
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain1);
  gain1.connect(state.audioCtx.destination);
  
  osc1.start(now);
  osc1.stop(now + 0.3);
  osc2.start(now);
  osc2.stop(now + 0.25);
  
  setTimeout(() => {
    osc1.disconnect();
    osc2.disconnect();
    gain1.disconnect();
    gain2.disconnect();
    filter.disconnect();
  }, 400);
}

// Tono de alerta moderada - onda triangular más suave
function playModerateAlert(force = false) {
  if (!state.soundEnabled && !force) return;
  if (!state.audioCtx) return;
  
  // Reanudar audio context si está suspendido (CRÍTICO para móviles)
  ensureAudioContextReady().then(() => {
    playModerateAlertSound();
  });
}

function playModerateAlertSound() {
  if (!state.audioCtx) return;
  
  const now = state.audioCtx.currentTime;
  
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(659, now); // E5
  
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  
  osc.start(now);
  osc.stop(now + 0.2);
  
  setTimeout(() => {
    osc.disconnect();
    gain.disconnect();
  }, 300);
}

// Tono de alerta baja - onda sinusoidal pura
function playLowAlert(force = false) {
  if (!state.soundEnabled && !force) return;
  if (!state.audioCtx) return;
  
  // Reanudar audio context si está suspendido (CRÍTICO para móviles)
  ensureAudioContextReady().then(() => {
    playLowAlertSound();
  });
}

function playLowAlertSound() {
  if (!state.audioCtx) return;
  
  const now = state.audioCtx.currentTime;
  
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, now); // A4
  
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  
  osc.start(now);
  osc.stop(now + 0.18);
  
  setTimeout(() => {
    osc.disconnect();
    gain.disconnect();
  }, 280);
}

// --- Vibración Háptica por Hardware (`navigator.vibrate`) ---
function triggerHapticVibrate(patternType) {
  if (!navigator.vibrate) return;

  try {
    if (patternType === 'low-pulse') {
      navigator.vibrate(50);
    } else if (patternType === 'moderate-pulse') {
      navigator.vibrate(100);
    } else if (patternType === 'severe-pulse') {
      navigator.vibrate(150);
    } else if (patternType === 'moderate-impact') {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } else if (patternType === 'severe-impact') {
      navigator.vibrate([400, 100, 400, 100, 600, 200, 800]);
    }
  } catch (e) {
    console.warn("La vibración háptica fue bloqueada por el navegador:", e);
  }
}

// --- Helper para reanudar AudioContext en móviles ---
async function ensureAudioContextReady() {
  if (!state.audioCtx) return false;
  
  if (state.audioCtx.state === 'suspended') {
    try {
      await state.audioCtx.resume();
      console.log('[AUDIO] AudioContext reanudado exitosamente');
      return true;
    } catch (e) {
      console.warn('[AUDIO] Error reanudando AudioContext:', e);
      return false;
    }
  }
  
  return true;
}

// --- Wake Lock API para mantener pantalla activa en alertas severas ---
let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) {
    console.warn('[WAKE LOCK] Wake Lock API no disponible en este navegador');
    return false;
  }
  
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    console.log('[WAKE LOCK] Pantalla activada - no se apagará');
    
    wakeLock.addEventListener('release', () => {
      console.log('[WAKE LOCK] Pantalla liberada');
      wakeLock = null;
    });
    
    return true;
  } catch (e) {
    console.warn('[WAKE LOCK] Error solicitando wake lock:', e);
    return false;
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// --- Cuenta Regresiva de Ondas Sísmicas ---
function startSmartAlertCountdown(mag, dist, dep, place, force = false) {
  // Cancelar temporizador anterior si existe
  if (state.activeAlertInterval) {
    clearInterval(state.activeAlertInterval);
    state.activeAlertInterval = null;
  }

  // Detener vibraciones previas
  if (navigator.vibrate) navigator.vibrate(0);

  // Distancia hipocentral (Teorema de Pitágoras con profundidad)
  const d_hypo = Math.sqrt(dist * dist + dep * dep);

  // Tiempos de viaje teóricos basados en velocidades de corteza terrestre
  const total_t_p = d_hypo / 6.0;   // Onda P a 6.0 km/s
  const total_t_s = d_hypo / 3.5;   // Onda S a 3.5 km/s
  const total_t_surf = dist / 3.0;  // Onda superficial a 3.0 km/s

  const startTime = Date.now();
  
  // Categorizar nivel de alarma según magnitud y distancia
  let alertLevel = 'low';
  if (mag >= 6.0 && dist < 300) alertLevel = 'severe';
  else if (mag >= 4.5 && dist < 600) alertLevel = 'moderate';

  const panel = document.getElementById('smart-alert-panel');
  const card = panel.querySelector('.smart-alert-card');

  // Ajustar estilos de la tarjeta de alerta según gravedad
  if (alertLevel === 'severe') {
    card.style.borderColor = 'var(--color-high)';
    card.style.boxShadow = '0 0 50px rgba(255, 45, 85, 0.4)';
    card.style.background = 'rgba(26, 12, 21, 0.9)';
  } else if (alertLevel === 'moderate') {
    card.style.borderColor = 'var(--color-mid)';
    card.style.boxShadow = '0 0 50px rgba(255, 210, 0, 0.3)';
    card.style.background = 'rgba(26, 22, 12, 0.9)';
  } else {
    card.style.borderColor = 'var(--color-low)';
    card.style.boxShadow = '0 0 30px rgba(0, 240, 255, 0.2)';
    card.style.background = 'rgba(12, 24, 26, 0.9)';
  }

  // Llenar datos en UI
  document.getElementById('alert-mag').textContent = `M ${mag.toFixed(1)}`;
  document.getElementById('alert-mag').style.color = `var(--color-${alertLevel === 'severe' ? 'high' : (alertLevel === 'moderate' ? 'mid' : 'low')})`;
  document.getElementById('alert-place').textContent = place;
  document.getElementById('alert-depth').textContent = Math.round(dep);
  document.getElementById('alert-distance').textContent = Math.round(dist);

  // Desplegar panel
  panel.classList.remove('hidden');

  let lastBeepTime = 0;

  state.activeAlertInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;

    const rem_p = Math.max(0, total_t_p - elapsed);
    const rem_s = Math.max(0, total_t_s - elapsed);
    const rem_surf = Math.max(0, total_t_surf - elapsed);

    // Actualizar valores en UI
    document.getElementById('time-p-val').textContent = rem_p > 0 ? rem_p.toFixed(1) : 'Arribada';
    document.getElementById('time-s-val').textContent = rem_s > 0 ? rem_s.toFixed(1) : 'Arribada';
    document.getElementById('time-surf-val').textContent = rem_surf > 0 ? rem_surf.toFixed(1) : 'Arribada';

    // Actualizar barras de progreso
    document.getElementById('bar-p').style.width = `${Math.min(100, (1 - rem_p / total_t_p) * 100)}%`;
    document.getElementById('bar-s').style.width = `${Math.min(100, (1 - rem_s / total_t_s) * 100)}%`;
    document.getElementById('bar-surf').style.width = `${Math.min(100, (1 - rem_surf / total_t_surf) * 100)}%`;

    // Gatillar pitidos y vibraciones reactivas
    if (rem_surf > 0) {
      let beepInterval = 1.5; // Intervalo en segundos
      if (rem_surf <= 5) beepInterval = 0.3;      // Alarma de impacto inminente
      else if (rem_surf <= 12) beepInterval = 0.7; // Alarma intermedia

      const nowSec = Date.now() / 1000;
      if (nowSec - lastBeepTime >= beepInterval) {
        lastBeepTime = nowSec;

        // Pitido basado en alerta
        if (alertLevel === 'severe') {
          playSevereAlert(force); // Tono penetrante con armónicos
          triggerHapticVibrate('severe-pulse');
        } else if (alertLevel === 'moderate') {
          playModerateAlert(force); // Tono triangular suave
          triggerHapticVibrate('moderate-pulse');
        } else {
          playLowAlert(force); // Tono sinusoidal puro
          triggerHapticVibrate('low-pulse');
        }
      }
    }

    // Llegada de la sacudida superficial (Llegada a cero)
    if (rem_surf <= 0) {
      clearInterval(state.activeAlertInterval);
      state.activeAlertInterval = null;

      // Efectos de sacudida general de pantalla (Vibración de UI por CSS)
      const dashboard = document.querySelector('.dashboard-wrapper');
      const mapEl = document.getElementById('map');
      
      const shakeClass = alertLevel === 'severe' ? 'shake-severe' : (alertLevel === 'moderate' ? 'shake-moderate' : '');
      
      if (shakeClass) {
        dashboard.classList.add(shakeClass);
        mapEl.classList.add(shakeClass);

        // Sonido de estruendo masivo
        triggerRumbleSound(mag, force);

        // Vibraciones prolongadas
        if (alertLevel === 'severe') {
          triggerHapticVibrate('severe-impact');
        } else {
          triggerHapticVibrate('moderate-impact');
        }

        // Remover sacudida después de 3 segundos
        setTimeout(() => {
          dashboard.classList.remove(shakeClass);
          mapEl.classList.remove(shakeClass);
        }, 3000);
      } else {
        // En sismicidad leve, solo un sutil estruendo
        triggerRumbleSound(mag, force);
      }

      document.getElementById('time-surf-val').textContent = '¡ARRIBADA!';
      
      // Auto-ocultar alerta después de 4 segundos del impacto
      setTimeout(() => {
        if (!state.activeAlertInterval) {
          panel.classList.add('hidden');
        }
      }, 4000);
    }
  }, 50); // Muestreo cada 50ms para fluidez total
}

// --- Controladores de Eventos y Simulación ---
function initEventListeners() {
  // Filtro de magnitud
  document.getElementById('min-mag-filter').addEventListener('change', (e) => {
    state.minMagnitude = e.target.value;
    applyFilters();
  });

  // Selector de API
  document.getElementById('api-source-select').addEventListener('change', (e) => {
    state.apiSource = e.target.value;
    fetchSeismicData(); // Recargar datos con la nueva API
  });

  // Botón Geolocalización
  document.getElementById('btn-request-geo').addEventListener('click', requestGeolocation);
  
  // Botón Limpiar Geolocalización
  document.getElementById('btn-clear-geo').addEventListener('click', clearGeolocation);

  // Botón cerrar banner
  document.getElementById('close-prox-banner').addEventListener('click', () => {
    document.getElementById('proximity-banner').classList.add('hidden');
  });

  // Botones de Simulación
  document.querySelectorAll('.btn-sim').forEach(btn => {
    btn.addEventListener('click', () => {
      const mag = parseFloat(btn.dataset.mag);
      triggerSimulation(mag);
    });
  });

  // Botón de Audio
  document.getElementById('audio-toggle-btn').addEventListener('click', toggleAudioSynth);

  // Sliders de control de simulación
  document.getElementById('input-sim-distance').addEventListener('input', (e) => {
    state.simDistance = parseInt(e.target.value);
    document.getElementById('val-sim-distance').textContent = `${state.simDistance} km`;
  });

  document.getElementById('input-sim-depth').addEventListener('input', (e) => {
    state.simDepth = parseInt(e.target.value);
    document.getElementById('val-sim-depth').textContent = `${state.simDepth} km`;
  });

  // Botón de silenciar y cerrar alerta inteligente
  document.getElementById('btn-close-alert').addEventListener('click', () => {
    if (state.activeAlertInterval) {
      clearInterval(state.activeAlertInterval);
      state.activeAlertInterval = null;
    }
    document.getElementById('smart-alert-panel').classList.add('hidden');
    if (navigator.vibrate) navigator.vibrate(0);
  });

  // --- Eventos del Modo SOS ---
  document.getElementById('btn-open-sos').addEventListener('click', () => {
    toggleSOSMode(true);
  });

  document.getElementById('btn-close-sos').addEventListener('click', () => {
    toggleSOSMode(false);
  });

  document.getElementById('btn-toggle-strobe').addEventListener('click', () => {
    toggleStrobeFlashlight();
  });

  document.getElementById('btn-stop-strobe-layer').addEventListener('click', () => {
    stopStrobeFlashlight();
  });

  document.getElementById('btn-toggle-sound-beacon').addEventListener('click', () => {
    toggleSoundBeacon();
  });

  // Pestañas de Primeros Auxilios
  document.querySelectorAll('.sos-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Remover activas
      document.querySelectorAll('.sos-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.sos-tab-content').forEach(c => c.classList.remove('active'));
      
      // Activar clickeada
      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      document.getElementById(targetId).classList.add('active');
    });
  });
  
  // --- Eventos de Simulación y Debug ---
  document.getElementById('toggle-latency').addEventListener('change', (e) => {
    state.simulateLatency = e.target.checked;
    console.log(`[SIMULACIÓN] Latencia ${state.simulateLatency ? 'activada' : 'desactivada'} (${state.latencyMs}ms)`);
  });
  
  document.getElementById('toggle-debug').addEventListener('change', (e) => {
    state.debugMode = e.target.checked;
    console.log(`[DEBUG] Modo debug ${state.debugMode ? 'activado' : 'desactivado'}`);
  });
  
  // --- Evento SOS Atrapado ---
  document.getElementById('btn-trapped-sos').addEventListener('click', activateTrappedSOS);
}

// Ejecuta una simulación completa de terremoto
function triggerSimulation(magnitude) {
  // Activar audio context para simulación
  if (!state.audioCtx) {
    initAudioContext();
  }
  
  // Simular impacto en el centro de la pantalla
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2;
  
  createSeismicWave(x, y, magnitude);

  // Emitir alerta rápida visual y sonora con estructura correcta
  const simulatedQuake = {
    id: 'sim-' + Date.now(),
    properties: {
      mag: magnitude,
      place: 'Sismo Simulado (Epicentro en Coordenadas de Prueba)',
      time: Date.now(),
      depth: state.simDepth || 10
    },
    geometry: {
      coordinates: [0, 0, state.simDepth || 10]
    }
  };
  
  // Calcular urgencia para simulación
  let urgency = 'low';
  if (magnitude >= 6.5) {
    urgency = 'critical';
  } else if (magnitude >= 6.0) {
    urgency = 'high';
  } else if (magnitude >= 5.5) {
    urgency = 'medium';
  }
  
  // Emitir alerta rápida con sonido y vibración (forzado para simulación)
  emitQuickAlert(simulatedQuake, urgency, state.simDistance || 150, null, Date.now(), Date.now() + 300000, false, true);

  // Lanzar la alerta inteligente con los parámetros de distancia y profundidad simulados
  startSmartAlertCountdown(magnitude, state.simDistance, state.simDepth, "Sismo Simulado (Epicentro en Coordenadas de Prueba)", true);

  // Poner el mapa temporalmente vibrando (agregando clase CSS opcional al wrapper)
  const mapEl = document.getElementById('map');
  mapEl.style.animation = 'none';
  // Forzar reflow
  void mapEl.offsetWidth;
  
  if (magnitude >= 6.0) {
    mapEl.style.animation = 'earthquakeShake 0.8s ease-in-out';
  } else if (magnitude >= 4.5) {
    mapEl.style.animation = 'earthquakeShake 0.4s ease-in-out';
  }

  // Elevar el GSI temporalmente
  const prevTargetGsi = state.targetGsi;
  state.targetGsi = Math.min(100, state.gsi + (magnitude * 12));
  
  // Regresa al GSI original lentamente después de 8 segundos
  setTimeout(() => {
    state.targetGsi = prevTargetGsi;
  }, 8000);
}

// Estilo CSS temporal inyectado para la vibración sísmica
const styleSheet = document.createElement('style');
styleSheet.innerText = `
  @keyframes earthquakeShake {
    0%, 100% { transform: translate(0, 0); }
    10%, 30%, 50%, 70%, 90% { transform: translate(-4px, 3px) rotate(-0.5deg); }
    20%, 40%, 60%, 80% { transform: translate(4px, -3px) rotate(0.5deg); }
  }
`;
document.head.appendChild(styleSheet);


// --- Utilidades Matemáticas y Formateo ---

// Distancia entre coordenadas (Fórmula Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calcular dirección (bearing) desde punto1 hacia punto2 en grados
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = deg2rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(deg2rad(lat2));
  const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
        Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  const bearingDeg = rad2deg(bearing);
  return (bearingDeg + 360) % 360; // Normalizar a 0-360
}

// Convertir bearing en grados a dirección cardinal
function bearingToCardinal(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function rad2deg(rad) {
  return rad * (180 / Math.PI);
}

// --- IndexedDB - Base de Datos Local ---

// Inicializar IndexedDB
function initIndexedDB() {
  const request = indexedDB.open('ONDASeismicDB', state.dbVersion);
  
  request.onerror = (event) => {
    console.error('Error abriendo IndexedDB:', event.target.error);
  };
  
  request.onsuccess = (event) => {
    state.db = event.target.result;
    console.log('IndexedDB inicializado correctamente');
    
    // Cargar historial de sismos
    loadQuakeHistory();
  };
  
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    
    // Store para historial de sismos
    if (!db.objectStoreNames.contains('quakes')) {
      const quakeStore = db.createObjectStore('quakes', { keyPath: 'id' });
      quakeStore.createIndex('time', 'time', { unique: false });
      quakeStore.createIndex('mag', 'mag', { unique: false });
      quakeStore.createIndex('place', 'place', { unique: false });
    }
    
    // Store para planes de emergencia
    if (!db.objectStoreNames.contains('emergencyPlans')) {
      const plansStore = db.createObjectStore('emergencyPlans', { keyPath: 'id', autoIncrement: true });
      plansStore.createIndex('name', 'name', { unique: true });
      plansStore.createIndex('created', 'created', { unique: false });
    }
    
    // Store para configuración de usuario
    if (!db.objectStoreNames.contains('userSettings')) {
      const settingsStore = db.createObjectStore('userSettings', { keyPath: 'key' });
    }
    
    console.log('IndexedDB schema actualizado');
  };
}

// --- Sistema de Alertas Rápidas ---

// Detectar sismos nuevos comparando con IDs conocidos
function detectNewQuakes(currentQuakes) {
  const newQuakes = [];
  
  currentQuakes.forEach(quake => {
    if (!state.knownQuakeIds.has(quake.id)) {
      newQuakes.push(quake);
      state.knownQuakeIds.add(quake.id);
    }
  });
  
  return newQuakes;
}

// Procesar alertas para sismos nuevos
function processNewQuakeAlerts(newQuakes) {
  // Filtrar sismos en Venezuela (aprox coords: 0-12°N, 73-60°W)
  const venezuelaQuakes = newQuakes.filter(q => {
    const coords = q.geometry.coordinates;
    const lat = coords[1];
    const lon = coords[0];
    // Venezuela bounds (aprox)
    return lat >= 0 && lat <= 12 && lon >= -73 && lon <= -60;
  });
  
  // Para Venezuela: alertar CUALQUIER sismo (M2.5+)
  const significantQuakes = venezuelaQuakes.filter(q => q.properties.mag >= 2.5);
  
  // Si no hay sismos en Venezuela, usar umbral global M4.5+
  if (significantQuakes.length === 0) {
    const globalQuakes = newQuakes.filter(q => q.properties.mag >= 4.5);
    if (globalQuakes.length === 0) return;
    significantQuakes.push(...globalQuakes);
  }
  
  if (significantQuakes.length === 0) return;
  
  // Ordenar por magnitud descendente
  significantQuakes.sort((a, b) => b.properties.mag - a.properties.mag);
  
  // Procesar TODOS los sismos significativos (no solo el más importante)
  significantQuakes.forEach(quake => {
    processSingleQuakeAlert(quake);
  });
}

// Procesar alerta para un solo sismo
function processSingleQuakeAlert(quake) {
  // Calcular distancia si hay geolocalización
  let distance = null;
  let direction = null;
  let urgency = 'medium';
  let arrivalTime = null;
  let endTime = null;
  
  // Verificar si es en Venezuela
  const coords = quake.geometry.coordinates;
  const lat = coords[1];
  const lon = coords[0];
  const isVenezuela = lat >= 0 && lat <= 12 && lon >= -73 && lon <= -60;
  
  // Verificar si es relevante para Venezuela usando la función mejorada
  const isRelevant = isRelevantToVenezuela(quake);
  
  if (state.userCoords) {
    distance = calculateDistance(
      state.userCoords.lat,
      state.userCoords.lng,
      quake.geometry.coordinates[1],
      quake.geometry.coordinates[0]
    );
    
    direction = bearingToCardinal(
      calculateBearing(
        state.userCoords.lat,
        state.userCoords.lng,
        quake.geometry.coordinates[1],
        quake.geometry.coordinates[0]
      )
    );
    
    // Calcular tiempo de llegada de ondas P (primarias) - ~6 km/s
    const pWaveSpeed = 6; // km/s
    const travelTimeSeconds = distance / pWaveSpeed;
    const quakeTime = quake.properties.time;
    
    // Tiempo de llegada al usuario
    arrivalTime = quakeTime + (travelTimeSeconds * 1000);
    
    // Estimar duración del sismo: magnitud * 10 segundos (aprox)
    const durationSeconds = quake.properties.mag * 10;
    
    // Tiempo cuando el sismo habrá pasado completamente
    endTime = arrivalTime + (durationSeconds * 1000);
    
    // Determinar urgencia basada en distancia y magnitud
    if (isVenezuela) {
      // En Venezuela: urgencia más alta incluso para sismos pequeños
      if (distance < 100 && quake.properties.mag >= 3.0) {
        urgency = 'critical';
      } else if (distance < 300 && quake.properties.mag >= 3.5) {
        urgency = 'high';
      } else if (distance < 500 && quake.properties.mag >= 4.0) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }
    } else {
      // Fuera de Venezuela: umbrales normales
      if (distance < 100 && quake.properties.mag >= 5.0) {
        urgency = 'critical';
      } else if (distance < 300 && quake.properties.mag >= 5.5) {
        urgency = 'high';
      } else if (distance < 500 && quake.properties.mag >= 6.0) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }
    }
  } else {
    // Sin geolocalización, basar solo en magnitud
    if (isVenezuela) {
      // En Venezuela: alertar incluso sismos pequeños
      if (quake.properties.mag >= 4.0) {
        urgency = 'critical';
      } else if (quake.properties.mag >= 3.5) {
        urgency = 'high';
      } else if (quake.properties.mag >= 3.0) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }
    } else {
      // Fuera de Venezuela: umbrales normales
      if (quake.properties.mag >= 6.5) {
        urgency = 'critical';
      } else if (quake.properties.mag >= 6.0) {
        urgency = 'high';
      } else if (quake.properties.mag >= 5.5) {
        urgency = 'medium';
      } else {
        urgency = 'low';
      }
    }
    
    // Sin geolocalización, asumir que ya pasó o está pasando (usar tiempo actual + 5 min)
    arrivalTime = Date.now();
    endTime = Date.now() + 300000; // 5 minutos de alerta
  }
  
  // Emitir alerta según urgencia
  emitQuickAlert(quake, urgency, distance, direction, arrivalTime, endTime, isVenezuela);
  
  // Enviar notificación del sistema para sismos relevantes en Venezuela
  if (isRelevant) {
    const mag = quake.properties.mag.toFixed(1);
    const place = quake.properties.place;
    
    let notificationUrgency = 'normal';
    if (urgency === 'critical' || urgency === 'high') {
      notificationUrgency = 'severe';
    } else if (urgency === 'medium') {
      notificationUrgency = 'moderate';
    }
    
    const title = isVenezuela ? `🚨 SISMO EN VENEZUELA - M${mag}` : `⚠️ SISMO DETECTADO - M${mag}`;
    const body = `${place}. Magnitud ${mag}. ${isVenezuela ? '¡Requiere atención!' : 'Ver detalles.'}`;
    
    // Mostrar notificación del sistema (cuando app está abierta)
    showSeismicNotification(title, body, notificationUrgency, {
      id: quake.id,
      coordinates: quake.geometry.coordinates,
      magnitude: mag,
      place: place
    });
    
    // Enviar notificación push (para cuando app está en background)
    sendPushNotification(title, body, notificationUrgency, {
      id: quake.id,
      coordinates: quake.geometry.coordinates,
      magnitude: mag,
      place: place
    });
    
    // Activar wake lock para alertas severas en Venezuela (mantener pantalla activa)
    if (isVenezuela && (urgency === 'critical' || urgency === 'high')) {
      requestWakeLock();
    }
  }
}

// Emitir alerta rápida visual y sonora
function emitQuickAlert(quake, urgency, distance, direction, arrivalTime, endTime, isVenezuela = false, forceAlert = false) {
  const now = Date.now();
  
  // Verificar si el sismo ya pasó completamente
  if (endTime && endTime < now) {
    console.log(`[ALERTA] Sismo ya pasó, no emitir alerta: ${quake.properties.place}`);
    return;
  }
  
  // Verificar cooldown (reducir para Venezuela o si es forzado)
  const cooldownTime = isVenezuela || forceAlert ? 1000 : state.alertCooldown; // 1 segundo para Venezuela o simulación
  if (now - state.lastAlertTime < cooldownTime) {
    return;
  }
  
  state.lastAlertTime = now;
  
  // Guardar alerta activa
  state.activeAlerts.set(quake.id, {
    quake,
    urgency,
    distance,
    direction,
    arrivalTime,
    endTime,
    startTime: now,
    bannerElement: null,
    isVenezuela
  });
  
  // Preparar mensaje de alerta
  const mag = quake.properties.mag.toFixed(1);
  const place = quake.properties.place;
  const timeAgo = formatTimeAgo(quake.properties.time);
  
  let alertMessage = `🚨 SISMO DETECTADO\n`;
  alertMessage += `Magnitud: M${mag}\n`;
  alertMessage += `Ubicación: ${place}\n`;
  alertMessage += `Hace: ${timeAgo}`;
  
  if (distance !== null && direction !== null) {
    alertMessage += `\nDistancia: ${distance.toFixed(0)} km ${direction}`;
  }
  
  if (isVenezuela) {
    alertMessage += `\n🇻🇪 VENEZUELA`;
  }
  
  if (forceAlert) {
    alertMessage += `\n🧪 SIMULACIÓN`;
  }
  
  // Determinar nivel de alerta para UI
  let alertLevel = 'moderate';
  if (urgency === 'critical') alertLevel = 'severe';
  else if (urgency === 'high') alertLevel = 'severe';
  else if (urgency === 'medium') alertLevel = 'moderate';
  else alertLevel = 'low';
  
  // Mostrar notificación visual
  const banner = showQuickAlertBanner(quake, urgency, distance, direction, arrivalTime, endTime, isVenezuela, forceAlert);
  
  // Guardar referencia al banner
  const alertData = state.activeAlerts.get(quake.id);
  if (alertData) {
    alertData.bannerElement = banner;
  }
  
  // Emitir sonido de alerta si está habilitado O si es Venezuela O si es forzado (simulación)
  const shouldPlaySound = state.soundEnabled || isVenezuela || forceAlert;
  if (shouldPlaySound) {
    if (alertLevel === 'severe') {
      playSevereAlert(forceAlert);
    } else if (alertLevel === 'moderate') {
      playModerateAlert(forceAlert);
    } else {
      playLowAlert(forceAlert);
    }
    
    // Vibración del dispositivo si está disponible O si es Venezuela O si es forzado
    const shouldVibrate = navigator.vibrate || isVenezuela || forceAlert;
    if (shouldVibrate) {
      if (urgency === 'critical' || isVenezuela || forceAlert) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
      } else if (urgency === 'high') {
        navigator.vibrate([200, 100, 200, 100]);
      } else {
        navigator.vibrate([200]);
      }
    }
  }
  
  // Log para debugging
  console.log(`[ALERTA RÁPIDA] ${urgency.toUpperCase()}${isVenezuela ? ' 🇻🇪 VENEZUELA' : ''}${forceAlert ? ' 🧪 SIMULACIÓN' : ''}: M${mag} - ${place}`, {
    distance,
    direction,
    urgency,
    isVenezuela,
    forceAlert,
    arrivalTime: arrivalTime ? new Date(arrivalTime).toLocaleTimeString() : 'N/A',
    endTime: endTime ? new Date(endTime).toLocaleTimeString() : 'N/A'
  });
}

// Mostrar banner de alerta rápida
function showQuickAlertBanner(quake, urgency, distance, direction, arrivalTime, endTime, isVenezuela = false, forceAlert = false) {
  // Remover banner existente si hay
  const existingBanner = document.querySelector('.quick-alert-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  // Crear banner
  const banner = document.createElement('div');
  banner.className = `quick-alert-banner urgency-${urgency}${isVenezuela ? ' venezuela-alert' : ''}`;
  banner.dataset.quakeId = quake.id;
  
  const mag = quake.properties.mag.toFixed(1);
  const place = quake.properties.place;
  const timeAgo = formatTimeAgo(quake.properties.time);
  
  let urgencyIcon = 'fa-triangle-exclamation';
  let urgencyText = 'ALERTA';
  
  if (forceAlert) {
    urgencyIcon = 'fa-flask';
    urgencyText = '🧪 SIMULACIÓN';
  } else if (isVenezuela) {
    urgencyIcon = 'fa-flag';
    urgencyText = '🇻🇪 VENEZUELA';
  } else if (urgency === 'critical') {
    urgencyIcon = 'fa-circle-exclamation';
    urgencyText = 'ALERTA CRÍTICA';
  } else if (urgency === 'high') {
    urgencyText = 'ALERTA ALTA';
  } else if (urgency === 'medium') {
    urgencyText = 'ALERTA';
  } else {
    urgencyText = 'AVISO';
  }
  
  let distanceText = '';
  if (distance !== null && direction !== null) {
    distanceText = `<div class="alert-distance"><i class="fa-solid fa-location-arrow"></i> ${distance.toFixed(0)} km ${direction}</div>`;
  }
  
  // Calcular tiempo restante
  let timeRemainingText = '';
  if (endTime) {
    const remainingMs = endTime - Date.now();
    if (remainingMs > 0) {
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      timeRemainingText = `<div class="alert-time-remaining" id="alert-time-remaining-${quake.id}">
        <i class="fa-solid fa-hourglass-half"></i> 
        <span class="time-value">${remainingSeconds}s</span> restantes
      </div>`;
    }
  }
  
  banner.innerHTML = `
    <div class="alert-header">
      <i class="fa-solid ${urgencyIcon} animate-flash-fast"></i>
      <span class="alert-title">${urgencyText}</span>
      <button class="alert-close" onclick="dismissAlert('${quake.id}')">&times;</button>
    </div>
    <div class="alert-body">
      <div class="alert-mag">M${mag}</div>
      <div class="alert-place">${place}</div>
      <div class="alert-time"><i class="fa-solid fa-clock"></i> ${timeAgo}</div>
      ${distanceText}
      ${timeRemainingText}
    </div>
  `;
  
  document.body.appendChild(banner);
  
  // Iniciar countdown si hay endTime
  if (endTime) {
    startAlertCountdown(quake.id, endTime);
  }
  
  return banner;
}

// Iniciar countdown para alerta
function startAlertCountdown(quakeId, endTime) {
  const intervalId = setInterval(() => {
    const remainingMs = endTime - Date.now();
    const timeElement = document.getElementById(`alert-time-remaining-${quakeId}`);
    
    if (!timeElement || remainingMs <= 0) {
      clearInterval(intervalId);
      
      // Si el tiempo expiró, dismiss alert
      if (remainingMs <= 0) {
        dismissAlert(quakeId, true);
      }
      return;
    }
    
    // Actualizar display
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const timeValue = timeElement.querySelector('.time-value');
    if (timeValue) {
      timeValue.textContent = `${remainingSeconds}s`;
    }
  }, 1000);
}

// Descartar alerta (manual o automática cuando el sismo pasa)
function dismissAlert(quakeId, autoDismiss = false) {
  const alertData = state.activeAlerts.get(quakeId);
  if (!alertData) return;
  
  // Remover banner visual
  if (alertData.bannerElement && alertData.bannerElement.parentNode) {
    alertData.bannerElement.classList.add('fade-out');
    setTimeout(() => {
      if (alertData.bannerElement && alertData.bannerElement.parentNode) {
        alertData.bannerElement.remove();
      }
    }, 500);
  }
  
  // Remover de alertas activas
  state.activeAlerts.delete(quakeId);
  
  if (autoDismiss) {
    console.log(`[ALERTA] Sismo pasado, alerta descartada automáticamente: ${alertData.quake.properties.place}`);
  } else {
    console.log(`[ALERTA] Alerta descartada manualmente: ${alertData.quake.properties.place}`);
  }
}

// Verificar periódicamente si las alertas han expirado
function checkExpiredAlerts() {
  const now = Date.now();
  
  state.activeAlerts.forEach((alertData, quakeId) => {
    if (alertData.endTime && alertData.endTime < now) {
      dismissAlert(quakeId, true);
    }
  });
}

// Iniciar verificación de alertas expiradas
function startAlertExpirationCheck() {
  // Verificar cada 5 segundos
  setInterval(checkExpiredAlerts, 5000);
}

// --- Modo SOS Atrapado - Emergencia Vital ---

// Activar modo SOS para personas atrapadas bajo escombros
function activateTrappedSOS() {
  if (state.trappedSOSActive) {
    deactivateTrappedSOS();
    return;
  }
  
  state.trappedSOSActive = true;
  
  // 1. Obtener geolocalización precisa de emergencia (funciona offline con GPS)
  getEmergencyLocation();
  
  // 2. Activar sonido de emergencia penetrante (funciona offline)
  playEmergencyBeacon();
  
  // 3. Activar vibración SOS Morse (funciona offline)
  startSOSVibration();
  
  // 4. Mostrar modal de estado
  showTrappedSOSModal();
  
  console.log('[SOS ATRAPADO] Activado - Múltiples señales de emergencia activas (OFFLINE)');
}

// Desactivar modo SOS atrapado
function deactivateTrappedSOS() {
  state.trappedSOSActive = false;
  
  // Detener sonido de emergencia
  stopEmergencyBeacon();
  
  // Detener vibración
  if (state.trappedSOSInterval) {
    clearInterval(state.trappedSOSInterval);
    state.trappedSOSInterval = null;
  }
  
  // Cerrar modal
  closeTrappedSOSModal();
  
  console.log('[SOS ATRAPADO] Desactivado');
}

// Obtener geolocalización de emergencia con alta precisión (funciona offline con GPS)
function getEmergencyLocation() {
  if (!navigator.geolocation) {
    console.error('[SOS] Geolocalización no disponible');
    alert('Geolocalización no disponible en este dispositivo.');
    return;
  }
  
  // Intentar obtener ubicación cacheada primero (offline)
  const cachedLocation = localStorage.getItem('emergencyLocation');
  if (cachedLocation) {
    try {
      const parsed = JSON.parse(cachedLocation);
      // Usar si tiene menos de 1 hora
      if (Date.now() - parsed.timestamp < 3600000) {
        state.trappedCoordinates = parsed;
        console.log('[SOS] Usando ubicación cacheada:', state.trappedCoordinates);
        updateTrappedSOSModal();
        return;
      }
    } catch (e) {
      console.warn('[SOS] Error parseando ubicación cacheada:', e);
    }
  }
  
  // Obtener nueva ubicación con GPS (funciona offline)
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.trappedCoordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        timestamp: Date.now()
      };
      
      console.log('[SOS] Ubicación de emergencia obtenida:', state.trappedCoordinates);
      
      // Guardar en localStorage para persistencia offline
      localStorage.setItem('emergencyLocation', JSON.stringify(state.trappedCoordinates));
      
      // Mostrar coordenadas en modal
      updateTrappedSOSModal();
    },
    (error) => {
      console.error('[SOS] Error obteniendo ubicación:', error);
      // No mostrar alerta que interrumpa, solo log
      console.warn('[SOS] GPS no disponible. Ubicación no será precisa.');
      
      // Actualizar modal para mostrar error
      const locationEl = document.getElementById('trapped-location');
      if (locationEl) {
        locationEl.innerHTML = '<span style="color: #ff6b35;">No disponible (GPS apagado)</span>';
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 30000, // 30 segundos para GPS offline
      maximumAge: 60000 // Aceptar ubicación de hasta 1 minuto
    }
  );
}

// Reproducir sonido de emergencia penetrante para escombros (funciona offline)
function playEmergencyBeacon() {
  // Inicializar audio context si no existe (funciona offline)
  if (!state.audioCtx) {
    try {
      initAudioContext();
    } catch (e) {
      console.error('[SOS] Error inicializando audio:', e);
      return;
    }
  }
  
  if (!state.audioCtx) {
    console.error('[SOS] Audio context no disponible');
    return;
  }
  
  // Reanudar audio context si está suspendido (requerido por navegadores)
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(e => {
      console.error('[SOS] Error reanudando audio:', e);
    });
  }
  
  const now = state.audioCtx.currentTime;
  
  // Crear oscilador de alta frecuencia penetrante (4000 Hz)
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  const filter = state.audioCtx.createBiquadFilter();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(4000, now);
  
  // Filtro pasa-banda para claridad
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(4000, now);
  filter.Q.setValueAtTime(10, now);
  
  // Envelope penetrante
  gain.gain.setValueAtTime(0, now);
  
  // Patrón SOS: ... --- ...
  const dotDuration = 0.15;
  const dashDuration = 0.45;
  const gapDuration = 0.15;
  const letterGap = 0.3;
  
  let time = now;
  
  // S (...)
  for (let i = 0; i < 3; i++) {
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dotDuration);
    time += dotDuration + gapDuration;
  }
  
  time += letterGap;
  
  // O (---)
  for (let i = 0; i < 3; i++) {
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dashDuration);
    time += dashDuration + gapDuration;
  }
  
  time += letterGap;
  
  // S (...)
  for (let i = 0; i < 3; i++) {
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dotDuration);
    time += dotDuration + gapDuration;
  }
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(state.audioCtx.destination);
  
  osc.start(now);
  osc.stop(time + 1);
  
  // Limpiar nodos después de reproducir
  setTimeout(() => {
    try {
      osc.disconnect();
      gain.disconnect();
      filter.disconnect();
    } catch (e) {
      // Ignorar errores al desconectar
    }
  }, (time + 1.5) * 1000);
  
  // Repetir cada 3 segundos
  if (!state.emergencySoundInterval) {
    state.emergencySoundInterval = setInterval(() => {
      if (state.trappedSOSActive) {
        playEmergencyBeacon();
      }
    }, 3000);
  }
}

function stopEmergencyBeacon() {
  if (state.emergencySoundInterval) {
    clearInterval(state.emergencySoundInterval);
    state.emergencySoundInterval = null;
  }
}

// Vibración SOS patrón Morse (funciona offline)
function startSOSVibration() {
  if (!navigator.vibrate) {
    console.warn('[SOS] Vibración no disponible en este dispositivo');
    // Actualizar modal para indicar no disponible
    const vibrationStatus = document.querySelector('.sos-status-item:nth-child(3) .status-active');
    if (vibrationStatus) {
      vibrationStatus.textContent = 'No disponible';
      vibrationStatus.style.color = '#ff6b35';
    }
    return;
  }
  
  // Patrón SOS: ... --- ... (corto=200ms, largo=500ms)
  const sosPattern = [
    200, 200, 200, 200, 200, 200,  // S (...)
    500, 200, 500, 200, 500, 200,  // O (---)
    200, 200, 200, 200, 200, 200   // S (...)
  ];
  
  // Repetir cada 2 segundos
  if (!state.trappedSOSInterval) {
    state.trappedSOSInterval = setInterval(() => {
      if (state.trappedSOSActive) {
        try {
          navigator.vibrate(sosPattern);
        } catch (e) {
          console.error('[SOS] Error en vibración:', e);
        }
      }
    }, 2000);
  }
  
  // Primera vibración inmediata
  try {
    navigator.vibrate(sosPattern);
  } catch (e) {
    console.error('[SOS] Error en vibración inicial:', e);
  }
}

// Mostrar modal de estado SOS atrapado
function showTrappedSOSModal() {
  const modal = document.createElement('div');
  modal.className = 'trapped-sos-modal';
  modal.id = 'trapped-sos-modal';
  
  modal.innerHTML = `
    <div class="trapped-sos-content">
      <div class="trapped-sos-header">
        <i class="fa-solid fa-skull-crossbones animate-flash-fast"></i>
        <h2>🆘 SOS ATRAPADO ACTIVO</h2>
      </div>
      <div class="trapped-sos-body">
        <div class="sos-status-item">
          <i class="fa-solid fa-location-dot"></i>
          <div>
            <strong>Ubicación:</strong>
            <span id="trapped-location">Obteniendo...</span>
          </div>
        </div>
        <div class="sos-status-item">
          <i class="fa-solid fa-volume-high"></i>
          <div>
            <strong>Audio:</strong>
            <span class="status-active">Activo</span>
          </div>
        </div>
        <div class="sos-status-item">
          <i class="fa-solid fa-mobile-screen"></i>
          <div>
            <strong>Vibración:</strong>
            <span class="status-active">Activa (SOS)</span>
          </div>
        </div>
        <div class="sos-status-item">
          <i class="fa-solid fa-lightbulb"></i>
          <div>
            <strong>Strobe:</strong>
            <span class="status-active">Activo</span>
          </div>
        </div>
      </div>
      <div class="trapped-sos-footer">
        <button class="btn-stop-sos" id="btn-stop-trapped-sos">
          <i class="fa-solid fa-stop"></i> DETENER SOS
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listener para detener
  document.getElementById('btn-stop-trapped-sos').addEventListener('click', deactivateTrappedSOS);
  
  // Actualizar ubicación si está disponible
  if (state.trappedCoordinates) {
    updateTrappedSOSModal();
  }
}

function closeTrappedSOSModal() {
  const modal = document.getElementById('trapped-sos-modal');
  if (modal) {
    modal.remove();
  }
}

function updateTrappedSOSModal() {
  const locationEl = document.getElementById('trapped-location');
  if (locationEl && state.trappedCoordinates) {
    const coords = state.trappedCoordinates;
    locationEl.innerHTML = `
      ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}<br>
      <small>Precisión: ±${coords.accuracy.toFixed(0)}m</small>
    `;
  }
}

function initConnectionMonitoring() {
  // Event listener para cambios de conexión
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Estado inicial
  updateConnectionStatus();
}

function handleOnline() {
  state.isOnline = true;
  console.log('Conexión restaurada');
  updateConnectionStatus();
  
  // Reanudar actualización de datos
  fetchSeismicData();
  
  // Mostrar notificación de reconexión
  showConnectionNotification('Conexión restaurada', 'success');
}

function handleOffline() {
  state.isOnline = false;
  console.log('Conexión perdida - Modo offline activado');
  updateConnectionStatus();
  
  // Cargar datos cacheados de IndexedDB
  loadCachedQuakes();
  
  // Mostrar notificación de modo offline
  showConnectionNotification('Modo offline activado - Usando datos cacheados', 'warning');
}

function updateConnectionStatus() {
  const statusDot = document.querySelector('.system-status .status-dot');
  const statusText = document.querySelector('.system-status .status-text');
  
  if (state.isOnline) {
    statusDot.classList.remove('offline');
    statusText.textContent = 'Conexión Online';
  } else {
    statusDot.classList.add('offline');
    statusText.textContent = 'Modo Offline';
  }
}

function showConnectionNotification(message, type) {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `connection-notification ${type}`;
  notification.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-wifi' : 'fa-wifi-slash'}"></i>
    <span>${message}</span>
  `;
  
  // Agregar al DOM
  document.body.appendChild(notification);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// --- Sistema de Notificaciones del Sistema para Alertas Sísmicas ---
function showSeismicNotification(title, body, urgency = 'normal', quakeData = null) {
  // Verificar permisos de notificación
  if (!('Notification' in window)) {
    console.warn('[NOTIFICACIONES] Notification API no disponible');
    return false;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('[NOTIFICACIONES] Permisos no concedidos - No se puede mostrar notificación');
    return false;
  }
  
  // Configurar vibración según urgencia
  let vibratePattern = [200, 100, 200];
  if (urgency === 'severe') {
    vibratePattern = [500, 200, 500, 200, 500]; // Vibración más intensa
  } else if (urgency === 'moderate') {
    vibratePattern = [300, 150, 300];
  }
  
  // Configurar opciones de notificación
  const options = {
    body: body,
    icon: '/favicon.ico',
    badge: '/badge.png',
    vibrate: vibratePattern,
    tag: quakeData ? `quake-${quakeData.id}` : 'seismic-alert',
    requireInteraction: urgency === 'severe', // Requiere interacción para alertas severas
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
  
  try {
    const notification = new Notification(title, options);
    
    // Manejar clic en notificación
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      
      // Si hay datos del sismo, centrar en el mapa
      if (quakeData && quakeData.coordinates) {
        const [lon, lat] = quakeData.coordinates;
        if (map) {
          map.setView([lat, lon], 10);
        }
      }
    };
    
    console.log('[NOTIFICACIONES] Notificación mostrada:', title);
    return true;
  } catch (error) {
    console.error('[NOTIFICACIONES] Error mostrando notificación:', error);
    return false;
  }
}

// --- Enviar notificación push desde service worker (para background) ---
async function sendPushNotification(title, body, urgency, quakeData) {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PUSH] Service Worker no disponible');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn('[PUSH] No hay registro de service worker');
      return false;
    }
    
    // Enviar mensaje al service worker para mostrar notificación
    registration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: title,
      body: body,
      urgency: urgency,
      quakeData: quakeData
    });
    
    console.log('[PUSH] Mensaje enviado al service worker');
    return true;
  } catch (error) {
    console.error('[PUSH] Error enviando notificación push:', error);
    return false;
  }
}

// Verificar si un sismo es relevante para Venezuela
function isRelevantToVenezuela(quake) {
  // Coordenadas aproximadas de Venezuela
  const venezuelaBounds = {
    north: 12.2,
    south: 0.5,
    west: -73.5,
    east: -60.0
  };
  
  const [lon, lat] = quake.geometry.coordinates;
  
  // Verificar si está dentro de los límites de Venezuela
  const inBounds = lat >= venezuelaBounds.south && 
                   lat <= venezuelaBounds.north && 
                   lon >= venezuelaBounds.west && 
                   lon <= venezuelaBounds.east;
  
  // También considerar sismos cercanos (dentro de 500km)
  const distance = calculateDistance(
    state.userLocation?.lat || 6.5, // Centro aproximado de Venezuela
    state.userLocation?.lon || -66.5,
    lat,
    lon
  );
  
  const isNearby = distance < 500; // 500km
  
  // Sismos significativos en la región (magnitud >= 5.0)
  const isSignificant = quake.properties.mag >= 5.0;
  
  // Considerar relevante si está en Venezuela, cerca, o es significativo
  return inBounds || isNearby || isSignificant;
}

// Calcular distancia entre dos coordenadas (fórmula Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Cargar sismos cacheados de IndexedDB cuando offline
async function loadCachedQuakes() {
  if (!state.db) return;
  
  try {
    const transaction = state.db.transaction(['quakes'], 'readonly');
    const store = transaction.objectStore('quakes');
    const index = store.index('time');
    
    // Obtener los 50 sismos más recientes
    const request = index.openCursor(null, 'prev');
    const cachedQuakes = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && cachedQuakes.length < 50) {
        cachedQuakes.push(cursor.value);
        cursor.continue();
      } else {
        // Convertir al formato esperado por la app
        state.earthquakes = cachedQuakes.map(q => ({
          id: q.id,
          geometry: {
            type: 'Point',
            coordinates: q.coordinates
          },
          properties: {
            mag: q.mag,
            place: q.place,
            time: q.time,
            depth: q.depth
          }
        }));
        
        applyFilters();
        console.log(`Cargados ${cachedQuakes.length} sismos desde cache`);
      }
    };
    
    request.onerror = (event) => {
      console.error('Error cargando sismos cacheados:', event.target.error);
    };
  } catch (error) {
    console.error('Error cargando datos cacheados:', error);
  }
}

// Guardar sismo en historial
async function saveQuakeToHistory(quake) {
  if (!state.db) return;
  
  try {
    const transaction = state.db.transaction(['quakes'], 'readwrite');
    const store = transaction.objectStore('quakes');
    
    const quakeRecord = {
      id: quake.id,
      mag: quake.properties.mag,
      place: quake.properties.place,
      time: quake.properties.time,
      depth: quake.properties.depth || 10,
      coordinates: quake.geometry.coordinates,
      savedAt: Date.now()
    };
    
    const request = store.put(quakeRecord);
    
    request.onsuccess = () => {
      console.log('Sismo guardado en historial:', quake.id);
    };
    
    request.onerror = (event) => {
      console.error('Error guardando sismo:', event.target.error);
    };
  } catch (error) {
    console.error('Error en transacción IndexedDB:', error);
  }
}

// Guardar múltiples sismos en lote
async function saveQuakesBatch(quakes) {
  if (!state.db || !quakes || quakes.length === 0) return;
  
  try {
    const transaction = state.db.transaction(['quakes'], 'readwrite');
    const store = transaction.objectStore('quakes');
    
    quakes.forEach(quake => {
      const quakeRecord = {
        id: quake.id,
        mag: quake.properties.mag,
        place: quake.properties.place,
        time: quake.properties.time,
        depth: quake.properties.depth || 10,
        coordinates: quake.geometry.coordinates,
        savedAt: Date.now()
      };
      store.put(quakeRecord);
    });
    
    transaction.oncomplete = () => {
      console.log(`Lote de ${quakes.length} sismos guardado`);
    };
    
    transaction.onerror = (event) => {
      console.error('Error guardando lote:', event.target.error);
    };
  } catch (error) {
    console.error('Error en transacción por lote:', error);
  }
}

// Cargar historial de sismos (últimos 7 días)
async function loadQuakeHistory() {
  if (!state.db) return;
  
  try {
    const transaction = state.db.transaction(['quakes'], 'readonly');
    const store = transaction.objectStore('quakes');
    const index = store.index('time');
    
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const range = IDBKeyRange.lowerBound(sevenDaysAgo);
    
    const request = index.openCursor(range, ' prev');
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        console.log('Sismo en historial:', cursor.value);
        cursor.continue();
      }
    };
    
    request.onerror = (event) => {
      console.error('Error cargando historial:', event.target.error);
    };
  } catch (error) {
    console.error('Error cargando historial:', error);
  }
}

// Guardar configuración de usuario
async function saveUserSetting(key, value) {
  if (!state.db) return;
  
  try {
    const transaction = state.db.transaction(['userSettings'], 'readwrite');
    const store = transaction.objectStore('userSettings');
    
    const setting = {
      key: key,
      value: value,
      updated: Date.now()
    };
    
    store.put(setting);
  } catch (error) {
    console.error('Error guardando configuración:', error);
  }
}

// Obtener configuración de usuario
async function getUserSetting(key) {
  if (!state.db) return null;
  
  try {
    const transaction = state.db.transaction(['userSettings'], 'readonly');
    const store = transaction.objectStore('userSettings');
    
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        resolve(event.target.result ? event.target.result.value : null);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return null;
  }
}

// Limpiar sismos antiguos (más de 30 días)
async function cleanupOldQuakes() {
  if (!state.db) return;
  
  try {
    const transaction = state.db.transaction(['quakes'], 'readwrite');
    const store = transaction.objectStore('quakes');
    const index = store.index('time');
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const range = IDBKeyRange.upperBound(thirtyDaysAgo);
    
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    transaction.oncomplete = () => {
      console.log('Limpieza de sismos antiguos completada');
    };
  } catch (error) {
    console.error('Error en limpieza:', error);
  }
}

// Formato de tiempo relativo
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `hace ${interval} año${interval > 1 ? 's' : ''}`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `hace ${interval} me${interval > 1 ? 'ses' : 's'}`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `hace ${interval} día${interval > 1 ? 's' : ''}`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `hace ${interval} hora${interval > 1 ? 's' : ''}`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `hace ${interval} min`;
  
  return 'hace unos segundos';
}

// Actualizar indicador de última actualización
function updateLastUpdateDisplay() {
  const el = document.getElementById('last-update-text');
  if (!el) return;
  
  if (!state.lastUpdateTime) {
    el.textContent = 'Actualizado: --';
    return;
  }
  
  const seconds = Math.floor((Date.now() - state.lastUpdateTime) / 1000);
  
  if (seconds < 60) {
    el.textContent = `Actualizado: hace ${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    el.textContent = `Actualizado: hace ${mins} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    el.textContent = `Actualizado: hace ${hours}h`;
  }
}
