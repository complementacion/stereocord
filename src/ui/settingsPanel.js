/**
 * StereoCord — Panel de Configuración
 * Inyecta un botón y panel en la barra lateral de configuración de Discord.
 * Usa MutationObserver + múltiples selectores para compatibilidad con Discord moderno.
 */
'use strict';
 
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}
 
// Selectores posibles para el sidebar de settings en distintas versiones de Discord
const SIDEBAR_SELECTORS = [
  '[class*="sidebar"]',
  '[class*="sidebarRegion"]',
  '[class*="side-bar"]',
  '[class*="settingsSidebar"]',
  'nav[class*="side"]',
];
 
// Selectores que indican que estamos en la pantalla de settings (no en el chat)
const CONTENT_REGION_SELECTORS = [
  '[class*="contentRegion"]',
  '[class*="content-region"]',
  '[class*="settingsWindow"]',
  '[class*="StandardSidebarView"]',
  '[class*="sidebarAndContent"]',
];
 
function isInSettings() {
  return CONTENT_REGION_SELECTORS.some(s => document.querySelector(s));
}
 
function findSidebar() {
  for (const s of SIDEBAR_SELECTORS) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}
 
const SettingsPanel = {
  _sc:        null,
  _panel:     null,
  _activeTab: 'plugins',
  _observer:  null,
  _interval:  null,
 
  init(sc) {
    this._sc = sc;
    this._startObserver();
  },
 
  _startObserver() {
    // Intervalo de polling — más confiable que esperar eventos específicos
    this._interval = setInterval(() => {
      if (isInSettings() && !document.getElementById('sc-sidebar-btn')) {
        this._addButtonToSidebar();
      }
    }, 800);
 
    // MutationObserver como respaldo
    this._observer = new MutationObserver(() => {
      if (isInSettings() && !document.getElementById('sc-sidebar-btn')) {
        setTimeout(() => this._addButtonToSidebar(), 300);
      }
    });
 
    this._observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
 
  _addButtonToSidebar() {
    if (document.getElementById('sc-sidebar-btn')) return;
    const sidebar = findSidebar();
    if (!sidebar) return;
 
    const sep = el('div', 'sc-sidebar-separator', 'STEREOCORD');
    sep.id = 'sc-separator';
 
    const btn = document.createElement('div');
    btn.id        = 'sc-sidebar-btn';
    btn.className = 'sc-sidebar-btn';
    btn.title     = 'Abrir configuración de StereoCord';
 
    const icon = el('span', 'sc-sidebar-icon', '🎧');
    btn.appendChild(icon);
    btn.appendChild(document.createTextNode(' StereoCord'));
    btn.addEventListener('click', () => this.openPanel());
 
    sidebar.appendChild(sep);
    sidebar.appendChild(btn);
  },
 
  openPanel() {
    if (this._panel && document.contains(this._panel)) {
      this._panel.remove();
      return;
    }
    this._panel = this._buildPanel();
    document.body.appendChild(this._panel);
    this._renderTab(this._activeTab);
  },
 
  _buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'sc-panel';
    panel.className = 'sc-panel';
 
    panel.innerHTML = `
      <div class="sc-panel-header">
        <span class="sc-panel-logo">🎧 StereoCord</span>
        <span class="sc-panel-version">v1.0.0</span>
        <button class="sc-panel-close" id="sc-panel-close">✕</button>
      </div>
      <div class="sc-panel-tabs">
        <button class="sc-tab active" data-tab="plugins">Plugins</button>
        <button class="sc-tab" data-tab="themes">Temas</button>
        <button class="sc-tab" data-tab="custom-css">CSS Personalizado</button>
        <button class="sc-tab" data-tab="about">Acerca de</button>
      </div>
      <div class="sc-panel-content" id="sc-panel-content"></div>
    `;
 
    panel.querySelector('#sc-panel-close').addEventListener('click', () => panel.remove());
    panel.querySelectorAll('.sc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.sc-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._activeTab = tab.dataset.tab;
        this._renderTab(this._activeTab);
      });
    });
 
    this._makeDraggable(panel, panel.querySelector('.sc-panel-header'));
    return panel;
  },
 
  _renderTab(tab) {
    const content = document.getElementById('sc-panel-content');
    if (!content) return;
    content.innerHTML = '';
    const renders = {
      plugins:      () => this._renderPlugins(content),
      themes:       () => this._renderThemes(content),
      'custom-css': () => this._renderCustomCSS(content),
      about:        () => this._renderAbout(content),
    };
    renders[tab]?.();
  },
 
  _renderPlugins(container) {
    const plugins = this._sc.Plugins.getAll();
    const header = el('div', 'sc-section-header');
    header.appendChild(el('span', '', `${plugins.length} plugin(s) instalado(s)`));
    const folderBtn = el('button', 'sc-btn sc-btn-sm', '📁 Abrir carpeta');
    folderBtn.addEventListener('click', () => this._sc.Plugins.openFolder());
    header.appendChild(folderBtn);
    container.appendChild(header);
 
    if (plugins.length === 0) {
      const empty = el('div', 'sc-empty');
      empty.innerHTML = 'No hay plugins instalados.<br><small>Coloca archivos <code>.plugin.js</code> en la carpeta de plugins.</small>';
      container.appendChild(empty);
      return;
    }
    for (const p of plugins) container.appendChild(this._buildPluginCard(p));
  },
 
  _buildPluginCard(p) {
    const card = el('div', 'sc-card');
    const info = el('div', 'sc-card-info');
    info.appendChild(el('span', 'sc-card-name', p.name));
    info.appendChild(el('span', 'sc-card-meta', `v${p.version} por ${p.author}`));
    info.appendChild(el('span', 'sc-card-desc', p.description));
 
    const actions = el('div', 'sc-card-actions');
    const reloadBtn = el('button', 'sc-btn sc-btn-sm sc-btn-reload', '↺');
    reloadBtn.title = 'Recargar';
    reloadBtn.addEventListener('click', async () => {
      await this._sc.Plugins.reload(p.name);
      this._renderTab('plugins');
      this._sc.showToast(`Plugin "${p.name}" recargado`, 'info');
    });
 
    const label = el('label', 'sc-toggle');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = p.enabled;
    checkbox.addEventListener('change', async e => {
      await this._sc.Plugins.toggle(p.name);
      this._sc.showToast(`Plugin "${p.name}" ${e.target.checked ? 'activado' : 'desactivado'}`, e.target.checked ? 'success' : 'info');
    });
    label.appendChild(checkbox);
    label.appendChild(el('span', 'sc-toggle-slider'));
    actions.appendChild(reloadBtn);
    actions.appendChild(label);
    card.appendChild(info);
    card.appendChild(actions);
    return card;
  },
 
  _renderThemes(container) {
    const themes = this._sc.Themes.getAll();
    const header = el('div', 'sc-section-header');
    header.appendChild(el('span', '', `${themes.length} tema(s) instalado(s)`));
    const folderBtn = el('button', 'sc-btn sc-btn-sm', '📁 Abrir carpeta');
    folderBtn.addEventListener('click', () => this._sc.Themes.openFolder());
    header.appendChild(folderBtn);
    container.appendChild(header);
 
    if (themes.length === 0) {
      const empty = el('div', 'sc-empty');
      empty.innerHTML = 'No hay temas instalados.<br><small>Coloca archivos <code>.theme.css</code> en la carpeta de temas.</small>';
      container.appendChild(empty);
      return;
    }
    for (const t of themes) container.appendChild(this._buildThemeCard(t));
  },
 
  _buildThemeCard(t) {
    const card = el('div', 'sc-card');
    const info = el('div', 'sc-card-info');
    info.appendChild(el('span', 'sc-card-name', t.name));
    info.appendChild(el('span', 'sc-card-meta', `v${t.version} por ${t.author}`));
    info.appendChild(el('span', 'sc-card-desc', t.description));
 
    const actions = el('div', 'sc-card-actions');
    const reloadBtn = el('button', 'sc-btn sc-btn-sm sc-btn-reload', '↺');
    reloadBtn.title = 'Recargar';
    reloadBtn.addEventListener('click', () => {
      this._sc.Themes.reload(t.name);
      this._renderTab('themes');
      this._sc.showToast(`Tema "${t.name}" recargado`, 'info');
    });
 
    const label = el('label', 'sc-toggle');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = t.enabled;
    checkbox.addEventListener('change', e => {
      this._sc.Themes.toggle(t.name);
      this._sc.showToast(`Tema "${t.name}" ${e.target.checked ? 'aplicado' : 'desactivado'}`, e.target.checked ? 'success' : 'info');
    });
    label.appendChild(checkbox);
    label.appendChild(el('span', 'sc-toggle-slider'));
    actions.appendChild(reloadBtn);
    actions.appendChild(label);
    card.appendChild(info);
    card.appendChild(actions);
    return card;
  },
 
  _renderCustomCSS(container) {
    const fs   = require('fs');
    const path = require('path');
    const cssFile = path.join(window.__STEREOCORD__.path, 'data', 'custom.css');
    let saved = '';
    try { saved = fs.readFileSync(cssFile, 'utf8'); } catch (e) {}
 
    const header = el('div', 'sc-section-header');
    header.appendChild(el('span', '', 'CSS personalizado aplicado a Discord'));
    const btnWrap = el('div');
    btnWrap.style.cssText = 'display:flex;gap:8px';
    const applyBtn = el('button', 'sc-btn sc-btn-sm', 'Aplicar');
    const clearBtn = el('button', 'sc-btn sc-btn-sm sc-btn-danger', 'Limpiar');
    btnWrap.appendChild(applyBtn);
    btnWrap.appendChild(clearBtn);
    header.appendChild(btnWrap);
    container.appendChild(header);
 
    const textarea = document.createElement('textarea');
    textarea.className   = 'sc-css-editor';
    textarea.placeholder = '/* Tu CSS personalizado aquí */\n:root { --accent: #5865F2; }';
    textarea.value       = saved;
    container.appendChild(textarea);
 
    applyBtn.addEventListener('click', () => {
      const css = textarea.value;
      this._sc.DOM.injectCSS('custom', css);
      try { fs.writeFileSync(cssFile, css); } catch (_) {}
      this._sc.showToast('CSS aplicado', 'success');
    });
 
    clearBtn.addEventListener('click', () => {
      textarea.value = '';
      this._sc.DOM.removeCSS('custom');
      try { fs.writeFileSync(cssFile, ''); } catch (_) {}
      this._sc.showToast('CSS limpiado', 'info');
    });
 
    if (saved) this._sc.DOM.injectCSS('custom', saved);
  },
 
  _renderAbout(container) {
    container.innerHTML = `
      <div class="sc-about">
        <div class="sc-about-logo">🎧</div>
        <h2 class="sc-about-name">StereoCord</h2>
        <p class="sc-about-version">Versión 1.0.0</p>
        <p class="sc-about-desc">
          Cliente modificado de Discord con soporte nativo de plugins y temas.<br>
          Inspirado en BetterDiscord y Lightcord.
        </p>
        <div class="sc-about-links">
          <a class="sc-btn" id="sc-gh-link" href="#">GitHub</a>
        </div>
        <div class="sc-about-warning">
          ⚠ El uso de clientes modificados puede violar los Términos de Servicio de Discord.
        </div>
      </div>
    `;
    container.querySelector('#sc-gh-link').addEventListener('click', e => {
      e.preventDefault();
      require('electron').shell.openExternal('https://github.com/complementacion/stereocord');
    });
  },
 
  _makeDraggable(panel, handle) {
    let ox = 0, oy = 0, dragging = false;
    handle.style.cursor = 'move';
    handle.addEventListener('mousedown', e => {
      dragging = true;
      ox = e.clientX - panel.offsetLeft;
      oy = e.clientY - panel.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      panel.style.left = `${e.clientX - ox}px`;
      panel.style.top  = `${e.clientY - oy}px`;
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  },
};
 
module.exports = SettingsPanel;
