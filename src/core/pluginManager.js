/**
 * StereoCord — Plugin Manager
 * Gestiona plugins (.plugin.js) desde data/plugins/
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const PluginManager = {
  _plugins:      new Map(),   // name → { meta, instance, enabled, filePath }
  _pluginsDir:   null,
  _settingsPath: null,
  _settings:     {},

  async init(scPath) {
    this._pluginsDir   = path.join(scPath, 'data', 'plugins');
    this._settingsPath = path.join(scPath, 'data', 'plugins.settings.json');

    fs.mkdirSync(this._pluginsDir, { recursive: true });
    this._loadSettings();
    await this._loadAll();

    console.log(`[StereoCord/Plugins] ${this._plugins.size} plugin(s) cargados`);
  },

  _loadSettings() {
    try {
      if (fs.existsSync(this._settingsPath))
        this._settings = JSON.parse(fs.readFileSync(this._settingsPath, 'utf8'));
    } catch (e) { this._settings = {}; }
  },

  _saveSettings() {
    try {
      fs.writeFileSync(this._settingsPath, JSON.stringify(this._settings, null, 2));
    } catch (e) { console.error('[StereoCord/Plugins] Error guardando settings:', e); }
  },

  async _loadAll() {
    let files;
    try { files = fs.readdirSync(this._pluginsDir); }
    catch (e) { return; }

    for (const file of files) {
      if (!file.endsWith('.plugin.js')) continue;
      await this._loadPlugin(path.join(this._pluginsDir, file)).catch(e => {
        console.error(`[StereoCord/Plugins] Error cargando ${file}:`, e);
      });
    }
  },

  async _loadPlugin(filePath) {
    // Borrar caché para hot-reload
    delete require.cache[filePath];

    let PluginClass;
    try {
      PluginClass = require(filePath);
    } catch (e) {
      console.error(`[StereoCord/Plugins] Error requiriendo ${path.basename(filePath)}:`, e);
      return;
    }

    const meta = this._parseMeta(filePath, PluginClass);
    const name = meta.name;

    if (this._plugins.has(name)) {
      await this.disable(name);
      this._plugins.delete(name);
    }

    // ✅ FIX: try/catch en el constructor para que un plugin roto no rompa los demás
    let instance;
    try {
      instance = new PluginClass();
    } catch (e) {
      console.error(`[StereoCord/Plugins] Error instanciando ${name}:`, e);
      return;
    }

    const enabled = this._settings[name]?.enabled ?? true;
    this._plugins.set(name, { meta, instance, enabled: false, filePath });

    if (enabled) await this.enable(name);
  },

  _parseMeta(filePath, PluginClass) {
    const defaults = {
      name:        PluginClass.name || path.basename(filePath, '.plugin.js'),
      description: 'Sin descripción',
      version:     '1.0.0',
      author:      'Desconocido',
    };
    return Object.assign({}, defaults, PluginClass.meta || {});
  },

  async enable(name) {
    const entry = this._plugins.get(name);
    if (!entry || entry.enabled) return;
    try {
      await entry.instance.start?.();
      entry.enabled          = true;
      this._settings[name]   = { enabled: true };
      this._saveSettings();
      console.log(`[StereoCord/Plugins] ✓ ${name} habilitado`);
    } catch (e) {
      console.error(`[StereoCord/Plugins] Error iniciando ${name}:`, e);
    }
  },

  async disable(name) {
    const entry = this._plugins.get(name);
    if (!entry || !entry.enabled) return;
    try {
      await entry.instance.stop?.();
      entry.enabled          = false;
      this._settings[name]   = { enabled: false };
      this._saveSettings();
      console.log(`[StereoCord/Plugins] ✗ ${name} deshabilitado`);
    } catch (e) {
      console.error(`[StereoCord/Plugins] Error deteniendo ${name}:`, e);
    }
  },

  async toggle(name) {
    const entry = this._plugins.get(name);
    if (!entry) return;
    if (entry.enabled) await this.disable(name);
    else               await this.enable(name);
  },

  async reload(name) {
    const entry = this._plugins.get(name);
    if (!entry) return;
    const wasEnabled = entry.enabled;
    await this.disable(name);
    await this._loadPlugin(entry.filePath);
    if (wasEnabled && !this._plugins.get(name)?.enabled) {
      await this.enable(name);
    }
  },

  getAll() {
    return Array.from(this._plugins.entries()).map(([name, e]) => ({
      name,
      ...e.meta,
      enabled: e.enabled,
    }));
  },

  openFolder() {
    require('electron').shell.openPath(this._pluginsDir);
  },
};

module.exports = PluginManager;
