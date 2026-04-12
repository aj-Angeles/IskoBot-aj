const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const resourcesPath = path.join(dataDir, 'resources.json');

function ensureResourcesFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(resourcesPath)) {
    fs.writeFileSync(resourcesPath, JSON.stringify({}, null, 2));
    console.log('✅ Created resources.json');
  }
}

function readResources() {
  ensureResourcesFile();
  return JSON.parse(fs.readFileSync(resourcesPath, 'utf-8'));
}

function writeResources(data) {
  ensureResourcesFile();
  fs.writeFileSync(resourcesPath, JSON.stringify(data, null, 2));
}

function getResources(course) {
  const resources = readResources();
  return resources[course] || [];
}

function addResource(course, title, link, username) {
  const resources = readResources();
  if (!resources[course]) resources[course] = [];

  resources[course].push({
    title,
    link,
    addedBy: username,
    addedAt: new Date().toISOString().split('T')[0]
  });

  writeResources(resources);
}

module.exports = { getResources, addResource };