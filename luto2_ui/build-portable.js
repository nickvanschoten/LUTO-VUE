#!/usr/bin/env node
/**
 * build-portable.js
 * -----------------
 * Assembles a portable, zero-dependency Windows distribution of LUTO-VUE.
 *
 * Output:  ./portable-release/
 *   ├── server.js              (from .next/standalone)
 *   ├── node_modules/          (from .next/standalone)
 *   ├── node.exe               (official Node LTS binary for Windows x64)
 *   ├── public/                (static assets)
 *   ├── .next/static/          (Next.js compiled static files)
 *   └── Start_LUTO_VUE.bat     (double-click launcher for end-users)
 *
 * Usage:  node build-portable.js
 *         npm run build:portable
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// ─── Configuration ────────────────────────────────────────────────────────────
const NODE_VERSION   = 'v20.12.2';          // Pinned LTS – change if needed
const NODE_ARCH      = 'win-x64';
const NODE_FILENAME  = 'node.exe';
const NODE_DOWNLOAD_URL = `https://nodejs.org/dist/${NODE_VERSION}/win-x64/node.exe`;

const ROOT_DIR       = __dirname;            // luto2_ui/
const NEXT_DIR       = path.join(ROOT_DIR, '.next');
const STANDALONE_DIR = path.join(NEXT_DIR, 'standalone');
const STATIC_DIR     = path.join(NEXT_DIR, 'static');
const PUBLIC_DIR     = path.join(ROOT_DIR, 'public');
const RELEASE_DIR    = path.join(ROOT_DIR, 'portable-release');
const PORT           = 3000;
const HOSTNAME       = 'localhost';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ANSI coloured log helpers */
const log  = (msg) => console.log(`\x1b[36m[portable]\x1b[0m ${msg}`);
const ok   = (msg) => console.log(`\x1b[32m[portable]\x1b[0m ✓ ${msg}`);
const err  = (msg) => { console.error(`\x1b[31m[portable]\x1b[0m ✗ ${msg}`); process.exit(1); };

/**
 * Recursively copy a directory.
 * Works cross-platform without shelling out (pure fs).
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    err(`Source directory not found: ${src}`);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Download a URL to a local file path with progress reporting.
 * Follows redirects (Node.js dist server uses a CDN redirect).
 * Returns a Promise that resolves on success, rejects on failure.
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl) => {
      log(`Downloading ${requestUrl}`);
      https.get(requestUrl, (res) => {
        // Handle redirects (3xx)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          log(`Redirecting → ${res.headers.location}`);
          res.resume(); // drain the response
          doRequest(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} while fetching ${requestUrl}`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        let lastReported  = 0;

        const file = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (totalBytes > 0) {
            const pct = Math.floor((receivedBytes / totalBytes) * 100);
            if (pct - lastReported >= 10) {
              log(`  … ${pct}% (${(receivedBytes / 1_048_576).toFixed(1)} MB / ${(totalBytes / 1_048_576).toFixed(1)} MB)`);
              lastReported = pct;
            }
          }
        });
        res.pipe(file);

        file.on('finish', () => {
          file.close(() => resolve());
        });
        file.on('error', (e) => {
          fs.unlink(destPath, () => {}); // clean up partial file
          reject(e);
        });
        res.on('error', (e) => {
          fs.unlink(destPath, () => {});
          reject(e);
        });
      }).on('error', reject);
    };

    doRequest(url);
  });
}

/**
 * Generate the Windows batch launcher script content.
 */
function generateBatContent() {
  return [
    '@echo off',
    'SETLOCAL',
    '',
    'REM ──────────────────────────────────────────────────────────────',
    'REM  LUTO-VUE – Portable Launcher',
    'REM  Double-click this file to start the dashboard.',
    'REM  Open your browser and navigate to: http://localhost:3000',
    'REM ──────────────────────────────────────────────────────────────',
    '',
    `SET PORT=${PORT}`,
    `SET HOSTNAME=${HOSTNAME}`,
    'SET NODE_ENV=production',
    '',
    'echo.',
    'echo  Starting LUTO-VUE dashboard...',
    `echo  Open your browser at: http://${HOSTNAME}:${PORT}`,
    'echo.',
    '',
    'REM Run the Next.js standalone server using the bundled Node binary',
    '.\\node.exe server.js',
    '',
    'REM If we reach here, the server exited (possibly with an error).',
    'echo.',
    'echo  The server has stopped. Press any key to close this window.',
    'pause > nul',
    '',
    'ENDLOCAL',
  ].join('\r\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n\x1b[1m LUTO-VUE Portable Build\x1b[0m\n');

  // ── Step A: Build ────────────────────────────────────────────────────────────
  log('Step A: Running `npm run build`…');
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    ok('Next.js build completed.');
  } catch (e) {
    err('`npm run build` failed. Aborting.');
  }

  // ── Step B: Fresh release directory ─────────────────────────────────────────
  log('Step B: Creating fresh ./portable-release directory…');
  if (fs.existsSync(RELEASE_DIR)) {
    fs.rmSync(RELEASE_DIR, { recursive: true, force: true });
    log('  Removed existing portable-release/');
  }
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  ok('portable-release/ created.');

  // ── Step C: Copy standalone output ──────────────────────────────────────────
  log('Step C: Copying .next/standalone → portable-release/…');
  if (!fs.existsSync(STANDALONE_DIR)) {
    err(
      `.next/standalone not found.\n` +
      `  Make sure next.config.js has: output: 'standalone'`
    );
  }
  copyDir(STANDALONE_DIR, RELEASE_DIR);
  ok('standalone files copied.');

  // ── Step D: Copy public/ ────────────────────────────────────────────────────
  log('Step D: Copying public/ → portable-release/public/…');
  if (fs.existsSync(PUBLIC_DIR)) {
    copyDir(PUBLIC_DIR, path.join(RELEASE_DIR, 'public'));
    ok('public/ copied.');
  } else {
    log('  public/ not found – skipping.');
  }

  // ── Step E: Copy .next/static ───────────────────────────────────────────────
  log('Step E: Copying .next/static → portable-release/.next/static/…');
  if (!fs.existsSync(STATIC_DIR)) {
    err('.next/static not found. Did the build succeed?');
  }
  copyDir(STATIC_DIR, path.join(RELEASE_DIR, '.next', 'static'));
  ok('.next/static copied.');

  // ── Step F: Download node.exe ────────────────────────────────────────────────
  const nodeDestPath = path.join(RELEASE_DIR, NODE_FILENAME);
  log(`Step F: Downloading node.exe ${NODE_VERSION} (${NODE_ARCH})…`);
  try {
    await downloadFile(NODE_DOWNLOAD_URL, nodeDestPath);
    const sizeMB = (fs.statSync(nodeDestPath).size / 1_048_576).toFixed(1);
    ok(`node.exe downloaded (${sizeMB} MB).`);
  } catch (e) {
    err(`Failed to download node.exe: ${e.message}`);
  }

  // ── Step G: Generate launcher batch script ───────────────────────────────────
  log('Step G: Generating Start_LUTO_VUE.bat…');
  const batPath = path.join(RELEASE_DIR, 'Start_LUTO_VUE.bat');
  fs.writeFileSync(batPath, generateBatContent(), { encoding: 'utf8' });
  ok('Start_LUTO_VUE.bat generated.');

  // ── Done ─────────────────────────────────────────────────────────────────────
  console.log(`
\x1b[32m\x1b[1m ✓ Portable build complete!\x1b[0m

   Distribution folder: ${RELEASE_DIR}

   To run:
     1. Copy the entire \x1b[1mportable-release/\x1b[0m folder to the target Windows machine.
     2. Double-click \x1b[1mStart_LUTO_VUE.bat\x1b[0m.
     3. Open a browser and navigate to \x1b[1mhttp://${HOSTNAME}:${PORT}\x1b[0m.

   No Node.js installation, Docker, or admin rights required.
`);
}

main().catch((e) => {
  console.error('\x1b[31m[portable]\x1b[0m Unexpected error:', e);
  process.exit(1);
});
