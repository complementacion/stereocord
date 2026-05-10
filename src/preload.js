/**
 * StereoCord — Preload Script
 * Se ejecuta en el proceso renderer de Discord antes que cualquier script de página.
 * Configura el puente entre el proceso principal y el renderer, y carga StereoCord.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ── Ejecutar preload original de Discord si existe ────────────────────────────
// ✅ FIX: nombre del argumento actualizado a --sc-original-preload (igual que el patcher)
const args = process.argv;
const originalPreloadArg = args.find(a => a.startsWith('--sc-original-preload='));
if (originalPreloadArg) {
  const originalPreload = originalPreloadArg.split('=').slice(1).join('=');
  try {
    if (fs.existsSync(originalPreload)) {
      require(originalPreload);
    }
  } catch (e) {
    console.error('[StereoCord] Error cargando preload original:', e);
  }
}

// ── Inyectar StereoCord al DOM cuando esté listo ──────────────────────────────
const STEREOCORD_PATH = path.join(__dirname, '..');
const RENDERER_PATH   = path.join(STEREOCORD_PATH, 'src', 'renderer.js');

// Exponer utilidades básicas ANTES de que cargue la página
// (contextIsolation=false hace que window sea compartido entre preload y página)
window.__STEREOCORD__ = {
  version: '1.0.0',
  path: STEREOCORD_PATH,
};

function loadRenderer() {
  setTimeout(() => {
    try {
      require(RENDERER_PATH);
      console.log('[StereoCord] Renderer cargado ✓');
    } catch (e) {
      console.error('[StereoCord] Error cargando renderer:', e);
    }
  }, 500); // Delay para que React de Discord monte sus componentes
}

// ✅ FIX: Race condition — si readyState ya es 'complete' o 'interactive',
//         DOMContentLoaded ya disparó y nunca disparará de nuevo. Checar primero.
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', loadRenderer);
} else {
  loadRenderer();
}
