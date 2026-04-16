const { SlashCommandBuilder } = require('discord.js');
const { completeQuest } = require('../utils/questManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest-complete')
    .setDescription('Mark a quest as completed for today / this week.')
    .addStringOption((o) =>
      o
        .setName('quest_id')
        .setDescription('The quest id (see /quests)')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.editReply({ content: '⚠️ This command can only be used in a server.' });
    }

    const questId = interaction.options.getString('quest_id', true).trim();
    const result = completeQuest(guildId, interaction.user.id, questId);

    if (!result.ok) {
      return interaction.editReply({ content: `⚠️ ${result.error}` });
    }

    return interaction.editReply({
      content: `✅ Quest completed: **${result.questTitle}**. Keep going!`,
    });
  },
};
