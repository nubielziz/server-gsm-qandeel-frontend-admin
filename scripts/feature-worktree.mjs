// Creates or removes the git worktree a feature is built in, on branch feat/<name> from the head of feat/refine-admin.
// The worktree shares the main checkout's node_modules through a symlink, so it needs no install.
// Usage: node scripts/feature-worktree.mjs add <name> | remove <name>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [command, name] = process.argv.slice(2);
if (!['add', 'remove'].includes(command) || !/^[a-z][a-z0-9-]*$/.test(name ?? '')) {
  console.error('Usage: node scripts/feature-worktree.mjs add|remove <feature-name>');
  process.exit(2);
}
const dir = path.join(path.dirname(root), 'worktrees', name);
const branch = `feat/${name}`;
const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'inherit' });

if (command === 'add') {
  git('worktree', 'add', '-b', branch, dir, 'feat/refine-admin');
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  console.log(`${branch} ready at ${dir}`);
} else {
  // Run after the branch was squash-merged: the branch is not "merged" in git's eyes, hence -D.
  git('worktree', 'remove', '--force', dir);
  git('branch', '-D', branch);
  console.log(`${branch} and ${dir} removed`);
}
