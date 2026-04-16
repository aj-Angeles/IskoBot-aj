const fs = require('fs');
const path = require('path');
const { isValidTheme } = require('../constants/questThemes');

const dataDir = path.join(__dirname, '../data');
const catalogPath = path.join(dataDir, 'quests.catalog.json');
const badgesPath = path.join(dataDir, 'quests.badges.json');
const progressPath = path.join(dataDir, 'quests.progress.json');
const settingsPath = path.join(dataDir, 'quests.settings.json');

const defaultSettings = {
  revealDayOfWeek: 0,
  revealStartHourUtc: 12,
  revealEndHourUtc: 23,
  leaderboardTopN: 10,
  globalCommitDayOfWeek: 6,
  globalCommitHourUtc: 0,
  globalCommitMinute: 0,
};

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(catalogPath)) {
    fs.writeFileSync(catalogPath, JSON.stringify({ version: 1, quests: {} }, null, 2));
  }
  if (!fs.existsSync(badgesPath)) {
    fs.writeFileSync(badgesPath, JSON.stringify({ version: 1, badges: {} }, null, 2));
  }
  if (!fs.existsSync(progressPath)) {
    fs.writeFileSync(progressPath, JSON.stringify({}, null, 2));
  }
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
  }
}

function readCatalog() {
  ensureDataFiles();
  const raw = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (!raw.quests || typeof raw.quests !== 'object') raw.quests = {};
  return raw;
}

function writeCatalog(data) {
  ensureDataFiles();
  fs.writeFileSync(catalogPath, JSON.stringify(data, null, 2));
}

function readBadgesFile() {
  ensureDataFiles();
  const raw = JSON.parse(fs.readFileSync(badgesPath, 'utf8'));
  if (!raw.badges || typeof raw.badges !== 'object') raw.badges = {};
  return raw;
}

function writeBadgesFile(data) {
  ensureDataFiles();
  fs.writeFileSync(badgesPath, JSON.stringify(data, null, 2));
}

function readProgress() {
  ensureDataFiles();
  return JSON.parse(fs.readFileSync(progressPath, 'utf8'));
}

function writeProgress(data) {
  ensureDataFiles();
  fs.writeFileSync(progressPath, JSON.stringify(data, null, 2));
}

function readSettings() {
  ensureDataFiles();
  const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  return { ...defaultSettings, ...raw };
}

function writeSettings(data) {
  ensureDataFiles();
  fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
}

/** UTC calendar day YYYY-MM-DD */
function getUtcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** ISO-like week key for UTC (consistent week boundaries for the bot). */
function getIsoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getPreviousIsoWeekKey(d = new Date()) {
  const prev = new Date(d);
  prev.setUTCDate(prev.getUTCDate() - 7);
  return getIsoWeekKey(prev);
}

function getGuildBucket(progress, guildId) {
  if (!progress[guildId]) {
    progress[guildId] = { lastGlobalCommitAt: null, users: {} };
  }
  if (!progress[guildId].users) progress[guildId].users = {};
  return progress[guildId];
}

function getUserProgress(guildId, userId) {
  const progress = readProgress();
  const g = getGuildBucket(progress, guildId);
  if (!g.users[userId]) {
    g.users[userId] = {
      lifetimePoints: 0,
      displayGlobalPoints: 0,
      pendingGlobalPoints: 0,
      weeklyWeekKey: null,
      weeklyPoints: 0,
      totalQuestCompletions: 0,
      dailyStreakCurrent: 0,
      dailyStreakBest: 0,
      lastDailyActivityDate: null,
      fullDailyDaysCount: 0,
      lastFullDailyDate: null,
      completions: {},
    };
  }
  const u = g.users[userId];
  if (!u.completions) u.completions = {};
  return { progress, guild: g, user: u };
}

function saveUserProgress(progress) {
  writeProgress(progress);
}

/** Ensure weekly bucket matches current ISO week; reset if rolled over (after rollover pass). */
function ensureWeeklyWeekKey(user, nowWeekKey) {
  if (user.weeklyWeekKey == null) {
    user.weeklyWeekKey = nowWeekKey;
    if (user.weeklyPoints == null) user.weeklyPoints = 0;
    return;
  }
  if (user.weeklyWeekKey !== nowWeekKey) {
    user.weeklyWeekKey = nowWeekKey;
    user.weeklyPoints = 0;
  }
}

function getDailyQuestIds(catalog) {
  return Object.keys(catalog.quests || {}).filter((id) => catalog.quests[id].cadence === 'daily');
}

function getWeeklyQuestIds(catalog) {
  return Object.keys(catalog.quests || {}).filter((id) => catalog.quests[id].cadence === 'weekly');
}

function isDailyCompletedForDay(user, questId, dayKey) {
  const c = user.completions[questId];
  if (!c || !c.daily) return false;
  return Boolean(c.daily[dayKey]);
}

function isWeeklyCompletedForWeek(user, questId, weekKey) {
  const c = user.completions[questId];
  if (!c || !c.weekly) return false;
  return Boolean(c.weekly[weekKey]);
}

function markCompletion(user, questId, cadence, dayKey, weekKey) {
  if (!user.completions[questId]) user.completions[questId] = {};
  if (cadence === 'daily') {
    if (!user.completions[questId].daily) user.completions[questId].daily = {};
    user.completions[questId].daily[dayKey] = true;
  } else {
    if (!user.completions[questId].weekly) user.completions[questId].weekly = {};
    user.completions[questId].weekly[weekKey] = true;
  }
}

/**
 * After a daily quest completion, update streak (same UTC day does not increment again).
 */
function updateDailyStreakAfterCompletion(user, dayKey) {
  const last = user.lastDailyActivityDate;
  if (last === dayKey) return;

  if (!last) {
    user.dailyStreakCurrent = 1;
    user.lastDailyActivityDate = dayKey;
    if (user.dailyStreakCurrent > user.dailyStreakBest) user.dailyStreakBest = user.dailyStreakCurrent;
    return;
  }
  const lastD = new Date(`${last}T00:00:00.000Z`);
  const todayD = new Date(`${dayKey}T00:00:00.000Z`);
  const diffDays = Math.round((todayD - lastD) / 86400000);
  if (diffDays === 1) {
    user.dailyStreakCurrent = (user.dailyStreakCurrent || 0) + 1;
  } else {
    user.dailyStreakCurrent = 1;
  }
  user.lastDailyActivityDate = dayKey;
  if (user.dailyStreakCurrent > user.dailyStreakBest) user.dailyStreakBest = user.dailyStreakCurrent;
}

/**
 * If all daily quests in catalog are completed for dayKey, bump fullDailyDaysCount once per day.
 */
function maybeIncrementFullDailyDay(user, catalog, dayKey) {
  const dailyIds = getDailyQuestIds(catalog);
  if (dailyIds.length === 0) return;
  for (const qid of dailyIds) {
    if (!isDailyCompletedForDay(user, qid, dayKey)) return;
  }
  if (user.lastFullDailyDate === dayKey) return;
  user.lastFullDailyDate = dayKey;
  user.fullDailyDaysCount = (user.fullDailyDaysCount || 0) + 1;
}

function isInRevealWindow(now = new Date(), settings = readSettings()) {
  const dow = now.getUTCDay();
  if (dow !== settings.revealDayOfWeek) return false;
  const h = now.getUTCHours();
  return h >= settings.revealStartHourUtc && h <= settings.revealEndHourUtc;
}

function canViewWeeklyLeaderboard(memberIsAdmin, now = new Date()) {
  if (memberIsAdmin) return { ok: true, reason: 'admin' };
  if (isInRevealWindow(now)) return { ok: true, reason: 'window' };
  return { ok: false, reason: 'Weekly leaderboard is only available during the configured reveal window (or ask an admin).' };
}

/**
 * List quests for display: no points.
 */
function listQuestsForDisplay() {
  const catalog = readCatalog();
  const quests = catalog.quests || {};
  return Object.entries(quests).map(([id, q]) => ({
    id,
    cadence: q.cadence,
    theme: q.theme,
    title: q.title,
    description: q.description,
  }));
}

function validateQuestDef(id, def) {
  if (typeof id !== 'string' || !id.trim()) {
    return 'Quest id must be a non-empty string.';
  }
  if (!def.cadence || !['daily', 'weekly'].includes(def.cadence)) {
    return 'cadence must be "daily" or "weekly".';
  }
  if (!isValidTheme(def.theme)) {
    return `theme must be one of the three configured themes.`;
  }
  if (typeof def.title !== 'string' || !def.title.trim()) return 'title is required.';
  if (typeof def.description !== 'string') return 'description must be a string.';
  if (typeof def.points !== 'number' || def.points < 0 || !Number.isFinite(def.points)) {
    return 'points must be a non-negative finite number.';
  }
  return null;
}

/**
 * Complete a quest. Does not expose points in return value to callers for user messages.
 */
function completeQuest(guildId, userId, questId) {
  maybeRunGlobalCommit(guildId);

  const catalog = readCatalog();
  const q = catalog.quests[questId];
  if (!q) return { ok: false, error: 'Quest not found.' };

  const err = validateQuestDef(questId, q);
  if (err) return { ok: false, error: err };

  const now = new Date();
  const dayKey = getUtcDateKey(now);
  const weekKey = getIsoWeekKey(now);

  const { progress, user } = getUserProgress(guildId, userId);
  ensureWeeklyWeekKey(user, weekKey);

  if (q.cadence === 'daily') {
    if (isDailyCompletedForDay(user, questId, dayKey)) {
      return { ok: false, error: 'You already completed this daily quest today.' };
    }
  } else {
    if (isWeeklyCompletedForWeek(user, questId, weekKey)) {
      return { ok: false, error: 'You already completed this weekly quest this week.' };
    }
  }

  const pts = q.points;
  user.lifetimePoints += pts;
  user.pendingGlobalPoints += pts;
  user.weeklyPoints += pts;
  user.totalQuestCompletions = (user.totalQuestCompletions || 0) + 1;

  markCompletion(user, questId, q.cadence, dayKey, weekKey);

  if (q.cadence === 'daily') {
    updateDailyStreakAfterCompletion(user, dayKey);
    maybeIncrementFullDailyDay(user, catalog, dayKey);
  }

  saveUserProgress(progress);
  return { ok: true, questTitle: q.title };
}

/**
 * Weekly leaderboard: previous ISO week's points. We persist weeklyPoints per current week only,
 * so for "last week" we rely on archived snapshot when week rolled — stored in guild.weeklyArchive
 */
function getWeeklyLeaderboardData(guildId, targetWeekKey, topN) {
  const progress = readProgress();
  const g = getGuildBucket(progress, guildId);
  const archive = g.weeklyArchive && g.weeklyArchive[targetWeekKey];
  if (!archive || !archive.users) return [];

  const rows = Object.entries(archive.users).map(([uid, pts]) => ({
    userId: uid,
    points: pts,
  }));
  rows.sort((a, b) => b.points - a.points);
  const n = typeof topN === 'number' && topN > 0 ? topN : 10;
  return rows.slice(0, n);
}

function rolloverAllUsersForNewWeek(guildId, nowWeekKey) {
  const progress = readProgress();
  const g = getGuildBucket(progress, guildId);
  for (const userId of Object.keys(g.users)) {
    const u = g.users[userId];
    const prevKey = u.weeklyWeekKey;
    if (prevKey && prevKey !== nowWeekKey) {
      if (!g.weeklyArchive) g.weeklyArchive = {};
      if (!g.weeklyArchive[prevKey]) g.weeklyArchive[prevKey] = { users: {} };
      g.weeklyArchive[prevKey].users[userId] = u.weeklyPoints || 0;
      u.weeklyWeekKey = nowWeekKey;
      u.weeklyPoints = 0;
    } else if (!prevKey) {
      u.weeklyWeekKey = nowWeekKey;
      u.weeklyPoints = u.weeklyPoints || 0;
    }
  }
  saveUserProgress(progress);
}

/**
 * Run on tick: roll weekly archive for any user whose week key drifted.
 */
function maybeWeeklyRollover(guildId) {
  const nowWeekKey = getIsoWeekKey();
  rolloverAllUsersForNewWeek(guildId, nowWeekKey);
}

/** Next global commit instant (UTC) strictly after `afterMs`, on configured weekday/hour/minute. */
function nextGlobalCommitAfter(afterMs, settings) {
  const targetDow = settings.globalCommitDayOfWeek;
  const h = settings.globalCommitHourUtc;
  const m = settings.globalCommitMinute || 0;

  const day = new Date(afterMs);
  for (let i = 0; i < 21; i++) {
    const cand = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m, 0, 0)
    );
    if (cand.getUTCDay() === targetDow && cand.getTime() > afterMs) {
      return cand.getTime();
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return Date.now() + 86400000;
}

function runGlobalCommitForGuild(guildId) {
  const settings = readSettings();
  const progress = readProgress();
  const g = getGuildBucket(progress, guildId);
  const now = Date.now();
  let last = g.lastGlobalCommitAt ? new Date(g.lastGlobalCommitAt).getTime() : 0;

  let guard = 0;
  while (guard++ < 52) {
    const next = nextGlobalCommitAfter(last || now - 1, settings);
    if (next > now) break;

    for (const userId of Object.keys(g.users)) {
      const u = g.users[userId];
      const pending = u.pendingGlobalPoints || 0;
      if (pending > 0) {
        u.displayGlobalPoints = (u.displayGlobalPoints || 0) + pending;
        u.pendingGlobalPoints = 0;
      }
    }
    g.lastGlobalCommitAt = new Date(next).toISOString();
    last = next;
    saveUserProgress(progress);
  }
}

/**
 * Call periodically and on interactions.
 */
function maybeRunGlobalCommit(guildId) {
  maybeWeeklyRollover(guildId);
  runGlobalCommitForGuild(guildId);
}

function getGlobalLeaderboardData(guildId, topN) {
  maybeRunGlobalCommit(guildId);
  const progress = readProgress();
  const g = progress[guildId];
  if (!g || !g.users) return [];
  const rows = Object.entries(g.users).map(([uid, u]) => ({
    userId: uid,
    points: u.displayGlobalPoints || 0,
  }));
  rows.sort((a, b) => b.points - a.points);
  const n = typeof topN === 'number' && topN > 0 ? topN : 10;
  return rows.slice(0, n);
}

function getWeeklyRevealTargetWeekKey(now = new Date()) {
  return getPreviousIsoWeekKey(now);
}

function getEarnedBadges(guildId, userId) {
  maybeRunGlobalCommit(guildId);
  const progress = readProgress();
  const g = progress[guildId];
  if (!g || !g.users || !g.users[userId]) return [];

  const catalog = readCatalog();
  const dailyQuestCount = getDailyQuestIds(catalog).length;

  const badgesDoc = readBadgesFile();
  const badges = badgesDoc.badges || {};
  const user = g.users[userId];

  const earned = [];
  for (const [badgeId, def] of Object.entries(badges)) {
    if (!def || typeof def !== 'object') continue;
    let ok = true;
    if (def.minLifetimePoints != null && (user.lifetimePoints || 0) < def.minLifetimePoints) ok = false;
    if (def.minDisplayGlobalPoints != null && (user.displayGlobalPoints || 0) < def.minDisplayGlobalPoints) ok = false;
    if (def.minQuestsCompleted != null && (user.totalQuestCompletions || 0) < def.minQuestsCompleted) ok = false;
    if (def.minDailyStreak != null && (user.dailyStreakCurrent || 0) < def.minDailyStreak) ok = false;
    if (def.minDailyStreakBest != null && (user.dailyStreakBest || 0) < def.minDailyStreakBest) ok = false;
    // minFullDailyQuestDays: unsatisfiable if catalog has no daily quests (vacuously false).
    if (def.minFullDailyQuestDays != null) {
      if (dailyQuestCount === 0) {
        ok = false;
      } else if ((user.fullDailyDaysCount || 0) < def.minFullDailyQuestDays) {
        ok = false;
      }
    }
    if (ok) {
      earned.push({
        id: badgeId,
        label: def.label || def.name || badgeId,
        emoji: def.emoji || def.icon || '',
        description: def.description || '',
      });
    }
  }
  return earned;
}

function formatBadgesForEmbed(badges) {
  if (!badges.length) return 'No trophies yet.';
  return badges
    .map((b) => {
      const em = b.emoji ? `${b.emoji} ` : '';
      return `${em}**${b.label}**`;
    })
    .join('\n');
}

function addQuestToCatalog(id, def) {
  const err = validateQuestDef(id, def);
  if (err) return { ok: false, error: err };
  const catalog = readCatalog();
  if (catalog.quests[id]) return { ok: false, error: 'A quest with this id already exists.' };
  catalog.quests[id] = { ...def };
  writeCatalog(catalog);
  return { ok: true };
}

function removeQuestFromCatalog(id) {
  const catalog = readCatalog();
  if (!catalog.quests[id]) return { ok: false, error: 'Quest not found.' };
  delete catalog.quests[id];
  writeCatalog(catalog);
  return { ok: true };
}

function listQuestsAdmin() {
  const catalog = readCatalog();
  return Object.entries(catalog.quests || {}).map(([id, q]) => ({
    id,
    ...q,
  }));
}

module.exports = {
  ensureDataFiles,
  readCatalog,
  writeCatalog,
  readBadgesFile,
  writeBadgesFile,
  readProgress,
  readSettings,
  writeSettings,
  getUtcDateKey,
  getIsoWeekKey,
  getPreviousIsoWeekKey,
  listQuestsForDisplay,
  completeQuest,
  validateQuestDef,
  isInRevealWindow,
  canViewWeeklyLeaderboard,
  getGlobalLeaderboardData,
  getWeeklyLeaderboardData,
  getWeeklyRevealTargetWeekKey,
  maybeRunGlobalCommit,
  maybeWeeklyRollover,
  getEarnedBadges,
  formatBadgesForEmbed,
  addQuestToCatalog,
  removeQuestFromCatalog,
  listQuestsAdmin,
  getUserProgress,
};
