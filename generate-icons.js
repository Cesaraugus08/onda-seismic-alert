/**
 * Generador de Iconos para ONDA PWA (Versión Browser)
 * Este script genera todos los iconos necesarios para la PWA usando Canvas
 * No requiere Node.js - funciona directamente en navegador
 * 
 * Uso:
 * 1. Abre generate-icons.html en navegador
 * 2. Haz clic en "Generar Iconos"
 * 3. Descarga los iconos generados
 */

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

function generateIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Fondo oscuro
  ctx.fillStyle = '#0d1424';
  ctx.fillRect(0, 0, size, size);
  
  // Gradiente radial para efecto de pulso
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(0, 255, 102, 0.8)');
  gradient.addColorStop(0.5, 'rgba(0, 168, 255, 0.5)');
  gradient.addColorStop(1, 'rgba(13, 20, 36, 0)');
  
  // Ondas sísmicas
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Texto ONDA
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.23}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ONDA', size/2, size * 0.55);
  
  // Subtítulo
  ctx.fillStyle = '#888d99';
  ctx.font = `${size * 0.05}px Arial, sans-serif`;
  ctx.fillText('ALERTA SÍSMICA', size/2, size * 0.65);
  
  // Onda sísmica decorativa
  ctx.strokeStyle = '#00ff66';
  ctx.lineWidth = size * 0.015;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.75);
  ctx.quadraticCurveTo(size * 0.4, size * 0.65, size * 0.5, size * 0.75);
  ctx.quadraticCurveTo(size * 0.6, size * 0.85, size * 0.7, size * 0.75);
  ctx.stroke();
  
  return canvas;
}

function generateAllIcons() {
  const container = document.getElementById('icons-container');
  container.innerHTML = '';
  
  iconSizes.forEach(size => {
    const canvas = generateIcon(size);
    const wrapper = document.createElement('div');
    wrapper.className = 'icon-wrapper';
    
    const label = document.createElement('div');
    label.className = 'icon-label';
    label.textContent = `${size}x${size}`;
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.textContent = 'Descargar';
    downloadBtn.onclick = () => {
      const link = document.createElement('a');
      link.download = `icon-${size}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    wrapper.appendChild(canvas);
    wrapper.appendChild(label);
    wrapper.appendChild(downloadBtn);
    container.appendChild(wrapper);
  });
  
  // Generar favicon
  const favicon = generateIcon(32);
  const faviconWrapper = document.createElement('div');
  faviconWrapper.className = 'icon-wrapper';
  
  const faviconLabel = document.createElement('div');
  faviconLabel.className = 'icon-label';
  faviconLabel.textContent = 'favicon-32x32';
  
  const faviconBtn = document.createElement('button');
  faviconBtn.className = 'download-btn';
  faviconBtn.textContent = 'Descargar';
  faviconBtn.onclick = () => {
    const link = document.createElement('a');
    link.download = 'favicon-32.png';
    link.href = favicon.toDataURL('image/png');
    link.click();
  };
  
  faviconWrapper.appendChild(favicon);
  faviconWrapper.appendChild(faviconLabel);
  faviconWrapper.appendChild(faviconBtn);
  container.appendChild(faviconWrapper);
}
