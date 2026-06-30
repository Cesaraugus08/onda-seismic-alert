# Instrucciones de Despliegue en Netlify - ONDA

## Método 1: Netlify CLI (Más Rápido y Automático)

### Paso 1: Instalar Netlify CLI
Abre PowerShell o CMD en c:\ONDA y ejecuta:
```bash
npm install -g netlify-cli
```

### Paso 2: Iniciar Sesión en Netlify
```bash
netlify login
```
Esto abrirá tu navegador para iniciar sesión en tu cuenta de Netlify.

### Paso 3: Inicializar Sitio
```bash
netlify init
```
Selecciona:
- "Create & configure a new site"
- Elige tu equipo o "Your team"
- Nombre del sitio: "onda-seismic-alert" (o el que prefieras)

### Paso 4: Desplegar
```bash
netlify deploy --prod
```
Esto desplegará tu sitio en producción.

### Paso 5: Obtener URL
Netlify te mostrará la URL de tu sitio, algo como:
`https://onda-seismic-alert.netlify.app`

---

## Método 2: Desde GitHub (Más Fácil para Principiantes)

### Paso 1: Crear Repositorio en GitHub
1. Ve a https://github.com/new
2. Nombre del repositorio: "onda-seismic-alert"
3. Marca "Public" o "Private" (como prefieras)
4. Haz clic en "Create repository"

### Paso 2: Subir Archivos a GitHub
Abre PowerShell o CMD en c:\ONDA y ejecuta:

```bash
git init
git add .
git commit -m "Initial commit - ONDA Seismic Alert App"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/onda-seismic-alert.git
git push -u origin main
```

**Reemplaza TU-USUARIO con tu nombre de usuario de GitHub**

### Paso 3: Conectar con Netlify
1. Ve a https://app.netlify.com/
2. Haz clic en "Add new site" → "Import from Git"
3. Selecciona GitHub
4. Encuentra y selecciona "onda-seismic-alert"
5. Haz clic en "Deploy site"

### Paso 4: Esperar Despliegue
Netlify desplegará automáticamente en 1-2 minutos.

### Paso 5: Obtener URL
Tu sitio estará en: `https://onda-seismic-alert.netlify.app`

---

## Método 3: Drag & Drop (El Más Rápido)

### Paso 1: Comprimir Archivos
1. Selecciona todos los archivos en c:\ONDA
2. Haz clic derecho → "Enviar a" → "Carpeta comprimida (en zip)"
3. Nombra el archivo "onda.zip"

### Paso 2: Subir a Netlify
1. Ve a https://app.netlify.com/
2. Arrastra el archivo "onda.zip" al área que dice "Drag and drop your site output folder here"
3. Espera a que se suba y despliegue

### Paso 3: Cambiar Nombre del Sitio
1. En Netlify, ve a "Site settings"
2. En "Change site name", cambia el nombre a "onda-seismic-alert"

---

## Verificar Despliegue

### 1. Verificar HTTPS
Abre tu sitio en el navegador. Debería cargar con HTTPS (candado verde).

### 2. Verificar PWA
- Abre DevTools (F12)
- Ve a "Application" tab
- Verifica "Manifest" está cargado
- Verifica "Service Workers" está activo

### 3. Probar en Móvil
- **Android:** Abre en Chrome → Menú → "Agregar a pantalla de inicio"
- **iOS:** Abre en Safari → Compartir → "Agregar a inicio"

---

## Archivos Necesarios

Asegúrate de tener estos archivos en c:\ONDA antes de desplegar:

**Archivos Principales:**
- index.html
- style.css
- script.js
- manifest.json
- firebase-messaging-sw.js
- sw.js

**Archivos de Configuración:**
- netlify.toml
- package.json
- capacitor.config.json

**Archivos de Documentación (opcionales):**
- GUIA-CONVERSION-MOVIL.md
- INSTRUCCIONES-DESPLIEGUE-PWA.md
- INSTRUCCIONES-NETLIFY.md

**Iconos (generar con generate-icons.html):**
- icon-72.png
- icon-96.png
- icon-128.png
- icon-144.png
- icon-152.png
- icon-192.png
- icon-384.png
- icon-512.png
- favicon-32.png

**Splash Screens (generar con generate-splash.html):**
- splash-android.png
- splash-ios-6.5.png
- splash-ios-5.5.png
- splash-ios-ipad.png

---

## Troubleshooting

### Error: "git is not recognized"
Instala Git desde https://git-scm.com/downloads

### Error: "npm is not recognized"
Instala Node.js desde https://nodejs.org/

### Service Worker no se instala
- Verifica que firebase-messaging-sw.js esté en la raíz
- Verifica HTTPS está activo
- Limpia cache del navegador

### Iconos no aparecen
- Genera iconos con generate-icons.html
- Verifica que estén en la carpeta correcta
- Limpia cache del navegador

---

## Después del Despliegue

### 1. Configurar Dominio Personalizado (Opcional)
En Netlify → Domain settings → Add custom domain

### 2. Configurar Firebase (Opcional)
Sigue las instrucciones en INSTRUCCIONES-DESPLIEGUE-PWA.md para configurar Firebase Cloud Messaging

### 3. Convertir a App Nativa (Opcional)
Sigue las instrucciones en GUIA-CONVERSION-MOVIL.md para usar Capacitor

---

## Checklist de Despliegue Netlify

- [ ] Instalar Netlify CLI (si usar método 1)
- [ ] Iniciar sesión en Netlify
- [ ] Crear repositorio GitHub (si usar método 2)
- [ ] Subir archivos a GitHub
- [ ] Conectar repositorio con Netlify
- [ ] Esperar despliegue completado
- [ ] Verificar HTTPS funciona
- [ ] Verificar PWA funciona
- [ ] Probar en Android Chrome
- [ ] Probar en iOS Safari
- [ ] Generar iconos (si no lo has hecho)
- [ ] Generar splash screens (si no lo has hecho)
