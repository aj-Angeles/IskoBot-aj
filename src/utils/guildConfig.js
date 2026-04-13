const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/guildConfig.json');

const defaults = {
  reportPingRoleId: null,
  reportChannelId: null,
  confessionReviewChannelId: null,
  confessionPostChannelId: null,
};

function ensure() {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2));
  }
}

function readGuildConfig() {
  ensure();
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  let changed = false;
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in raw)) {
      raw[k] = v;
      changed = true;
    }
  }
  if (changed) {
    writeGuildConfig(raw);
  }
  return raw;
}

function writeGuildConfig(data) {
  ensure();
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

function getReportPingRoleId() {
  const id = readGuildConfig().reportPingRoleId;
  return id || null;
}

function setReportPingRoleId(roleId) {
  const c = readGuildConfig();
  c.reportPingRoleId = roleId || null;
  writeGuildConfig(c);
}

function getReportChannelId() {
  const id = readGuildConfig().reportChannelId;
  return id || null;
}

function setReportChannelId(channelId) {
  const c = readGuildConfig();
  c.reportChannelId = channelId || null;
  writeGuildConfig(c);
}

function getConfessionReviewChannelId() {
  const id = readGuildConfig().confessionReviewChannelId;
  return id || null;
}

function setConfessionReviewChannelId(channelId) {
  const c = readGuildConfig();
  c.confessionReviewChannelId = channelId || null;
  writeGuildConfig(c);
}

function getConfessionPostChannelId() {
  const id = readGuildConfig().confessionPostChannelId;
  return id || null;
}

function setConfessionPostChannelId(channelId) {
  const c = readGuildConfig();
  c.confessionPostChannelId = channelId || null;
  writeGuildConfig(c);
}

module.exports = {
  readGuildConfig,
  writeGuildConfig,
  getReportPingRoleId,
  setReportPingRoleId,
  getReportChannelId,
  setReportChannelId,
  getConfessionReviewChannelId,
  setConfessionReviewChannelId,
  getConfessionPostChannelId,
  setConfessionPostChannelId
};
