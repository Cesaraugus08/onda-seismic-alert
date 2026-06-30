# Instrucciones de Despliegue PWA - ONDA

## Opción 1: Netlify (Recomendado - Gratis y Fácil)

### Paso 1: Preparar Iconos
1. Abre `generate-icons.html` en tu navegador
2. Haz clic en "Generar Iconos"
3. Descarga todos los iconos y guárdalos en `c:\ONDA\`
4. Necesitas: icon-72.png, icon-96.png, icon-128.png, icon-144.png, icon-152.png, icon-192.png, icon-384.png, icon-512.png, favicon-32.png

### Paso 2: Preparar Splash Screens
1. Abre `generate-splash.html` en tu navegador
2. Haz clic en "Generar Splash Screens"
3. Descarga los splash screens y guárdalos en `c:\ONDA\`
4. Necesitas: splash-android.png, splash-ios-6.5.png, splash-ios-5.5.png, splash-ios-ipad.png

### Paso 3: Crear Cuenta en Netlify
1. Ve a https://www.netlify.com/
2. Regístrate con tu cuenta de GitHub
3. Es gratis para proyectos personales

### Paso 4: Subir a GitHub
1. Crea un repositorio en GitHub llamado "onda-seismic-alert"
2. Sube todos los archivos de `c:\ONDA\` al repositorio
3. Asegúrate de incluir: index.html, style.css, script.js, manifest.json, firebase-messaging-sw.js, sw.js, y todos los iconos

### Paso 5: Desplegar en Netlify
1. En Netlify, haz clic en "Add new site" → "Import from Git"
2. Selecciona tu repositorio de GitHub
3. Configura:
   - Build command: (dejar vacío)
   - Publish directory: (dejar vacío - raíz del repositorio)
4. Haz clic en "Deploy site"

### Paso 6: Configurar Dominio Personalizado (Opcional)
1. En Netlify, ve a "Domain settings"
2. Puedes usar un dominio gratuito: `tu-nombre.netlify.app`
3. O conectar tu propio dominio

### Paso 7: Probar PWA
1. Abre tu sitio en Chrome en Android
2. Deberías ver un banner "Agregar a pantalla de inicio"
3. O ve al menú de Chrome → "Agregar a pantalla de inicio"
4. En iOS Safari, ve a "Compartir" → "Agregar a inicio"

---

## Opción 2: Vercel (Alternativa Gratis)

### Paso 1-2: Igual que Netlify (preparar iconos y splash screens)

### Paso 3: Crear Cuenta en Vercel
1. Ve a https://vercel.com/
2. Regístrate con tu cuenta de GitHub

### Paso 4: Subir a GitHub (igual que Netlify)

### Paso 5: Desplegar en Vercel
1. En Vercel, haz clic en "Add New Project"
2. Selecciona tu repositorio de GitHub
3. Configura:
   - Framework Preset: Other
   - Build Command: (dejar vacío)
   - Output Directory: (dejar vacío)
4. Haz clic en "Deploy"

---

## Opción 3: GitHub Pages (Gratis)

### Paso 1-2: Igual que Netlify (preparar iconos y splash screens)

### Paso 3: Subir a GitHub (igual que Netlify)

### Paso 4: Activar GitHub Pages
1. Ve a tu repositorio en GitHub
2. Haz clic en "Settings" → "Pages"
3. En "Source", selecciona "main branch"
4. Haz clic en "Save"

### Paso 5: Esperar despliegue
1. GitHub Pages desplegará automáticamente
2. Tu sitio estará en: `https://tu-usuario.github.io/onda-seismic-alert/`

---

## Opción 4: Firebase Hosting (Gratis con Firebase)

### Paso 1: Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

### Paso 2: Login en Firebase
```bash
firebase login
```

### Paso 3: Inicializar Firebase Hosting
```bash
cd c:\ONDA
firebase init
```
Selecciona:
- Hosting
- Usa proyecto existente o crea uno nuevo
- Public directory: `.` (directorio actual)
- Configure as single-page app: Yes
- Set up automatic builds: No

### Paso 4: Desplegar
```bash
firebase deploy
```

---

## Verificar PWA

### Lighthouse Audit
1. Abre tu sitio en Chrome
2. Presiona F12 para abrir DevTools
3. Ve a "Lighthouse" tab
4. Selecciona "Progressive Web App"
5. Haz clic en "Analyze page load"
6. Deberías obtener puntaje alto en PWA

### Verificar Service Worker
1. Abre DevTools → Application tab
2. Ve a "Service Workers"
3. Deberías ver el service worker activo y running

### Verificar Manifest
1. Abre DevTools → Application tab
2. Ve a "Manifest"
3. Verifica que todos los campos estén correctos

---

## Configurar Firebase para Notificaciones Push

### Paso 1: Crear Proyecto Firebase
1. Ve a https://console.firebase.google.com/
2. Crea proyecto "ONDA"
3. En Project Settings → General, agrega app web
4. Copia las credenciales

### Paso 2: Completar Credenciales
En `script.js` (líneas 12-18):
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

En `script.js` (línea 163):
```javascript
vapidKey: "TU_VAPID_KEY"
```

En `firebase-messaging-sw.js` (líneas 14-20):
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

### Paso 3: Backend para Notificaciones
Necesitas un servidor que:
- Monitoree USGS API cada minuto
- Detecte sismos en Venezuela
- Envíe notificaciones push vía Firebase

---

## Troubleshooting

### Service Worker no se instala
- Verifica que el archivo `firebase-messaging-sw.js` esté en la raíz
- Verifica HTTPS (obligatorio para PWA)
- Limpia cache y recarga

### Iconos no aparecen
- Verifica que todos los tamaños estén presentes
- Verifica rutas en manifest.json
- Limpia cache del navegador

### Notificaciones no funcionan
- Verifica permisos de notificación
- Verifica configuración de Firebase
- Verifica que service worker esté activo

---

## Checklist de Despliegue PWA

- [ ] Generar todos los iconos PNG
- [ ] Generar splash screens
- [ ] Subir archivos a GitHub
- [ ] Desplegar en Netlify/Vercel/GitHub Pages
- [ ] Verificar HTTPS funciona
- [ ] Probar instalación en Android Chrome
- [ ] Probar instalación en iOS Safari
- [ ] Verificar service worker funciona
- [ ] Verificar manifest.json es válido
- [ ] Configurar Firebase (opcional)
- [ ] Probar notificaciones push (opcional)
