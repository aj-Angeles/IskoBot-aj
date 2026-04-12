const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const faqPath = path.join(dataDir, 'faqs.json');

function ensureFaqFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(faqPath)) {
    fs.writeFileSync(faqPath, JSON.stringify([], null, 2));
    console.log('✅ Created faqs.json');
  }
}

function getFaqs() {
  ensureFaqFile();
  const data = fs.readFileSync(faqPath, 'utf-8');
  return JSON.parse(data);
}

module.exports = { getFaqs };