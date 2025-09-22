const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'dist');
const assetsDir = path.join(outDir, 'assets');

// Read package version for dynamic injection (strip BOM if present)
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
    .replace(/^\uFEFF/, '')
);
const appVersion = pkg.version || '0.0.0';

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(assetsDir, { recursive: true });

(async () => {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'main.tsx')],
    bundle: true,
    format: 'esm',
    sourcemap: true,
    minify: true,
    target: ['es2020'],
    outfile: path.join(assetsDir, 'app.js'),
    loader: { 
      '.ts': 'ts', 
      '.tsx': 'tsx',
      '.css': 'css'
    },
    logLevel: 'info',
  external: ['african-bg.jpg'],
    define: {
      'process.env.APP_VERSION': JSON.stringify(appVersion)
    }
  });

  // Build service worker (no bundling of app code needed, keep separate)
  const swSrc = path.join(__dirname, 'src', 'sw.ts');
  if (fs.existsSync(swSrc)) {
    await esbuild.build({
      entryPoints: [swSrc],
      bundle: false,
      format: 'esm',
      sourcemap: false,
      minify: true,
      target: ['es2020'],
      outfile: path.join(outDir, 'sw.js'),
      define: { 'self.APP_VERSION': JSON.stringify(appVersion) }
    });
  }

  // Copy & patch index.html
  const indexSrc = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  // Replace entry script and stylesheet with relative paths (no leading slash for GitHub Pages project site)
  let patched = indexSrc
    .replace('/src/main.tsx', 'assets/app.js')
    .replace('/src/style.css', 'assets/style.css');
  // Remove any leading slashes from common asset references if present
  patched = patched.replace(/\/(assets\/[A-Za-z0-9._-]+)/g, '$1');
  patched = patched.replace(/\/african-bg.jpg/g, 'african-bg.jpg');
  patched = patched.replace(/\/favicon.svg/g, 'favicon.svg');
  patched = patched.replace(/\/manifest.webmanifest/g, 'manifest.webmanifest');
  fs.writeFileSync(path.join(outDir, 'index.html'), patched, 'utf8');

  // Copy public assets (if present) to dist root - including subdirectories
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src);
      for (const entry of entries) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stat = fs.statSync(srcPath);
        if (stat.isFile()) {
          fs.copyFileSync(srcPath, destPath);
        } else if (stat.isDirectory()) {
          copyDir(srcPath, destPath);  // Recursively copy subdirectories
        }
      }
    };
    copyDir(publicDir, outDir);
  }

  // Copy CSS directly (already referenced in patched index.html)
  const cssPath = path.join(__dirname, 'src', 'style.css');
  if (fs.existsSync(cssPath)) {
    fs.copyFileSync(cssPath, path.join(assetsDir, 'style.css'));
  }

  // Copy src/assets directory recursively to assets/
  const srcAssetsDir = path.join(__dirname, 'src', 'assets');
  if (fs.existsSync(srcAssetsDir)) {
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src);
      for (const entry of entries) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stat = fs.statSync(srcPath);
        if (stat.isFile()) {
          fs.copyFileSync(srcPath, destPath);
        } else if (stat.isDirectory()) {
          copyDir(srcPath, destPath);
        }
      }
    };
    copyDir(srcAssetsDir, path.join(assetsDir));
  }

  console.log('Esbuild production bundle complete. Dist at packages/web/dist');
})();
