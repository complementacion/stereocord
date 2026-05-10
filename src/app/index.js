/**
 * StereoCord — Main Process Patcher
 * Intercepta BrowserWindow para inyectar nuestro preload script.
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const Module = require('module');

// ── Leer config de StereoCord ─────────────────────────────────────────────────
const configPath    = path.join(__dirname, 'stereocord.config.json');
const stereoConfig  = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const STEREOCORD_PATH = stereoConfig.stereoCorePath;
const PRELOAD_PATH    = path.join(STEREOCORD_PATH, 'src', 'preload.js');

// ── Interceptar require('electron') con Module._load ─────────────────────────
// ✅ FIX: cachear patchedElectron para no recrear PatchedBrowserWindow en
//         cada require() de cualquier módulo.
let patchedElectron = null;
const originalLoad  = Module._load.bind(Module);

Module._load = function (request, parent, isMain) {
  const result = originalLoad(request, parent, isMain);
  if (request !== 'electron') return result;

  // Devolver el parche cacheado si ya fue construido
  if (patchedElectron) return patchedElectron;

  const OriginalBW = result.BrowserWindow;

  class PatchedBrowserWindow extends OriginalBW {
    constructor(options = {}) {
      if (!options.webPreferences) options.webPreferences = {};

      // Guardar preload original de Discord como argumento de proceso
      const originalPreload = options.webPreferences.preload;
      if (originalPreload) {
        const existing = options.webPreferences.additionalArguments || [];
        options.webPreferences.additionalArguments = [
          ...existing,
          `--sc-original-preload=${originalPreload}`,
        ];
      }

      // Inyectar nuestro preload
      options.webPreferences.preload         = PRELOAD_PATH;
      options.webPreferences.contextIsolation = false;
      options.webPreferences.nodeIntegration  = false;

      super(options);
    }
  }

  // Copiar propiedades estáticas
  Object.assign(PatchedBrowserWindow, OriginalBW);

  // Proxy de electron con BrowserWindow reemplazado
  patchedElectron = new Proxy(result, {
    get(target, prop) {
      if (prop === 'BrowserWindow') return PatchedBrowserWindow;
      const val = target[prop];
      return typeof val === 'function' ? val.bind(target) : val;
    },
  });

  return patchedElectron;
};

// ── Cargar el app.asar original de Discord ────────────────────────────────────
const asarPath = path.join(__dirname, '..', 'app.asar');

function loadDiscord(mainPath) {
  try {
    require(mainPath);
    console.log('[StereoCord] ✓ Discord cargado con StereoCord activo');
  } catch (e) {
    console.error('[StereoCord] Error cargando Discord:', e.message);
    console.error(e.stack);
  }
}

if (fs.existsSync(asarPath)) {
  const pkgRaw  = fs.readFileSync(path.join(asarPath, 'package.json'), 'utf8');
  const pkg     = JSON.parse(pkgRaw);
  const mainFile = path.join(asarPath, pkg.main || 'index.js');
  loadDiscord(mainFile);
} else {
  // ✅ FIX: intentar cargar desde .unpacked si existe, solo quit si no hay nada
  const unpackedPath = asarPath + '.unpacked';
  if (fs.existsSync(unpackedPath)) {
    const pkgRaw   = fs.readFileSync(path.join(unpackedPath, 'package.json'), 'utf8');
    const pkg      = JSON.parse(pkgRaw);
    const mainFile = path.join(unpackedPath, pkg.main || 'index.js');
    loadDiscord(mainFile);
  } else {
    console.error('[StereoCord] No se encontró app.asar ni app.asar.unpacked de Discord en:', asarPath);
    require('electron').app.quit();
  }
}
