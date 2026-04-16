#!/usr/bin/env node
/**
 * Stage quest JSON that should live in the repo (catalog, badges, settings).
 * Does NOT include quests.progress.json (runtime state — stays gitignored).
 *
 * Usage:
 *   node scripts/saveQuestDataForGit.js stage
 *   node scripts/saveQuestDataForGit.js commit "your message"
 *   node scripts/saveQuestDataForGit.js push "your message"
 *
 * npm:
 *   npm run quest-data:stage
 *   npm run quest-data:commit -- "chore: update quest catalog"
 *   npm run quest-data:push -- "chore: sync quest data"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const TRACKED_REL = [
  'src/data/quests.catalog.json',
  'src/data/quests.badges.json',
  'src/data/quests.settings.json',
];

function run(cmd, opts = {}) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true, ...opts });
}

function runCapture(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', shell: true }).trim();
}

function ensureGitRepo() {
  try {
    runCapture('git rev-parse --git-dir');
  } catch {
    console.error('Not a git repository.');
    process.exit(1);
  }
}

function ensureFilesExist() {
  for (const rel of TRACKED_REL) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      console.error(`Missing file: ${rel}`);
      process.exit(1);
    }
  }
}

function stage() {
  ensureFilesExist();
  const paths = TRACKED_REL.map((p) => `"${p.replace(/"/g, '\\"')}"`).join(' ');
  run(`git add -- ${paths}`);
  console.log('Staged:', TRACKED_REL.join(', '));
}

/** True if index matches HEAD for all content (nothing to commit after add). */
function nothingStagedToCommit() {
  try {
    execSync('git diff --cached --quiet', { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function commit(message) {
  if (!message || !message.trim()) {
    console.error('Commit message required. Example: node scripts/saveQuestDataForGit.js commit "chore: quest data"');
    process.exit(1);
  }
  stage();
  if (nothingStagedToCommit()) {
    console.log('No changes to commit (quest files match HEAD).');
    return false;
  }
  const safe = message.replace(/"/g, '\\"');
  run(`git commit -m "${safe}"`);
  return true;
}

function push(message) {
  const msg = message || 'chore: sync quest catalog and settings';
  commit(msg);
  run('git push');
  console.log('Done: pushed branch to remote.');
}

const mode = process.argv[2] || 'help';
const rest = process.argv.slice(3).join(' ');

ensureGitRepo();

if (mode === 'help' || mode === '-h') {
  console.log(`
saveQuestDataForGit.js

  stage              git add quests.catalog.json, quests.badges.json, quests.settings.json
  commit <msg>       stage + git commit (skips if no diff)
  push <msg>         stage + commit + git push

Tracked files do NOT include quests.progress.json (live scores stay local).
`);
  process.exit(0);
}

if (mode === 'stage') {
  stage();
} else if (mode === 'commit') {
  ensureFilesExist();
  commit(rest);
} else if (mode === 'push') {
  ensureFilesExist();
  push(rest);
} else {
  console.error('Unknown mode:', mode);
  process.exit(1);
}
