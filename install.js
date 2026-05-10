/**
 * StereoCord Installer
 * Parchea Discord inyectando StereoCord en el proceso de Electron.
 * Funciona creando una carpeta "app" que Electron prioriza sobre app.asar
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const STEREOCORD_DIR = __dirname;

// ── Encontrar instalación de Discord ──────────────────────────────────────────
function findDiscordInstallations() {
  const installations = [];
  const platform = os.platform();

  const searchPaths = {
    win32: [
      path.join(os.homedir(), 'AppData', 'Local', 'Discord'),
      path.join(os.homedir(), 'AppData', 'Local', 'DiscordCanary'),
      path.join(os.homedir(), 'AppData', 'Local', 'DiscordPTB'),
      path.join(os.homedir(), 'AppData', 'Local', 'DiscordDevelopment'),
    ],
    linux: [
      '/usr/share/discord',
      '/usr/lib/discord',
      path.join(os.homedir(), '.local', 'share', 'discord'),
      '/opt/discord',
      '/snap/discord/current/usr/lib/discord',
    ],
    darwin: [
      '/Applications/Discord.app/Contents/Resources',
      '/Applications/Discord Canary.app/Contents/Resources',
      path.join(os.homedir(), 'Applications', 'Discord.app', 'Contents', 'Resources'),
    ]
  };

  const paths = searchPaths[platform] || [];

  for (const basePath of paths) {
    if (!fs.existsSync(basePath)) continue;

    if (platform === 'darwin') {
      // En macOS los recursos ya están en la ruta directa
      const asarPath = path.join(basePath, 'app.asar');
      if (fs.existsSync(asarPath)) {
        installations.push({ resources: basePath, name: path.basename(path.dirname(path.dirname(basePath))) });
      }
    } else {
      // En Windows/Linux hay subcarpetas de versión
      try {
        const entries = fs.readdirSync(basePath);
        for (const entry of entries) {
          if (!entry.startsWith('app-')) continue;
          const versionPath = path.join(basePath, entry, 'resources');
          const asarPath = path.join(versionPath, 'app.asar');
          if (fs.existsSync(asarPath)) {
            installations.push({ resources: versionPath, name: `${path.basename(basePath)} ${entry}` });
          }
        }
      } catch (e) { /* skip */ }
    }
  }

  return installations;
}

// ── Instalar StereoCord ───────────────────────────────────────────────────────
function install(resourcesPath) {
  const appDir = path.join(resourcesPath, 'app');

  // Si ya existe, hacer backup
  if (fs.existsSync(appDir)) {
    const backup = appDir + '.sc_backup_' + Date.now();
    fs.renameSync(appDir, backup);
    console.log(`  ⚠  Carpeta app existente movida a: ${backup}`);
  }

  // Crear estructura de la carpeta app
  fs.mkdirSync(appDir, { recursive: true });

  // Copiar archivos del patcher al app dir
  const patcherSrc = path.join(STEREOCORD_DIR, 'src', 'app', 'index.js');
  const patcherPkgSrc = path.join(STEREOCORD_DIR, 'src', 'app', 'package.json');

  fs.copyFileSync(patcherSrc, path.join(appDir, 'index.js'));
  fs.copyFileSync(patcherPkgSrc, path.join(appDir, 'package.json'));

  // Escribir ruta de StereoCord en un config file dentro del app dir
  const config = { stereoCorePath: STEREOCORD_DIR };
  fs.writeFileSync(path.join(appDir, 'stereocord.config.json'), JSON.stringify(config, null, 2));

  console.log(`  ✓  StereoCord instalado en: ${appDir}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════╗');
console.log('║       StereoCord  Installer  v1.0    ║');
console.log('╚══════════════════════════════════════╝\n');

const installations = findDiscordInstallations();

if (installations.length === 0) {
  console.error('❌  No se encontró ninguna instalación de Discord.');
  console.error('    Asegúrate de que Discord esté instalado y ciérralo antes de instalar.');
  process.exit(1);
}

console.log(`📦  Instalaciones encontradas: ${installations.length}\n`);
installations.forEach((inst, i) => {
  console.log(`  [${i + 1}] ${inst.name}`);
  console.log(`      ${inst.resources}\n`);
});

// Instalar en todos automáticamente (puedes hacer interactivo con readline si quieres)
for (const inst of installations) {
  console.log(`⚙   Instalando en: ${inst.name}...`);
  try {
    install(inst.resources);
  } catch (e) {
    console.error(`  ✗  Error: ${e.message}`);
  }
}

// Crear directorios de datos si no existen
const dataDirs = [
  path.join(STEREOCORD_DIR, 'data'),
  path.join(STEREOCORD_DIR, 'data', 'plugins'),
  path.join(STEREOCORD_DIR, 'data', 'themes'),
];
for (const dir of dataDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁  Creado directorio: ${dir}`);
  }
}

console.log('\n✅  Instalación completada. Reinicia Discord para activar StereoCord.\n');
