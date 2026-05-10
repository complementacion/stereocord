'use strict';
// Los archivos src son embebidos aquí por el CI antes de compilar con pkg:
// const __EMBEDDED__ = { "src/app/index.js": "<base64>", ... };
 
const fs   = require('fs');
const path = require('path');
const os   = require('os');
 
const IS_PKG    = typeof process.pkg !== 'undefined';
const HAS_EMBED = typeof __EMBEDDED__ !== 'undefined'; // eslint-disable-line no-undef
 
const HEADER = `
╔══════════════════════════════════════╗
║       StereoCord  Installer  v1.0    ║
╚══════════════════════════════════════╝`;
console.log(HEADER);
 
const SC_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'StereoCord');
 
let SRC_BASE;
 
if (IS_PKG && HAS_EMBED) {
  console.log(`\n📂  Extrayendo archivos a: ${SC_DIR}`);
  fs.mkdirSync(path.join(SC_DIR, 'data', 'plugins'), { recursive: true });
  fs.mkdirSync(path.join(SC_DIR, 'data', 'themes'),  { recursive: true });
 
  let errCount = 0;
  const embedded = __EMBEDDED__; // eslint-disable-line no-undef
  for (const [rel, b64] of Object.entries(embedded)) {
    const dest = path.join(SC_DIR, rel);
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
    } catch (e) {
      console.error(`  ✗  Error extrayendo ${rel}: ${e.message}`);
      errCount++;
    }
  }
  console.log(errCount === 0 ? '  ✓  Archivos extraídos correctamente\n' : `  ⚠  ${errCount} archivo(s) con error\n`);
  SRC_BASE = SC_DIR;
 
} else if (!IS_PKG) {
  SRC_BASE = __dirname;
} else {
  console.error('❌  El instalador fue compilado sin los archivos embebidos.');
  process.exit(1);
}
 
const DISCORD_APPS = [
  { name: 'Discord',       base: path.join(os.homedir(), 'AppData', 'Local', 'Discord') },
  { name: 'DiscordCanary', base: path.join(os.homedir(), 'AppData', 'Local', 'DiscordCanary') },
  { name: 'DiscordPTB',    base: path.join(os.homedir(), 'AppData', 'Local', 'DiscordPTB') },
];
 
function findDiscordInstalls() {
  const found = [];
  for (const app of DISCORD_APPS) {
    if (!fs.existsSync(app.base)) continue;
    for (const entry of fs.readdirSync(app.base).filter(e => e.startsWith('app-'))) {
      const resources = path.join(app.base, entry, 'resources');
      if (fs.existsSync(resources)) found.push({ label: `${app.name} ${entry}`, resources });
    }
  }
  return found;
}
 
const installs = findDiscordInstalls();
if (installs.length === 0) {
  console.error('❌  No se encontró ninguna instalación de Discord.');
  process.exit(1);
}
 
console.log(`📦  Instalaciones encontradas: ${installs.length}`);
installs.forEach((inst, i) => {
  console.log(`  [${i + 1}] ${inst.label}`);
  console.log(`      ${inst.resources}`);
});
 
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}
 
let anyError = false;
 
for (const inst of installs) {
  console.log(`\n⚙   Instalando en: ${inst.label}...`);
  const appDest = path.join(inst.resources, 'app');
 
  if (fs.existsSync(appDest)) {
    const backup = `${appDest}.sc_backup_${Date.now()}`;
    try {
      fs.renameSync(appDest, backup);
      console.log(`  ⚠  Backup: ${backup}`);
    } catch (e) {
      console.error(`  ✗  No se pudo hacer backup: ${e.message}`);
      anyError = true;
      continue;
    }
  }
 
  let ok = true;
  try {
    copyDir(path.join(SRC_BASE, 'src', 'app'), appDest);
  } catch (e) {
    console.error(`  ✗  Error copiando app/: ${e.message}`);
    anyError = true;
    continue;
  }
 
  // stereoCorePath = donde viven src/preload.js, src/renderer.js, etc.
  // Cuando corre como .exe: SC_DIR = %AppData%\Roaming\StereoCord
  // Cuando corre como script: carpeta raíz del proyecto
  const stereoCorePath = IS_PKG ? SC_DIR : path.dirname(__dirname);
  try {
    fs.writeFileSync(
      path.join(appDest, 'stereocord.config.json'),
      JSON.stringify({ stereoCorePath }, null, 2)
    );
  } catch (e) {
    console.error(`  ✗  No se pudo crear stereocord.config.json: ${e.message}`);
    ok = false;
    anyError = true;
  }
 
  console.log(ok ? `  ✅  ${inst.label} instalado` : `  ⚠  ${inst.label} instalado con errores`);
}
 
console.log(`\n${anyError ? '⚠' : '✅'}  Instalación completada. Reiniciá Discord para activar StereoCord.`);
if (IS_PKG) {
  console.log(`📁  Archivos en: ${SC_DIR}`);
  console.log(`    Plugins: ${path.join(SC_DIR, 'data', 'plugins')}`);
  console.log(`    Temas:   ${path.join(SC_DIR, 'data', 'themes')}`);
  console.log('\nPresioná Enter para cerrar...');
  require('readline').createInterface({ input: process.stdin }).on('line', () => process.exit(0));
}
