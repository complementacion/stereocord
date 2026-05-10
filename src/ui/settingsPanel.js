/**
 * StereoCord — Panel de Configuración
 * Inyecta un botón y panel en la barra lateral de configuración de Discord.
 */

'use strict';

// ── Helper: crear elemento con textContent seguro ─────────────────────────────
// ✅ FIX: Todos los datos de plugins/temas se insertan con textContent,
//         nunca con innerHTML — evita XSS si un plugin tiene nombre malicioso.
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

const SettingsPanel = {
  _sc:        null,
  _panel:     null,
  _activeTab: 'plugins',

  init(sc) {
    this._sc = sc;
    this._injectButton();
  },

  _injectButton() {
    const sc = this._sc;

    // ✅ FIX: escuchar solo el sidebar de settings (más específico)
    sc.DOM.onAdded('[class*="sidebar"]', sidebar => {
      // Solo actuar si estamos dentro de la vista de settings
      if (!document.querySelector('[class*="contentRegion"]')) return;
      setTimeout(() => this._addButtonToSidebar(sidebar), 200);
    });

    document.addEventListener('click', e => {
      const gear = e.target.closest('[aria-label="Configuración de usuario"], [aria-label="User Settings"]');
      if (gear) setTimeout(() => this._addButtonToSidebar(), 400);
    });
  },

  _addButtonToSidebar(sidebar) {
    if (document.getElementById('sc-sidebar-btn')) return;
    const target = sidebar || document.querySelector('[class*="sidebar"]');
    if (!target) return;

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

    target.appendChild(sep);
    target.appendChild(btn);
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

    // Header (HTML estático, sin datos de usuario)
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

  // ── Plugins ───────────────────────────────────────────────────────────────────
  _renderPlugins(container) {
    const plugins = this._sc.Plugins.getAll();

    const header = el('div', 'sc-section-header');
    const countEl = el('span', '', `${plugins.length} plugin(s) instalado(s)`);
    const folderBtn = el('button', 'sc-btn sc-btn-sm', '📂 Abrir carpeta');
    folderBtn.addEventListener('click', () => this._sc.Plugins.openFolder());
    header.appendChild(countEl);
    header.appendChild(folderBtn);
    container.appendChild(header);

    if (plugins.length === 0) {
      const empty = el('div', 'sc-empty');
      empty.innerHTML = 'No hay plugins instalados.<br><small>Coloca archivos <code>.plugin.js</code> en la carpeta de plugins.</small>';
      container.appendChild(empty);
      return;
    }

    for (const p of plugins) {
      container.appendChild(this._buildPluginCard(p));
    }
  },

  _buildPluginCard(p) {
    const card = el('div', 'sc-card');

    // Info — ✅ textContent en todos los campos del plugin
    const info = el('div', 'sc-card-info');
    info.appendChild(el('span', 'sc-card-name',  p.name));
    info.appendChild(el('span', 'sc-card-meta',  `v${p.version} por ${p.author}`));
    info.appendChild(el('span', 'sc-card-desc',  p.description));

    // Actions
    const actions = el('div', 'sc-card-actions');

    const reloadBtn = el('button', 'sc-btn sc-btn-sm sc-btn-reload', '↺');
    reloadBtn.title = 'Recargar';
    reloadBtn.addEventListener('click', async () => {
      await this._sc.Plugins.reload(p.name);
      this._renderTab('plugins');
      this._sc.showToast(`Plugin "${p.name}" recargado`, 'info');
    });

    const label = el('label', 'sc-toggle');
    label.title = p.enabled ? 'Desactivar' : 'Activar';
    const checkbox = document.createElement('input');
    checkbox.type    = 'checkbox';
    checkbox.checked = p.enabled;
    checkbox.dataset.plugin = p.name;
    checkbox.addEventListener('change', async e => {
      await this._sc.Plugins.toggle(p.name);
      this._sc.showToast(
        `Plugin "${p.name}" ${e.target.checked ? 'activado' : 'desactivado'}`,
        e.target.checked ? 'success' : 'info'
      );
    });
    label.appendChild(checkbox);
    label.appendChild(el('span', 'sc-toggle-slider'));

    actions.appendChild(reloadBtn);
    actions.appendChild(label);

    card.appendChild(info);
    card.appendChild(actions);
    return card;
  },

  // ── Temas ─────────────────────────────────────────────────────────────────────
  _renderThemes(container) {
    const themes = this._sc.Themes.getAll();

    const header = el('div', 'sc-section-header');
    const countEl = el('span', '', `${themes.length} tema(s) instalado(s)`);
    const folderBtn = el('button', 'sc-btn sc-btn-sm', '📂 Abrir carpeta');
    folderBtn.addEventListener('click', () => this._sc.Themes.openFolder());
    header.appendChild(countEl);
    header.appendChild(folderBtn);
    container.appendChild(header);

    if (themes.length === 0) {
      const empty = el('div', 'sc-empty');
      empty.innerHTML = 'No hay temas instalados.<br><small>Coloca archivos <code>.theme.css</code> en la carpeta de temas.</small>';
      container.appendChild(empty);
      return;
    }

    for (const t of themes) {
      container.appendChild(this._buildThemeCard(t));
    }
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
    checkbox.type    = 'checkbox';
    checkbox.checked = t.enabled;
    checkbox.dataset.theme = t.name;
    checkbox.addEventListener('change', e => {
      this._sc.Themes.toggle(t.name);
      this._sc.showToast(
        `Tema "${t.name}" ${e.target.checked ? 'aplicado' : 'desactivado'}`,
        e.target.checked ? 'success' : 'info'
      );
    });
    label.appendChild(checkbox);
    label.appendChild(el('span', 'sc-toggle-slider'));

    actions.appendChild(reloadBtn);
    actions.appendChild(label);

    card.appendChild(info);
    card.appendChild(actions);
    return card;
  },

  // ── CSS Personalizado ─────────────────────────────────────────────────────────
  _renderCustomCSS(container) {
    const fs   = require('fs');
    const path = require('path');
    const cssFile = path.join(window.__STEREOCORD__.path, 'data', 'custom.css');
    let saved = '';
    try { saved = fs.readFileSync(cssFile, 'utf8'); } catch (e) { /* no existe aún */ }

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
    textarea.id          = 'sc-css-textarea';
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

    // Aplicar CSS guardado al abrir
    if (saved) this._sc.DOM.injectCSS('custom', saved);
  },

  // ── Acerca de ─────────────────────────────────────────────────────────────────
  _renderAbout(container) {
    // Esta sección no contiene datos de usuario → innerHTML estático está OK
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
          Úsalo bajo tu propio riesgo.
        </div>
      </div>
    `;
    container.querySelector('#sc-gh-link').addEventListener('click', e => {
      e.preventDefault();
      require('electron').shell.openExternal('https://github.com/complementacion/stereocord');
    });
  },

  // ── Drag & Drop ───────────────────────────────────────────────────────────────
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
