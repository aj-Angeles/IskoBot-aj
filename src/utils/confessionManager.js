const fs = require('fs');
const path = require('path');

const confessionPath = path.join(__dirname, '../data/confessions.json');

function ensure() {
  const dir = path.dirname(confessionPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(confessionPath)) {
    fs.writeFileSync(confessionPath, JSON.stringify({}, null, 2));
  }
}

function readConfessions() {
  ensure();
  return JSON.parse(fs.readFileSync(confessionPath, 'utf8'));
}

function writeConfessions(data) {
  ensure();
  fs.writeFileSync(confessionPath, JSON.stringify(data, null, 2));
}

function createPendingConfession({ userId, username, guildId, content }) {
  const all = readConfessions();
  const id = `conf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  all[id] = {
    id,
    status: 'pending',
    userId,
    username,
    guildId,
    content,
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    postedMessageId: null,
  };
  writeConfessions(all);
  return all[id];
}

function getConfessionById(id) {
  return readConfessions()[id] || null;
}

function updateConfession(id, patch) {
  const all = readConfessions();
  if (!all[id]) return null;
  all[id] = { ...all[id], ...patch };
  writeConfessions(all);
  return all[id];
}

module.exports = {
  createPendingConfession,
  getConfessionById,
  updateConfession,
};
