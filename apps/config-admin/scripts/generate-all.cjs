#!/usr/bin/env node

/**
 * Full config generation pipeline.
 *
 * Runs all 3 stages in order:
 *   1. generate-entity-configs.cjs  — DB schema → entity JSON files
 *   2. analyze-fields.cjs           — entity JSONs → semantic tree
 *   3. generate-sql-inserts.cjs     — semantic tree → app_config table
 *      (auto-triggers cascade updates + hierarchy rebuild)
 *
 * Usage:
 *   node scripts/generate-all.cjs          # full pipeline, interactive
 *   node scripts/generate-all.cjs --yes    # auto-confirm DB insert
 */

const { execSync } = require('child_process');
const path = require('path');

const scriptsDir = __dirname;
const steps = [
  { name: 'Generate entity configs from DB', script: 'generate-entity-configs.cjs' },
  { name: 'Analyze fields & build semantic tree', script: 'analyze-fields.cjs' },
  { name: 'Generate SQL inserts & update DB', script: 'generate-sql-inserts.cjs' },
];

const autoConfirm = process.argv.includes('--yes');

console.log('=== Config Generation Pipeline ===\n');

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  console.log(`\n[${ i + 1 }/${ steps.length }] ${step.name}`);
  console.log('─'.repeat(50));

  try {
    const scriptPath = path.join(scriptsDir, step.script);
    const input = (i === steps.length - 1 && autoConfirm) ? 'y\n' : undefined;

    execSync(`node "${scriptPath}"`, {
      cwd: path.resolve(scriptsDir, '..'),
      stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit',
      input,
    });
  } catch (error) {
    console.error(`\n❌ Step ${i + 1} failed: ${step.name}`);
    console.error(`   Script: ${step.script}`);
    process.exit(1);
  }
}

console.log('\n' + '═'.repeat(50));
console.log('✅ Pipeline complete!');
