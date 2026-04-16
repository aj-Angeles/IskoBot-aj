const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { listQuestsForDisplay } = require('../utils/questManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quests')
    .setDescription('List active daily and weekly quests (no point values shown).'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const rows = listQuestsForDisplay();
    if (rows.length === 0) {
      return interaction.editReply({
        content: 'No quests are configured yet. Ask an admin to add quests via `/quest-admin` or the quest catalog JSON.',
      });
    }

    const byTheme = {};
    for (const q of rows) {
      const t = q.theme || 'Other';
      if (!byTheme[t]) byTheme[t] = [];
      byTheme[t].push(q);
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Quests')
      .setColor(0x5865F2)
      .setDescription('Complete quests with `/quest-complete`. Point values are not shown here.');

    for (const [theme, list] of Object.entries(byTheme)) {
      const body = list
        .map((q) => {
          const cad = q.cadence === 'daily' ? 'Daily' : 'Weekly';
          return `**${q.id}** — ${cad}\n${q.title}\n_${q.description}_`;
        })
        .join('\n\n');
      embed.addFields({ name: theme, value: body.slice(0, 1024) || '—' });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
