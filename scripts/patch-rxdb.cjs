/**
 * Patches RxDB to bypass the 16 collection limit for development.
 *
 * IMPORTANT: Remove this patch and buy RxDB Premium for production!
 * https://rxdb.info/premium
 *
 * RxDB author explicitly allows this modification:
 * "Yes you are allowed to fork the repo and just overwrite this function."
 */

const fs = require('fs');
const path = require('path');

const PATCHED_FUNCTION_ESM = `/**
 * Here we check if the premium flag has been set.
 * This code exists in the open source version of RxDB.
 * Yes you are allowed to fork the repo and just overwrite this function.
 * However you might better spend this time developing your real project
 * and supporting the RxDB efforts by buying premium.
 *
 * PATCHED FOR DEVELOPMENT - Remove this patch and buy premium for production!
 */
export async function hasPremiumFlag() {
  return true;
}`;

const PATCHED_FUNCTION_CJS = `/**
 * Here we check if the premium flag has been set.
 * This code exists in the open source version of RxDB.
 * Yes you are allowed to fork the repo and just overwrite this function.
 * However you might better spend this time developing your real project
 * and supporting the RxDB efforts by buying premium.
 *
 * PATCHED FOR DEVELOPMENT - Remove this patch and buy premium for production!
 */
async function hasPremiumFlag() {
  return true;
}`;

function findRxdbPath() {
  // Try direct path first
  const directPath = path.join(__dirname, '..', 'node_modules', 'rxdb');
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  // Try pnpm path
  const pnpmDir = path.join(__dirname, '..', 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const dirs = fs.readdirSync(pnpmDir);
    const rxdbDir = dirs.find(d => d.startsWith('rxdb@'));
    if (rxdbDir) {
      return path.join(pnpmDir, rxdbDir, 'node_modules', 'rxdb');
    }
  }

  return null;
}

function patchFile(filePath, isEsm) {
  if (!fs.existsSync(filePath)) {
    console.log(`  File not found: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check if already patched
  if (content.includes('PATCHED FOR DEVELOPMENT')) {
    console.log(`  Already patched: ${filePath}`);
    return true;
  }

  // Find and replace the function
  const functionRegex = isEsm
    ? /\/\*\*[\s\S]*?\*\/\s*export\s+async\s+function\s+hasPremiumFlag\s*\(\s*\)\s*\{[\s\S]*?\n\}/
    : /\/\*\*[\s\S]*?\*\/\s*async\s+function\s+hasPremiumFlag\s*\(\s*\)\s*\{[\s\S]*?\n\}/;

  const patchedContent = content.replace(
    functionRegex,
    isEsm ? PATCHED_FUNCTION_ESM : PATCHED_FUNCTION_CJS
  );

  if (patchedContent === content) {
    console.log(`  Could not find function to patch: ${filePath}`);
    return false;
  }

  fs.writeFileSync(filePath, patchedContent, 'utf8');
  console.log(`  Patched: ${filePath}`);
  return true;
}

function main() {
  console.log('Patching RxDB for development (bypassing 16 collection limit)...');

  const rxdbPath = findRxdbPath();
  if (!rxdbPath) {
    console.log('RxDB not found in node_modules, skipping patch.');
    return;
  }

  console.log(`Found RxDB at: ${rxdbPath}`);

  const esmPath = path.join(rxdbPath, 'dist', 'esm', 'plugins', 'utils', 'utils-premium.js');
  const cjsPath = path.join(rxdbPath, 'dist', 'cjs', 'plugins', 'utils', 'utils-premium.js');

  let patched = 0;
  if (patchFile(esmPath, true)) patched++;
  if (patchFile(cjsPath, false)) patched++;

  if (patched > 0) {
    console.log('RxDB patched successfully!');
    console.log('REMINDER: Buy RxDB Premium for production use: https://rxdb.info/premium');
  }
}

main();
