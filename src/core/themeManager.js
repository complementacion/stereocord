/**
 * StereoCord — Theme Manager
 * Gestiona temas CSS. Los temas son archivos .theme.css en data/themes/
 *
 * Formato de metadatos (en comentario al inicio del archivo):
 * /**
 *  * @name        Mi Tema
 *  * @description Descripción corta
 *  * @version     1.0.0
 *  * @author      TuNombre
 *  * /
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ThemeManager = {
  _themes:   new Map(),  // name → { meta, css, enabled }
  _themesDir: null,
  _settingsPath: null,
  _settings: {},

  async init(scPath) {
    this._themesDir   = path.join(scPath, 'data', 'themes');
    this._settingsPath = path.join(scPath, 'data', 'themes.settings.json');

    fs.mkdirSync(this._themesDir, { recursive: true });
    this._loadSettings();
    this._loadAll();
    console.log(`[StereoCord/Themes] ${this._themes.size} tema(s) cargados`);
  },

  _loadSettings() {
    try {
      if (fs.existsSync(this._settingsPath))
        this._settings = JSON.parse(fs.readFileSync(this._settingsPath, 'utf8'));
    } catch (e) { this._settings = {}; }
  },

  _saveSettings() {
    try { fs.writeFileSync(this._settingsPath, JSON.stringify(this._settings, null, 2)); }
    catch (e) { /* ignore */ }
  },

  _loadAll() {
    let files;
    try { files = fs.readdirSync(this._themesDir); }
    catch (e) { return; }

    for (const file of files) {
      if (!file.endsWith('.theme.css')) continue;
      try { this._loadTheme(path.join(this._themesDir, file)); }
      catch (e) { console.error(`[StereoCord/Themes] Error cargando ${file}:`, e); }
    }
  },

  _loadTheme(filePath) {
    const css  = fs.readFileSync(filePath, 'utf8');
    const meta = this._parseMeta(css, filePath);
    const name = meta.name;

    // Si ya existía, limpiar el CSS anterior
    if (this._themes.get(name)?.enabled) this._injectCSS(name, null);

    this._themes.set(name, { meta, css, enabled: false, filePath });

    const shouldEnable = this._settings[name]?.enabled ?? false;
    if (shouldEnable) this.enable(name);
  },

  _parseMeta(css, filePath) {
    const block = css.match(/\/\*\*?([\s\S]*?)\*\//)?.[1] || '';
    const get = key => block.match(new RegExp(`@${key}\\s+(.+)`))?.[1]?.trim();
    return {
      name:        get('name')        || path.basename(filePath, '.theme.css'),
      description: get('description') || 'Sin descripción',
      version:     get('version')     || '1.0.0',
      author:      get('author')      || 'Desconocido',
    };
  },

  _injectCSS(name, css) {
    const id = `sc-theme-${name.replace(/\s+/g, '-')}`;
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    if (css) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = css;
      document.head.appendChild(style);
    }
  },

  enable(name) {
    const entry = this._themes.get(name);
    if (!entry || entry.enabled) return;
    this._injectCSS(name, entry.css);
    entry.enabled = true;
    this._settings[name] = { enabled: true };
    this._saveSettings();
    console.log(`[StereoCord/Themes] ✓ Tema "${name}" aplicado`);
  },

  disable(name) {
    const entry = this._themes.get(name);
    if (!entry || !entry.enabled) return;
    this._injectCSS(name, null);
    entry.enabled = false;
    this._settings[name] = { enabled: false };
    this._saveSettings();
    console.log(`[StereoCord/Themes] ✗ Tema "${name}" desactivado`);
  },

  toggle(name) {
    const entry = this._themes.get(name);
    if (!entry) return;
    if (entry.enabled) this.disable(name); else this.enable(name);
  },

  /** Recargar tema desde disco */
  reload(name) {
    const entry = this._themes.get(name);
    if (!entry) return;
    const wasEnabled = entry.enabled;
    this.disable(name);
    this._themes.delete(name);
    this._loadTheme(entry.filePath);
    if (wasEnabled) this.enable(name);
  },

  getAll() {
    return Array.from(this._themes.entries()).map(([name, e]) => ({
      name,
      ...e.meta,
      enabled: e.enabled,
    }));
  },

  openFolder() {
    require('electron').shell.openPath(this._themesDir);
  },
};

module.exports = ThemeManager;
