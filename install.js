/**
 * StereoCord Installer
 * Cuando corre como .exe (pkg), primero extrae los archivos al sistema de archivos real
 * en %APPDATA%\StereoCord, luego parchea Discord desde ahí.
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Rutas base ────────────────────────────────────────────────────────────────
const IS_PKG = !!process.pkg;

const INSTALL_DIR = IS_PKG
  ? path.join(process.env.APPDATA || os.homedir(), 'StereoCord')
  : __dirname;

const SOURCE_DIR = __dirname;

// ── Extraer archivos del snapshot al sistema de archivos real ─────────────────
function extractFiles() {
  if (!IS_PKG) return;

  console.log(`📂  Extrayendo archivos a: ${INSTALL_DIR}\n`);

  const files = [
    'src/app/index.js',
    'src/app/package.json',
    'src/preload.js',
    'src/renderer.js',
    'src/core/pluginManager.js',
    'src/core/themeManager.js',
    'src/core/webpack.js',
    'src/ui/settingsPanel.js',
    'src/ui/styles.css',
  ];

  for (const file of files) {
    const srcPath  = path.join(SOURCE_DIR, file);
    const destPath = path.join(INSTALL_DIR, file);
    try {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, fs.readFileSync(srcPath));
    } catch (e) {
      console.error(`  ✗  Error extrayendo ${file}: ${e.message}`);
    }
  }

  console.log('  ✓  Archivos extraídos\n');
}

// ── Encontrar instalaciones de Discord ────────────────────────────────────────
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
      const asarPath = path.join(basePath, 'app.asar');
      if (fs.existsSync(asarPath)) {
        installations.push({
          resources: basePath,
          name: path.basename(path.dirname(path.dirname(basePath)))
        });
      }
    } else {
      try {
        const entries = fs.readdirSync(basePath);
        for (const entry of entries) {
          if (!entry.startsWith('app-')) continue;
          const versionPath = path.join(basePath, entry, 'resources');
          const asarPath    = path.join(versionPath, 'app.asar');
          if (fs.existsSync(asarPath)) {
            installations.push({
              resources: versionPath,
              name: `${path.basename(basePath)} ${entry}`
            });
          }
        }
      } catch (e) { /* skip */ }
    }
  }

  return installations;
}

// ── Instalar en una versión de Discord ────────────────────────────────────────
function install(resourcesPath) {
  const appDir = path.join(resourcesPath, 'app');

  if (fs.existsSync(appDir)) {
    const backup = `${appDir}.sc_backup_${Date.now()}`;
    fs.renameSync(appDir, backup);
    console.log(`  ⚠  Carpeta app existente movida a: ${backup}`);
  }

  fs.mkdirSync(appDir, { recursive: true });

  fs.copyFileSync(
    path.join(INSTALL_DIR, 'src', 'app', 'index.js'),
    path.join(appDir, 'index.js')
  );
  fs.copyFileSync(
    path.join(INSTALL_DIR, 'src', 'app', 'package.json'),
    path.join(appDir, 'package.json')
  );

  const config = { stereoCorePath: INSTALL_DIR };
  fs.writeFileSync(
    path.join(appDir, 'stereocord.config.json'),
    JSON.stringify(config, null, 2)
  );

  console.log(`  ✓  StereoCord instalado en: ${appDir}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════╗');
console.log('║       StereoCord  Installer  v1.0    ║');
console.log('╚══════════════════════════════════════╝\n');

// 1. Extraer archivos al sistema de archivos real
extractFiles();

// 2. Crear carpetas de datos
for (const dir of [
  path.join(INSTALL_DIR, 'data'),
  path.join(INSTALL_DIR, 'data', 'plugins'),
  path.join(INSTALL_DIR, 'data', 'themes'),
]) {
  fs.mkdirSync(dir, { recursive: true });
}

// 3. Encontrar Discord
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

// 4. Instalar en cada versión encontrada
for (const inst of installations) {
  console.log(`⚙   Instalando en: ${inst.name}...`);
  try {
    install(inst.resources);
  } catch (e) {
    console.error(`  ✗  Error: ${e.message}`);
  }
}

console.log('\n✅  Instalación completada. Reinicia Discord para activar StereoCord.\n');
console.log(`📁  StereoCord instalado en: ${INSTALL_DIR}`);
console.log('    Plugins: ' + path.join(INSTALL_DIR, 'data', 'plugins'));
console.log('    Temas:   ' + path.join(INSTALL_DIR, 'data', 'themes') + '\n');
