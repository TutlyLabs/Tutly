#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../..');
const PLAYGROUNDS_DIR = __dirname;
const VSCODE_DIR = path.join(PLAYGROUNDS_DIR, 'vscode');
const VSCODE_ASSETS_DIR = path.join(VSCODE_DIR, 'assets');
const GIT_FS_DIR = path.join(ROOT_DIR, 'packages/fsrelay');
const VSCODE_WEB_DIST = path.join(ROOT_DIR, 'node_modules/vscode-web/dist');

console.log('🚀 Setting up Tutly Playgrounds...\n');

// Clean and create directories
if (fs.existsSync(VSCODE_ASSETS_DIR)) {
  console.log('🧹 Cleaning existing assets directory...');
  fs.rmSync(VSCODE_ASSETS_DIR, { recursive: true, force: true });
}
fs.mkdirSync(VSCODE_ASSETS_DIR, { recursive: true });

// Copy VSCode Web assets
console.log('\n📁 Copying VSCode Web assets...');
if (fs.existsSync(VSCODE_WEB_DIST)) {
  try {
    execSync(`cp -R "${VSCODE_WEB_DIST}"/* "${VSCODE_ASSETS_DIR}"`, { stdio: 'inherit' });
    console.log('✅ Copied vscode-web/dist to vscode/assets');
  } catch (error) {
    console.error('❌ Failed to copy VSCode assets:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ vscode-web not found at:', VSCODE_WEB_DIST);
  process.exit(1);
}

// Build fsrelay extension
console.log('\n🔨 Building fsrelay extension...');
try {
  execSync('pnpm build', { cwd: GIT_FS_DIR, stdio: 'inherit' });
  console.log('✅ fsrelay build complete');
} catch (error) {
  console.error('❌ fsrelay build failed:', error.message);
  process.exit(1);
}

// Copy fsrelay extension
console.log('\n📦 Copying fsrelay extension...');
const extensionsDir = path.join(VSCODE_ASSETS_DIR, 'extensions');
const gitfsDest = path.join(extensionsDir, 'fsrelay');

// Ensure extensions directory exists
if (!fs.existsSync(extensionsDir)) {
  fs.mkdirSync(extensionsDir, { recursive: true });
}

// Helper to recursively copy directories
const copyDir = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

// Copy extension files
const extensionFiles = [
  { src: 'package.json', isFile: true },
  { src: 'package.nls.json', isFile: true },
  { src: 'dist', isFile: false },
  { src: 'themes', isFile: false }
];

if (!fs.existsSync(gitfsDest)) {
  fs.mkdirSync(gitfsDest, { recursive: true });
}

extensionFiles.forEach(({ src, isFile }) => {
  const srcPath = path.join(GIT_FS_DIR, src);
  const destPath = path.join(gitfsDest, src);

  if (fs.existsSync(srcPath)) {
    try {
      if (isFile) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        copyDir(srcPath, destPath);
      }
      console.log(`✅ Copied ${src}`);
    } catch (error) {
      console.error(`❌ Failed to copy ${src}:`, error.message);
    }
  } else {
    console.warn(`⚠️  File/dir not found: ${src}`);
  }
});

// Update extensions.json to include fsrelay
const extensionsJsonPath = path.join(VSCODE_DIR, 'extensions.json');
const extensions = ['fsrelay'];
fs.writeFileSync(extensionsJsonPath, JSON.stringify(extensions, null, 2));
console.log(`\n📄 Updated extensions.json with ${extensions.length} custom extension(s)`);

console.log('\n✅ Tutly Playgrounds setup complete!');
console.log('\n📝 What was copied:');
console.log('   - VSCode Web assets → vscode/assets/');
console.log('   - Built-in extensions → vscode/assets/extensions/');
console.log('   - fsrelay extension → vscode/assets/extensions/fsrelay/');
console.log('\n🎉 Start the playground with:');
console.log('   pnpm start');
console.log('   Then visit: http://localhost:8080/pages/preflight.html\n');
