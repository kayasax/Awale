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
    loader: { '.ts': 'ts', '.tsx': 'tsx' },
    logLevel: 'info',
  external: ['african-bg.jpg'],
    define: {
      'process.env.APP_VERSION': JSON.stringify(appVersion)
    }
  });

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
  fs.writeFileSync(path.join(outDir, 'index.html'), patched, 'utf8');

  // Copy public assets (if present) to dist root
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    const entries = fs.readdirSync(publicDir);
    for (const entry of entries) {
      const src = path.join(publicDir, entry);
      const dest = path.join(outDir, entry);
      const stat = fs.statSync(src);
      if (stat.isFile()) fs.copyFileSync(src, dest);
      // (If needed later: recurse for subdirectories)
    }
  }

  // Copy CSS directly (already referenced in patched index.html)
  const cssPath = path.join(__dirname, 'src', 'style.css');
  if (fs.existsSync(cssPath)) {
    fs.copyFileSync(cssPath, path.join(assetsDir, 'style.css'));
  }

  console.log('Esbuild production bundle complete. Dist at packages/web/dist');
})();
