const { recordMessage } = require('../utils/streakManager');
const { getFaqs } = require('../utils/faqManager');

const WINDOW_MS = 2000;
const MAX_MESSAGES_IN_WINDOW = 10;
const SPAM_WARNING = 'Kalma muna boi, baka madelay ka sa sobrang bilis mo';
const spamTracker = new Map();

module.exports = async (message) => {
  if (message.author.bot) return;

  // Anti-spam check (more than 10 messages within 2 seconds)
  const now = Date.now();
  const userState = spamTracker.get(message.author.id) || { timestamps: [], lastWarnedAt: 0 };
  userState.timestamps = userState.timestamps.filter(ts => now - ts <= WINDOW_MS);
  userState.timestamps.push(now);

  if (userState.timestamps.length > MAX_MESSAGES_IN_WINDOW && now - userState.lastWarnedAt > WINDOW_MS) {
    userState.lastWarnedAt = now;
    await message.reply(SPAM_WARNING).catch(() => {});
  }

  spamTracker.set(message.author.id, userState);

  const content = message.content.toLowerCase();

  // Track streak if message is in a class channel
  const category = message.channel.parent;
  if (category && category.name.toLowerCase() === 'class channels') {
    recordMessage(message.channel.name, message.author.id);
  }

  // FAQ keyword check
  const faqs = getFaqs();
  for (const faq of faqs) {
    if (faq.keywords.some(keyword => content.includes(keyword))) {
      await message.reply(faq.response);
      return;
    }
  }
};