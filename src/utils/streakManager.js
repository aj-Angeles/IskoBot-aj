const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const streakPath = path.join(dataDir, 'streaks.json');

function ensureStreakFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  }
  if (!fs.existsSync(streakPath)) {
    fs.writeFileSync(streakPath, JSON.stringify({}, null, 2));
    console.log('✅ Created streaks.json');
  }
}

function readStreaks() {
  ensureStreakFile();
  const data = fs.readFileSync(streakPath, 'utf-8');
  return JSON.parse(data);
}

function writeStreaks(data) {
  ensureStreakFile();
  fs.writeFileSync(streakPath, JSON.stringify(data, null, 2));
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function getStreak(channelName) {
  const streaks = readStreaks();
  return streaks[channelName] || {
    streak: 0,
    lastUpdated: null,
    todayUsers: []
  };
}

function recordMessage(channelName, userId) {
  const streaks = readStreaks();
  const today = getTodayDate();

  if (!streaks[channelName]) {
    streaks[channelName] = {
      streak: 0,
      lastUpdated: today,
      todayUsers: []
    };
  }

  const entry = streaks[channelName];

  if (entry.lastUpdated !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (entry.lastUpdated === yesterdayStr && entry.todayUsers.length >= 3) {
      entry.streak += 1;
    } else {
      entry.streak = 0;
    }

    entry.todayUsers = [];
    entry.lastUpdated = today;
  }

  if (!entry.todayUsers.includes(userId)) {
    entry.todayUsers.push(userId);
  }

  streaks[channelName] = entry;
  writeStreaks(streaks);
}

function checkAndResetStreaks() {
  const streaks = readStreaks();
  const today = getTodayDate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  for (const [channelName, entry] of Object.entries(streaks)) {
    if (entry.lastUpdated === yesterdayStr && entry.todayUsers.length < 3) {
      streaks[channelName].streak = 0;
      streaks[channelName].todayUsers = [];
    }
    if (entry.lastUpdated < yesterdayStr) {
      streaks[channelName].streak = 0;
      streaks[channelName].todayUsers = [];
    }
  }

  writeStreaks(streaks);
}

function getAllStreaks() {
  return readStreaks();
}

module.exports = { recordMessage, getStreak, checkAndResetStreaks, getAllStreaks };