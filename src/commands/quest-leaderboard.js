const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  readSettings,
  canViewWeeklyLeaderboard,
  getWeeklyLeaderboardData,
  getGlobalLeaderboardData,
  getWeeklyRevealTargetWeekKey,
  maybeRunGlobalCommit,
} = require('../utils/questManager');

async function formatRows(interaction, rows) {
  const filtered = rows.filter((r) => r.points > 0);
  const lines = [];
  let rank = 1;
  for (const row of filtered) {
    let name = `<@${row.userId}>`;
    try {
      const m = await interaction.guild.members.fetch(row.userId).catch(() => null);
      if (m) name = m.displayName;
    } catch {
      /* ignore */
    }
    lines.push(`**${rank}.** ${name} — **${row.points}** pts`);
    rank += 1;
  }
  if (lines.length === 0) return '_No points recorded yet._';
  return lines.join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest-leaderboard')
    .setDescription('Weekly (reveal window) or global (committed) quest leaderboards.')
    .addSubcommand((s) =>
      s
        .setName('weekly')
        .setDescription('Previous ISO week — only during reveal window unless you are an admin.')
    )
    .addSubcommand((s) =>
      s
        .setName('global')
        .setDescription('All-time global standings (updates on Saturday commit; pending week excluded).')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.editReply({ content: '⚠️ This command can only be used in a server.' });
    }

    const sub = interaction.options.getSubcommand(true);
    const settings = readSettings();
    const topN = settings.leaderboardTopN || 10;

    if (sub === 'global') {
      maybeRunGlobalCommit(guildId);
      const rows = getGlobalLeaderboardData(guildId, topN);
      const body = await formatRows(interaction, rows);
      const embed = new EmbedBuilder()
        .setTitle('🌍 Global quest leaderboard')
        .setDescription(
          'Totals shown are **committed** on the configured Saturday (UTC). Points earned since the last commit are pending and not included here.'
        )
        .setColor(0x57F287)
        .addFields({ name: `Top ${topN}`, value: body.slice(0, 4096) });
      return interaction.editReply({ embeds: [embed] });
    }

    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
    const gate = canViewWeeklyLeaderboard(Boolean(isAdmin));
    if (!gate.ok) {
      return interaction.editReply({
        content: `⚠️ ${gate.reason}`,
      });
    }

    maybeRunGlobalCommit(guildId);
    const weekKey = getWeeklyRevealTargetWeekKey();
    const rows = getWeeklyLeaderboardData(guildId, weekKey, topN);
    const body = await formatRows(interaction, rows);

    const embed = new EmbedBuilder()
      .setTitle('📅 Weekly quest leaderboard')
      .setDescription(`Week **${weekKey}** (previous ISO week).`)
      .setColor(0xF1C40F)
      .addFields({ name: `Top ${topN}`, value: body.slice(0, 4096) });

    await interaction.editReply({ embeds: [embed] });
  },
};
