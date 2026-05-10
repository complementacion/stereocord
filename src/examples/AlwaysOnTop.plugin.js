/**
 * @name        AlwaysOnTop
 * @description Mantiene la ventana de Discord siempre visible sobre otras aplicaciones.
 * @version     1.0.0
 * @author      StereoCord
 */

const { ipcRenderer } = require('electron');

class AlwaysOnTop {
  static meta = {
    name:        'AlwaysOnTop',
    description: 'Mantiene Discord siempre encima de otras ventanas.',
    version:     '1.0.0',
    author:      'StereoCord',
  };

  constructor() {
    this._enabled = false;
  }

  start() {
    this._enabled = true;
    ipcRenderer.invoke('sc-always-on-top', true).catch(() => {
      // Fallback: usando título de ventana
      document.title = '[📌] ' + document.title;
    });
    console.log('[AlwaysOnTop] Activado');
  }

  stop() {
    this._enabled = false;
    ipcRenderer.invoke('sc-always-on-top', false).catch(() => {
      document.title = document.title.replace('[📌] ', '');
    });
    console.log('[AlwaysOnTop] Desactivado');
  }
}

module.exports = AlwaysOnTop;
