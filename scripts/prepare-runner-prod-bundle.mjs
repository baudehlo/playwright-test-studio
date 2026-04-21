import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const runnerDir = path.join(root, 'runner');
const runnerDistFile = path.join(runnerDir, 'dist', 'runner.js');
const runnerPackageJson = path.join(runnerDir, 'package.json');
const runnerPackageLock = path.join(runnerDir, 'package-lock.json');
const bundleDir = path.join(root, 'src-tauri', 'runner-bundle');

function mustExist(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with status ${result.status}`,
    );
  }
}

function main() {
  mustExist(runnerDistFile, 'Runner build output');
  mustExist(runnerPackageJson, 'Runner package.json');
  mustExist(runnerPackageLock, 'Runner package-lock.json');

  fs.rmSync(bundleDir, { recursive: true, force: true });
  fs.mkdirSync(bundleDir, { recursive: true });

  fs.copyFileSync(runnerDistFile, path.join(bundleDir, 'runner.js'));
  fs.copyFileSync(runnerPackageJson, path.join(bundleDir, 'package.json'));
  fs.copyFileSync(runnerPackageLock, path.join(bundleDir, 'package-lock.json'));

  run('npm', ['ci', '--omit=dev', '--ignore-scripts'], bundleDir);

  fs.rmSync(path.join(bundleDir, 'package.json'), { force: true });
  fs.rmSync(path.join(bundleDir, 'package-lock.json'), { force: true });

  console.log(`Prepared production runner bundle at ${bundleDir}`);
}

main();
