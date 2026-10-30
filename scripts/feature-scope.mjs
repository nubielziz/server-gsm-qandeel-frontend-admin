// Lists what a feature worktree changed (committed on feat/<name> or not) and fails when anything lies outside
// src/features/<name>/, the only folder an implementer may edit. Usage: node scripts/feature-scope.mjs <name>
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const name = process.argv[2];
if (!/^[a-z][a-z0-9-]*$/.test(name ?? '')) {
  console.error('Usage: node scripts/feature-scope.mjs <feature-name>');
  process.exit(2);
}
const dir = path.join(path.dirname(root), 'worktrees', name);
const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });

// Committed changes since the branch left feat/refine-admin, plus whatever is not committed yet.
const base = git('merge-base', 'HEAD', 'feat/refine-admin').trim();
const committed = git('diff', '--name-only', base, 'HEAD').split('\n');
const pending = git('status', '--porcelain', '--untracked-files=all')
  .split('\n')
  .map((line) => line.slice(3));
const files = [...new Set([...committed, ...pending].filter(Boolean))].sort();
const inside = `src/features/${name}/`;
const outside = files.filter((file) => !file.startsWith(inside));

console.log(`${name}: ${files.length} changed files, ${outside.length} outside ${inside}`);
for (const file of outside) console.log(`  outside  ${file}`);
process.exit(outside.length ? 1 : 0);
