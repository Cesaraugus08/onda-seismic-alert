/**
 * Generador de Splash Screen para ONDA PWA (Versión Browser)
 * Este script genera splash screens para Android e iOS usando Canvas
 * No requiere Node.js - funciona directamente en navegador
 * 
 * Uso:
 * 1. Abre generate-splash.html en navegador
 * 2. Haz clic en "Generar Splash Screens"
 * 3. Descarga los splash screens generados
 */

const splashSizes = [
  { name: 'android', width: 1080, height: 1920 },
  { name: 'ios-6.5', width: 1242, height: 2688 },
  { name: 'ios-5.5', width: 1242, height: 2208 },
  { name: 'ios-ipad', width: 2048, height: 2732 }
];

function generateSplash(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Fondo oscuro
  ctx.fillStyle = '#0d1424';
  ctx.fillRect(0, 0, width, height);
  
  // Gradiente radial para efecto de pulso
  const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, height/2);
  gradient.addColorStop(0, 'rgba(0, 255, 102, 0.3)');
  gradient.addColorStop(0.5, 'rgba(0, 168, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(13, 20, 36, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Ondas sísmicas animadas
  ctx.globalAlpha = 0.2;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(width/2, height/2, height * 0.15 * i, 0, Math.PI * 2);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  
  // Logo ONDA
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${height * 0.08}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ONDA', width/2, height * 0.45);
  
  // Subtítulo
  ctx.fillStyle = '#00ff66';
  ctx.font = `${height * 0.03}px Arial, sans-serif`;
  ctx.fillText('ALERTA SÍSMICA', width/2, height * 0.52);
  
  // Texto de carga
  ctx.fillStyle = '#888d99';
  ctx.font = `${height * 0.025}px Arial, sans-serif`;
  ctx.fillText('Cargando...', width/2, height * 0.85);
  
  // Indicador de carga
  const loadingY = height * 0.9;
  const loadingWidth = width * 0.4;
  const loadingX = (width - loadingWidth) / 2;
  
  // Barra de progreso
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(loadingX, loadingY, loadingWidth, height * 0.01);
  
  ctx.fillStyle = '#00ff66';
  ctx.fillRect(loadingX, loadingY, loadingWidth * 0.6, height * 0.01);
  
  return canvas;
}

function generateAllSplashScreens() {
  const container = document.getElementById('splash-container');
  container.innerHTML = '';
  
  splashSizes.forEach(size => {
    const canvas = generateSplash(size.width, size.height);
    const wrapper = document.createElement('div');
    wrapper.className = 'splash-wrapper';
    
    const label = document.createElement('div');
    label.className = 'splash-label';
    label.textContent = `${size.name} (${size.width}x${size.height})`;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Descargar';
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `splash-${size.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    wrapper.appendChild(canvas);
    wrapper.appendChild(label);
    wrapper.appendChild(downloadBtn);
    container.appendChild(wrapper);
  });
}
