const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const {
  addQuestToCatalog,
  removeQuestFromCatalog,
  listQuestsAdmin,
} = require('../utils/questManager');
const { themeChoicesForSlash } = require('../constants/questThemes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest-admin')
    .setDescription('Manage the quest catalog (Administrator).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) =>
      s
        .setName('add-daily')
        .setDescription('Add a daily quest')
        .addStringOption((o) => o.setName('id').setDescription('Unique quest id').setRequired(true))
        .addStringOption((o) =>
          o
            .setName('theme')
            .setDescription('Theme')
            .setRequired(true)
            .addChoices(...themeChoicesForSlash())
        )
        .addStringOption((o) => o.setName('title').setDescription('Title').setRequired(true))
        .addStringOption((o) => o.setName('description').setDescription('Description').setRequired(true))
        .addIntegerOption((o) => o.setName('points').setDescription('Points awarded').setRequired(true).setMinValue(0))
    )
    .addSubcommand((s) =>
      s
        .setName('add-weekly')
        .setDescription('Add a weekly quest')
        .addStringOption((o) => o.setName('id').setDescription('Unique quest id').setRequired(true))
        .addStringOption((o) =>
          o
            .setName('theme')
            .setDescription('Theme')
            .setRequired(true)
            .addChoices(...themeChoicesForSlash())
        )
        .addStringOption((o) => o.setName('title').setDescription('Title').setRequired(true))
        .addStringOption((o) => o.setName('description').setDescription('Description').setRequired(true))
        .addIntegerOption((o) => o.setName('points').setDescription('Points awarded').setRequired(true).setMinValue(0))
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Remove a quest by id')
        .addStringOption((o) => o.setName('id').setDescription('Quest id').setRequired(true))
    )
    .addSubcommand((s) => s.setName('list').setDescription('List all quests (includes points).')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'list') {
      const list = listQuestsAdmin();
      if (list.length === 0) {
        return interaction.editReply({ content: 'No quests in the catalog.' });
      }
      const embed = new EmbedBuilder()
        .setTitle('Quest catalog (admin)')
        .setColor(0x5865F2);
      const chunks = list
        .map(
          (q) =>
            `**${q.id}** — ${q.cadence} — ${q.theme} — **${q.points}** pts\n${q.title}\n_${q.description}_`
        )
        .join('\n\n');
      embed.setDescription(chunks.slice(0, 4000));
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      const id = interaction.options.getString('id', true).trim();
      const r = removeQuestFromCatalog(id);
      if (!r.ok) return interaction.editReply({ content: `⚠️ ${r.error}` });
      return interaction.editReply({ content: `✅ Removed quest \`${id}\`.` });
    }

    const cadence = sub === 'add-daily' ? 'daily' : 'weekly';
    const id = interaction.options.getString('id', true).trim();
    const theme = interaction.options.getString('theme', true);
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const points = interaction.options.getInteger('points', true);

    const r = addQuestToCatalog(id, {
      cadence,
      theme,
      title,
      description,
      points,
    });
    if (!r.ok) return interaction.editReply({ content: `⚠️ ${r.error}` });
    return interaction.editReply({ content: `✅ Added **${cadence}** quest \`${id}\`.` });
  },
};
