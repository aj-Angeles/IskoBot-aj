const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'users.json');

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    console.log('✅ Created users.json');
  }
}

function readDB() {
  ensureDataFiles();
  const data = fs.readFileSync(dbPath, 'utf-8');
  return JSON.parse(data);
}

function writeDB(data) {
  ensureDataFiles();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getUser(userId) {
  const db = readDB();
  return db[userId] || null;
}

function saveUser(userId, username) {
  const db = readDB();
  if (!db[userId]) {
    db[userId] = {
      userId,
      username,
      classes: []
    };
    writeDB(db);
  }
  return db[userId];
}

function updateUser(userId, userData) {
  const db = readDB();
  db[userId] = userData;
  writeDB(db);
}

function getClassmates(userId) {
  const db = readDB();
  const user = db[userId];
  if (!user) return [];

  const results = [];

  for (const userClass of user.classes) {
    const classmates = [];

    for (const [otherId, otherUser] of Object.entries(db)) {
      if (otherId === userId) continue;

      const match = otherUser.classes.some(
        c => c.course.toLowerCase() === userClass.course.toLowerCase() &&
             c.schedule === userClass.schedule
      );

      if (match) classmates.push(otherUser);
    }

    if (classmates.length > 0) {
      results.push({
        course: userClass.course,
        schedule: userClass.schedule,
        classmates
      });
    }
  }

  return results;
}

function getClassmatesByClass(course, schedule) {
  const db = readDB();
  const results = [];

  for (const [, user] of Object.entries(db)) {
    const match = user.classes.some(
      c => c.course.toLowerCase() === course.toLowerCase() &&
           c.schedule === schedule
    );
    if (match) results.push(user);
  }

  return results;
}

function getUsersByCourse(course) {
  const db = readDB();
  const results = [];

  for (const [, user] of Object.entries(db)) {
    const match = user.classes.some(
      c => c.course.toLowerCase() === course.toLowerCase()
    );
    if (match) results.push(user);
  }

  return results;
}

module.exports = { readDB, writeDB, getUser, saveUser, updateUser, getClassmates, getClassmatesByClass, getUsersByCourse };