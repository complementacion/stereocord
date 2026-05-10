/**
 * StereoCord — Preload Script
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const os   = require('os');

// LOG DE DIAGNÓSTICO
try {
  fs.writeFileSync(os.homedir() + '\\sc-preload-log.txt', 'preload ejecutado: ' + new Date().toISOString());
} catch(e) {}

// ── Ejecutar preload original de Discord si existe ────────────────────────────
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

window.__STEREOCORD__ = {
  version: '1.0.0',
  path: STEREOCORD_PATH,
};

function loadRenderer() {
  setTimeout(() => {
    try {
      require(RENDERER_PATH);
      fs.appendFileSync(os.homedir() + '\\sc-preload-log.txt', '\nrenderer cargado OK');
      console.log('[StereoCord] Renderer cargado ✓');
    } catch (e) {
      fs.appendFileSync(os.homedir() + '\\sc-preload-log.txt', '\nERROR renderer: ' + e.message);
      console.error('[StereoCord] Error cargando renderer:', e);
    }
  }, 500);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', loadRenderer);
} else {
  loadRenderer();
}
