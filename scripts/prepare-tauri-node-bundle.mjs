import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const binariesDir = path.join(root, 'src-tauri', 'binaries');
const npmDestDir = path.join(root, 'src-tauri', 'node-dist', 'npm');
const npxCliDest = path.join(npmDestDir, 'bin', 'npx-cli.js');

function targetSuffix() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin' && arch === 'arm64') return 'aarch64-apple-darwin';
  if (platform === 'darwin' && arch === 'x64') return 'x86_64-apple-darwin';
  if (platform === 'linux' && arch === 'x64') return 'x86_64-unknown-linux-gnu';
  if (platform === 'win32' && arch === 'x64') return 'x86_64-pc-windows-msvc';

  throw new Error(
    `Unsupported platform/arch for bundled node: ${platform}/${arch}`,
  );
}

function copyDirRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function resolveNpmSourceDir() {
  const candidates = [];

  if (process.env.npm_execpath) {
    candidates.push(path.resolve(path.dirname(process.env.npm_execpath), '..'));
  }

  const nodeDir = path.dirname(process.execPath);
  candidates.push(path.resolve(nodeDir, '..', 'lib', 'node_modules', 'npm'));
  candidates.push(path.resolve(nodeDir, '..', 'node_modules', 'npm'));

  for (const candidate of candidates) {
    const npxCli = path.join(candidate, 'bin', 'npx-cli.js');
    if (fs.existsSync(npxCli)) {
      return candidate;
    }
  }

  throw new Error(
    `Could not locate npm package directory. Tried: ${candidates.join(', ')}`,
  );
}

function main() {
  fs.mkdirSync(binariesDir, { recursive: true });
  fs.mkdirSync(path.dirname(npxCliDest), { recursive: true });

  const suffix = targetSuffix();
  const nodeBinaryName =
    process.platform === 'win32' ? `node-${suffix}.exe` : `node-${suffix}`;
  const nodeDest = path.join(binariesDir, nodeBinaryName);

  const nodeExists = fs.existsSync(nodeDest);
  const npmExists = fs.existsSync(npxCliDest);
  if (nodeExists && npmExists) {
    console.log(
      'Bundled node/npm artifacts already present; skipping local prepare step.',
    );
    return;
  }

  fs.copyFileSync(process.execPath, nodeDest);
  if (process.platform !== 'win32') {
    fs.chmodSync(nodeDest, 0o755);
  }

  const npmSourceDir = resolveNpmSourceDir();
  copyDirRecursive(npmSourceDir, npmDestDir);

  console.log(`Prepared bundled node binary at ${nodeDest}`);
  console.log(`Prepared bundled npm package at ${npmDestDir}`);
}

main();
