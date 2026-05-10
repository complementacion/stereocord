# 🎧 StereoCord

Cliente modificado de Discord con soporte nativo de **plugins** y **temas**, inspirado en BetterDiscord y Lightcord.

[![Build](https://github.com/complementacion/stereocord/actions/workflows/build.yml/badge.svg)](https://github.com/complementacion/stereocord/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## ✨ Características

- 🔌 **Sistema de plugins** — carga archivos `.plugin.js` con hot-reload
- 🎨 **Sistema de temas** — carga archivos `.theme.css`
- 🖊 **CSS personalizado** — edita CSS en tiempo real desde el panel
- 🧩 **API de Webpack** — accede a los módulos internos de Discord
- 📦 **Sin dependencias extra** — se instala directamente en tu Discord existente

---

## 📥 Instalación rápida

### Opción 1 — Descargar el EXE (recomendado)

1. Ve a [Releases](https://github.com/complementacion/stereocord/releases)
2. Descarga `StereoCord-installer-win.exe` (o Linux/Mac)
3. Cierra Discord completamente
4. Ejecuta el instalador **como administrador**
5. Abre Discord — verás el ícono 🎧 en Ajustes

### Opción 2 — Desde código fuente

```bash
git clone https://github.com/complementacion/stereocord.git
cd stereocord
npm install
node install.js
```

---

## 🔌 Instalar plugins

Coloca archivos `.plugin.js` en la carpeta `data/plugins/`.

Formato mínimo de plugin:

```js
class MiPlugin {
  static meta = {
    name:        'MiPlugin',
    description: 'Descripción del plugin',
    version:     '1.0.0',
    author:      'TuNombre',
  };

  start() {
    console.log('Plugin iniciado!');
  }

  stop() {
    console.log('Plugin detenido!');
  }
}

module.exports = MiPlugin;
```

### API disponible para plugins (vía `window.StereoCord`)

```js
// Inyectar CSS
StereoCord.DOM.injectCSS('mi-css', '.clase { color: red }');
StereoCord.DOM.removeCSS('mi-css');

// Mostrar notificación
StereoCord.showToast('Mensaje', 'success'); // 'info' | 'success' | 'error' | 'warning'

// Acceder a módulos de Discord (Webpack)
const MessageActions = StereoCord.Webpack.getByProps('sendMessage', 'editMessage');
```

---

## 🎨 Instalar temas

Coloca archivos `.theme.css` en la carpeta `data/themes/`.

Formato del tema:

```css
/**
 * @name        Mi Tema
 * @description Tema oscuro personalizado
 * @version     1.0.0
 * @author      TuNombre
 */

:root {
  --background-primary: #111;
  --background-secondary: #0a0a0a;
}
```

---

## 🗑 Desinstalar

```bash
node uninstall.js
```

O desde npm:

```bash
npm run uninstall-sc
```

---

## 🔨 Compilar el EXE

```bash
npm install
npm run build:win    # Windows .exe
npm run build:linux  # Linux binario
npm run build:mac    # macOS binario
npm run build:all    # Los tres
```

El CI de GitHub Actions también genera los instaladores automáticamente en cada release.

---

## ⚠️ Aviso legal

El uso de clientes modificados de Discord puede violar sus [Términos de Servicio](https://discord.com/terms).  
StereoCord se distribuye únicamente con fines educativos. Úsalo bajo tu propio riesgo.

---

## 📄 Licencia

MIT © [complementacion](https://github.com/complementacion)
