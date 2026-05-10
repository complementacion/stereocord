/**
 * StereoCord — Webpack Module Finder
 * Encuentra y expone los módulos internos empaquetados por Webpack en Discord.
 */

'use strict';

const Webpack = {
  _cache: null,
  _req:   null,

 waitForReady() {
    return new Promise(resolve => {
      let attempts = 0;
      const MAX = 50; // 5 segundos máximo
      const check = () => {
        const req = this._getWebpackRequire();
        if (req) {
          this._req   = req;
          this._cache = req.c;
          resolve();
        } else if (attempts++ >= MAX) {
          console.warn('[StereoCord/Webpack] webpackChunkdiscord_app no encontrado, continuando sin webpack');
          resolve(); // Continuar igual para que SettingsPanel cargue
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  /** Obtener la función require interna de Webpack */
  _getWebpackRequire() {
    const chunks = window.webpackChunkdiscord_app;
    if (!chunks) return null;

    let req = null;
    // ✅ FIX: Symbol() no es válido como chunk ID — usamos string
    const probeId = 'sc_probe_' + Date.now();
    try {
      chunks.push([
        [probeId],
        {},
        _req => { req = _req; }
      ]);
      // Limpiar el chunk que acabamos de empujar
      const idx = chunks.findIndex(c => Array.isArray(c[0]) && c[0].includes(probeId));
      if (idx !== -1) chunks.splice(idx, 1);
    } catch (e) {
      console.warn('[StereoCord/Webpack] Error al obtener require:', e.message);
    }
    return req;
  },

  /**
   * Buscar un módulo por filtro
   * @param {Function} filter
   * @returns {any}
   */
  getModule(filter) {
    if (!this._cache) return undefined;
    for (const id in this._cache) {
      const mod = this._cache[id];
      if (!mod?.exports) continue;
      const exp = mod.exports;
      if (filter(exp)) return exp;
      if (exp?.default && filter(exp.default)) return exp.default;
    }
  },

  /**
   * Buscar múltiples módulos
   * @param {Function} filter
   * @returns {any[]}
   */
  getModules(filter) {
    if (!this._cache) return [];
    const results = [];
    for (const id in this._cache) {
      const mod = this._cache[id];
      if (!mod?.exports) continue;
      const exp = mod.exports;
      if (filter(exp)) results.push(exp);
      else if (exp?.default && filter(exp.default)) results.push(exp.default);
    }
    return results;
  },

  /**
   * Buscar módulo por propiedades
   * @param {...string} props
   */
  getByProps(...props) {
    return this.getModule(m => props.every(p => m[p] !== undefined));
  },

  /**
   * Buscar componente React por displayName
   * @param {string} name
   */
  getByDisplayName(name) {
    return this.getModule(m => m?.displayName === name || m?.default?.displayName === name);
  },

  /**
   * Parchear una función en un módulo
   * Retorna una función para deshacer el parche
   * @param {object} module
   * @param {string} method
   * @param {Function} patch - (originalFn, ...args) => result
   * @returns {Function} unpatch
   */
  patch(module, method, patch) {
    const original = module[method];
    if (typeof original !== 'function') {
      console.warn(`[StereoCord/Webpack] ${method} no es una función`);
      return () => {};
    }
    module[method] = function (...args) {
      return patch.call(this, original.bind(this), ...args);
    };
    module[method].__scOriginal = original;
    return () => { module[method] = original; };
  },
};

module.exports = Webpack;
