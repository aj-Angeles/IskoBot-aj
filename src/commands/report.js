const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getReportPingRoleId, getReportChannelId } = require('../utils/guildConfig');

const REASON_MAX = 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user to the moderators')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('User you are reporting')
        .setRequired(true))
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('What happened')
        .setRequired(true)
        .setMaxLength(REASON_MAX)),

  async execute(interaction) {
    const channelId = getReportChannelId() || process.env.REPORT_CHANNEL_ID;
    if (!channelId) {
      return interaction.reply({
        content: '⚠️ Reports are not configured. An administrator can set the channel with `/admin configurereports`, or set `REPORT_CHANNEL_ID` in the bot environment.',
        ephemeral: true,
      });
    }

    const reported = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true).trim();

    if (reported.id === interaction.user.id) {
      return interaction.reply({ content: '⚠️ You cannot report yourself.', ephemeral: true });
    }

    const guild = interaction.client.guilds.cache.get(process.env.GUILD_ID);
    const reportChannel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);

    if (!reportChannel || !reportChannel.isTextBased()) {
      return interaction.reply({
        content: '⚠️ Report channel could not be found.',
        ephemeral: true,
      });
    }

    const pingRoleId = getReportPingRoleId();
    const ping = pingRoleId ? `<@&${pingRoleId}>` : '';

    const embed = new EmbedBuilder()
      .setTitle('🚨 New report')
      .addFields(
        { name: 'Reporter', value: `${interaction.user.tag} (<@${interaction.user.id}>)` },
        { name: 'Reported', value: `${reported.tag} (<@${reported.id}>)` },
        { name: 'Reason', value: reason.length ? reason : '(empty)' }
      )
      .setColor(0xED4245)
      .setTimestamp()
      .setFooter({ text: `Reporter ID ${interaction.user.id} · Reported ID ${reported.id}` });

    await reportChannel.send({ content: ping || undefined, embeds: [embed] });

    return interaction.reply({
      content: '✅ Your report has been submitted. Staff will review it.',
      ephemeral: true,
    });
  },
};
