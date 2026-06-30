# Guía de Conversión a App Móvil - ONDA

## Opciones para Convertir a App Móvil

### Opción 1: PWA (Progressive Web App) - La Más Rápida
La app ya está configurada como PWA. Solo necesitas:

#### Pasos para PWA:

1. **Generar Iconos**
   ```bash
   npm install sharp
   node generate-icons.js
   ```
   - Crea un archivo `icon-base.png` (mínimo 512x512)
   - Ejecuta el script para generar todos los tamaños

2. **Habilitar HTTPS**
   - La PWA requiere HTTPS obligatoriamente
   - Usa servicios como Netlify, Vercel, o GitHub Pages

3. **Instalar en Dispositivo**
   - **Android**: Abre en Chrome → Menú → "Agregar a pantalla de inicio"
   - **iOS**: Abre en Safari → Compartir → "Agregar a inicio"

**Ventajas:**
- ✅ No requiere código nativo
- ✅ Actualizaciones automáticas
- ✅ Funciona offline con service worker
- ✅ Instalación directa desde navegador

**Desventajas:**
- ❌ No tiene acceso completo a todas las APIs nativas
- ❌ Service workers se detienen en background (limitación de iOS)

---

### Opción 2: Capacitor (Recomendado para App Nativa)
Capacitor de Ionic convierte tu web app en app nativa.

#### Instalación:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init ONDA com.ondaseismic.app
```

#### Configuración (capacitor.config.json):

```json
{
  "appId": "com.ondaseismic.app",
  "appName": "ONDA",
  "webDir": "./",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#0d1424"
    },
    "LocalNotifications": {
      "smallIcon": "icon-96",
      "iconColor": "#0d1424"
    }
  }
}
```

#### Agregar Plataformas:

```bash
npx cap add android
npx cap add ios
```

#### Compilar:

```bash
npx cap sync
npx cap open android  # Abre Android Studio
npx cap open ios      # Abre Xcode (solo en Mac)
```

#### Permisos Android (android/app/src/main/AndroidManifest.xml):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

#### Permisos iOS (ios/App/App/Info.plist):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>ONDA necesita tu ubicación para calcular distancias a sismos cercanos</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>ONDA necesita tu ubicación para alertas sísmicas en tiempo real</string>
```

**Ventajas:**
- ✅ Acceso completo a APIs nativas
- ✅ Mejor performance
- ✅ Publicación en App Store y Play Store
- ✅ Notificaciones push reales funcionan al 100%

**Desventajas:**
- ❌ Requiere configuración nativa
- ❌ Necesita cuenta de developer ($99/year iOS, $25 una vez Android)

---

### Opción 3: TWA (Trusted Web Activity) - Android Solo
Convierte tu PWA en app Android sin código nativo.

#### Pasos:

1. **Instalar Bubblewrap**
   ```bash
   npm install -g @anthropic/bubblewrap
   ```

2. **Inicializar Proyecto**
   ```bash
   bubblewrap init --manifest="https://tu-dominio.com/manifest.json"
   ```

3. **Generar APK**
   ```bash
   bubblewrap build
   ```

**Ventajas:**
- ✅ Muy fácil de configurar
- ✅ Usa Chrome como motor (mismo que PWA)
- ✅ Actualizaciones automáticas desde web

**Desventajas:**
- ❌ Solo Android
- ❌ No tiene acceso a APIs nativas adicionales

---

## Recomendación para ONDA

**Para máxima funcionalidad:**
1. **Usa Capacitor** para app nativa completa
2. **Configura Firebase Cloud Messaging** para notificaciones push al 100%
3. **Publica en Play Store** (gratis) y App Store ($99/año)

**Para inicio rápido:**
1. **Usa PWA** (ya está configurada)
2. **Genera iconos** con el script
3. **Despliega en Netlify/Vercel** con HTTPS
4. **Instala desde navegador** en dispositivos

---

## Archivos Necesarios para Conversión

### Iconos (generar con generate-icons.js):
- icon-72.png
- icon-96.png
- icon-128.png
- icon-144.png
- icon-152.png
- icon-192.png
- icon-384.png
- icon-512.png
- favicon.ico

### Splash Screen:
- Crea splash.png (1080x1920 para Android, 1125x2436 para iOS)

### Screenshots para Stores:
- Android: 6-8 screenshots (1080x1920)
- iOS: 6.5" y 5.5" screenshots

---

## Configuración de Firebase para Notificaciones Push

### 1. Crear Proyecto Firebase
- Ve a https://console.firebase.google.com/
- Crea proyecto "ONDA"
- Agrega app Android (com.ondaseismic.app)
- Agrega app iOS (com.ondaseismic.app)

### 2. Completar Credenciales
En `script.js` y `firebase-messaging-sw.js`:
```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-app.firebaseapp.com",
  projectId: "tu-project-id",
  storageBucket: "tu-app.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 3. Backend para Notificaciones
Necesitas un servidor que:
- Monitoree USGS API cada minuto
- Detecte sismos en Venezuela
- Envíe notificaciones push vía Firebase

---

## Checklist de Conversión a Móvil

### PWA:
- [ ] Generar todos los iconos
- [ ] Configurar HTTPS
- [ ] Probar en Android Chrome
- [ ] Probar en iOS Safari
- [ ] Verificar service worker funciona offline

### Capacitor:
- [ ] Instalar Capacitor
- [ ] Configurar capacitor.config.json
- [ ] Agregar plataformas Android/iOS
- [ ] Configurar permisos
- [ ] Probar en dispositivo físico
- [ ] Configurar Firebase
- [ ] Compilar APK/IPA
- [ ] Publicar en stores

---

## Soporte

Para ayuda adicional:
- Capacitor Docs: https://capacitorjs.com/docs
- Firebase Docs: https://firebase.google.com/docs
- PWA Builder: https://www.pwabuilder.com/
