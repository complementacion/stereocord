/**
 * StereoCord Uninstaller
 * Elimina la carpeta "app" inyectada, restaurando Discord a su estado original.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function findInjectedApps() {
  const results = [];
  const platform = os.platform();

  const searchPaths = {
    win32: [
      path.join(os.homedir(), 'AppData', 'Local', 'Discord'),
      path.join(os.homedir(), 'AppData', 'Local', 'DiscordCanary'),
      path.join(os.homedir(), 'AppData', 'Local', 'DiscordPTB'),
    ],
    linux: ['/usr/share/discord', '/usr/lib/discord', '/opt/discord'],
    darwin: ['/Applications/Discord.app/Contents/Resources']
  };

  const paths = searchPaths[platform] || [];

  for (const basePath of paths) {
    if (!fs.existsSync(basePath)) continue;

    if (platform === 'darwin') {
      const appDir = path.join(basePath, 'app');
      if (fs.existsSync(appDir)) results.push(appDir);
    } else {
      try {
        const entries = fs.readdirSync(basePath);
        for (const entry of entries) {
          if (!entry.startsWith('app-')) continue;
          const appDir = path.join(basePath, entry, 'resources', 'app');
          if (fs.existsSync(appDir)) results.push(appDir);
        }
      } catch (e) { /* skip */ }
    }
  }
  return results;
}

console.log('\n╔══════════════════════════════════════╗');
console.log('║      StereoCord  Uninstaller  v1.0   ║');
console.log('╚══════════════════════════════════════╝\n');

const apps = findInjectedApps();

if (apps.length === 0) {
  console.log('ℹ  No se encontró StereoCord instalado.');
  process.exit(0);
}

for (const appDir of apps) {
  try {
    fs.rmSync(appDir, { recursive: true, force: true });
    console.log(`✓  Eliminado: ${appDir}`);
  } catch (e) {
    console.error(`✗  Error eliminando ${appDir}: ${e.message}`);
  }
}

console.log('\n✅  StereoCord desinstalado. Reinicia Discord.\n');
