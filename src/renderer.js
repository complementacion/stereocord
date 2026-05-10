/**
 * StereoCord — Renderer Principal
 * Orquesta la carga de plugins, temas y la UI de configuración.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

const SC_PATH = window.__STEREOCORD__?.path || path.join(__dirname, '..');

const PluginManager = require(path.join(SC_PATH, 'src', 'core', 'pluginManager.js'));
const ThemeManager  = require(path.join(SC_PATH, 'src', 'core', 'themeManager.js'));
const SettingsPanel = require(path.join(SC_PATH, 'src', 'ui', 'settingsPanel.js'));
const Webpack       = require(path.join(SC_PATH, 'src', 'core', 'webpack.js'));

const StereoCord = {
  version: '1.0.0',

  Plugins: PluginManager,
  Themes:  ThemeManager,
  Webpack,

  DOM: {
    injectCSS(id, css) {
      const existing = document.getElementById(`sc-style-${id}`);
      if (existing) existing.remove();
      const style = document.createElement('style');
      style.id = `sc-style-${id}`;
      style.textContent = css;
      document.head.appendChild(style);
    },
    removeCSS(id) {
      document.getElementById(`sc-style-${id}`)?.remove();
    },
    onAdded(selector, callback) {
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { obs.disconnect(); callback(el); }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      return obs;
    }
  },

  /** Mostrar toast — ✅ FIX: message va por textContent, no innerHTML */
  showToast(message, type = 'info', duration = 3000) {
    const colors = {
      info:    '#5865F2',
      success: '#57F287',
      error:   '#ED4245',
      warning: '#FEE75C',
    };
    const icons = { info: 'ℹ', success: '✓', error: '✗', warning: '⚠' };

    const toast = document.createElement('div');
    toast.className = 'sc-toast';

    const iconEl = document.createElement('span');
    iconEl.className = 'sc-toast-icon';
    iconEl.textContent = icons[type] || icons.info;

    // ✅ textContent evita XSS si el mensaje viene de un plugin
    const msgEl = document.createElement('span');
    msgEl.className = 'sc-toast-msg';
    msgEl.textContent = message;

    toast.appendChild(iconEl);
    toast.appendChild(msgEl);

    Object.assign(toast.style, {
      position:   'fixed',
      bottom:     '80px',
      right:      '20px',
      zIndex:     '9999',
      background: colors[type] || colors.info,
      color:      '#fff',
      padding:    '10px 16px',
      borderRadius: '8px',
      fontFamily: 'sans-serif',
      fontSize:   '14px',
      display:    'flex',
      alignItems: 'center',
      gap:        '8px',
      boxShadow:  '0 4px 20px rgba(0,0,0,0.4)',
      animation:  'sc-toast-in 0.3s ease',
      maxWidth:   '320px',
    });

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'sc-toast-out 0.3s ease';
      setTimeout(() => toast.remove(), 280);
    }, duration);
  },

  log:  (...args) => console.log  ('%c[StereoCord]', 'color:#5865F2;font-weight:bold', ...args),
  warn: (...args) => console.warn ('%c[StereoCord]', 'color:#FEE75C;font-weight:bold', ...args),
  err:  (...args) => console.error('%c[StereoCord]', 'color:#ED4245;font-weight:bold', ...args),
};

window.StereoCord = StereoCord;

// ── CSS Base ──────────────────────────────────────────────────────────────────
const baseCSS = fs.readFileSync(path.join(SC_PATH, 'src', 'ui', 'styles.css'), 'utf8');
StereoCord.DOM.injectCSS('base', baseCSS);

// ── Inicializar ───────────────────────────────────────────────────────────────
async function init() {
  StereoCord.log('Iniciando StereoCord v' + StereoCord.version);

  await Webpack.waitForReady();
  await PluginManager.init(SC_PATH);
  await ThemeManager.init(SC_PATH);
  SettingsPanel.init(StereoCord);

  StereoCord.log('✓ Listo');
  StereoCord.showToast('StereoCord v1.0.0 activado', 'success');
}

init().catch(e => StereoCord.err('Error de inicialización:', e));
