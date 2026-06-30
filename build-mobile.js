/**
 * Script de Build Completo para ONDA Móvil
 * Este script guía todo el proceso de conversión a app móvil
 * 
 * Uso:
 * 1. Abre build-mobile.html en navegador
 * 2. Sigue los pasos en orden
 * 3. El script verificará cada paso
 */

const buildSteps = [
  {
    id: 'icons',
    name: 'Generar Iconos',
    description: 'Generar todos los iconos PNG necesarios para PWA y app nativa',
    check: () => {
      const requiredIcons = ['icon-72.png', 'icon-96.png', 'icon-128.png', 'icon-144.png', 'icon-152.png', 'icon-192.png', 'icon-384.png', 'icon-512.png', 'favicon-32.png'];
      return requiredIcons.every(icon => document.getElementById(`check-${icon}`)?.checked);
    },
    action: () => {
      window.open('generate-icons.html', '_blank');
    }
  },
  {
    id: 'splash',
    name: 'Generar Splash Screens',
    description: 'Generar splash screens para Android e iOS',
    check: () => {
      const requiredSplashes = ['splash-android.png', 'splash-ios-6.5.png', 'splash-ios-5.5.png', 'splash-ios-ipad.png'];
      return requiredSplashes.every(splash => document.getElementById(`check-${splash}`)?.checked);
    },
    action: () => {
      window.open('generate-splash.html', '_blank');
    }
  },
  {
    id: 'manifest',
    name: 'Verificar manifest.json',
    description: 'Verificar que manifest.json esté configurado correctamente',
    check: () => {
      return document.getElementById('check-manifest')?.checked;
    },
    action: () => {
      alert('Verifica que manifest.json tenga:\n- Todos los iconos configurados\n- display: standalone\n- orientation: portrait-primary\n- gcm_sender_id configurado');
    }
  },
  {
    id: 'firebase',
    name: 'Configurar Firebase',
    description: 'Completar credenciales de Firebase en script.js y firebase-messaging-sw.js',
    check: () => {
      return document.getElementById('check-firebase')?.checked;
    },
    action: () => {
      alert('Para configurar Firebase:\n1. Ve a https://console.firebase.google.com/\n2. Crea proyecto "ONDA"\n3. Agrega app web\n4. Copia credenciales a script.js y firebase-messaging-sw.js\n5. Obtén VAPID key de Cloud Messaging');
    }
  },
  {
    id: 'pwa',
    name: 'Desplegar PWA',
    description: 'Desplegar la PWA en Netlify, Vercel o GitHub Pages',
    check: () => {
      return document.getElementById('check-pwa')?.checked;
    },
    action: () => {
      window.open('INSTRUCCIONES-DESPLIEGUE-PWA.md', '_blank');
    }
  },
  {
    id: 'capacitor',
    name: 'Configurar Capacitor (Opcional)',
    description: 'Instalar Capacitor para app nativa Android/iOS',
    check: () => {
      return document.getElementById('check-capacitor')?.checked;
    },
    action: () => {
      alert('Para app nativa con Capacitor:\n1. npm install\n2. npx cap init ONDA com.ondaseismic.app\n3. npx cap add android\n4. npx cap add ios\n5. npx cap sync\n6. npx cap open android/ios');
    }
  },
  {
    id: 'test',
    name: 'Probar en Dispositivos',
    description: 'Probar la app en dispositivos Android e iOS reales',
    check: () => {
      return document.getElementById('check-test')?.checked;
    },
    action: () => {
      alert('Pruebas necesarias:\n1. Instalar PWA en Android Chrome\n2. Instalar PWA en iOS Safari\n3. Verificar service worker funciona\n4. Verificar notificaciones funcionan\n5. Verificar geolocalización funciona\n6. Verificar modo SOS funciona');
    }
  }
];

function renderSteps() {
  const container = document.getElementById('steps-container');
  container.innerHTML = '';
  
  buildSteps.forEach((step, index) => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-card';
    stepDiv.innerHTML = `
      <div class="step-header">
        <span class="step-number">${index + 1}</span>
        <h3>${step.name}</h3>
        <input type="checkbox" id="check-${step.id}" class="step-checkbox" onchange="updateProgress()">
      </div>
      <p class="step-description">${step.description}</p>
      <button class="step-action-btn" onclick="executeStep(${index})">🚀 Ejecutar</button>
    `;
    container.appendChild(stepDiv);
  });
}

function executeStep(index) {
  const step = buildSteps[index];
  step.action();
}

function updateProgress() {
  const total = buildSteps.length;
  const completed = buildSteps.filter(step => step.check()).length;
  const percentage = Math.round((completed / total) * 100);
  
  document.getElementById('progress-bar').style.width = `${percentage}%`;
  document.getElementById('progress-text').textContent = `${completed}/${total} pasos completados (${percentage}%)`;
  
  if (percentage === 100) {
    document.getElementById('completion-message').style.display = 'block';
  }
}

function generateReport() {
  const completed = buildSteps.filter(step => step.check());
  const pending = buildSteps.filter(step => !step.check());
  
  let report = '# Reporte de Build - ONDA Móvil\n\n';
  report += `Fecha: ${new Date().toLocaleString()}\n`;
  report += `Progreso: ${completed.length}/${buildSteps.length} pasos completados\n\n`;
  
  report += '## ✅ Pasos Completados:\n';
  completed.forEach(step => {
    report += `- ${step.name}\n`;
  });
  
  report += '\n## ⏳ Pasos Pendientes:\n';
  pending.forEach(step => {
    report += `- ${step.name}\n`;
  });
  
  report += '\n## 📋 Instrucciones Adicionales:\n';
  report += '- Revisa GUIA-CONVERSION-MOVIL.md para más detalles\n';
  report += '- Revisa INSTRUCCIONES-DESPLIEGUE-PWA.md para despliegue\n';
  report += '- Configura Firebase para notificaciones push al 100%\n';
  
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte-build-onda.md';
  a.click();
}
