const { recordMessage } = require('../utils/streakManager');
const { getFaqs } = require('../utils/faqManager');

module.exports = async (message) => {
  if (message.author.bot) return;

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