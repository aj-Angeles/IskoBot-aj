const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../utils/database');
const { COLLEGE_ROLES } = require('../constants/colleges');
const { getEarnedBadges, formatBadgesForEmbed } = require('../utils/questManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show info about a user')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('User to look up (leave empty to see your own info)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.client.guilds.cache.get(process.env.GUILD_ID);
    const target = interaction.options.getUser('user') || interaction.user;
    const user = getUser(target.id);

    if (!user) {
      return interaction.editReply({
        content: `⚠️ **${target.username}** has not registered with the bot yet (no profile).`,
      });
    }

    let member = guild.members.cache.get(target.id);
    if (!member) {
      member = await guild.members.fetch(target.id).catch(() => null);
    }

    const collegeRole = member
      ? member.roles.cache.find(r => COLLEGE_ROLES.includes(r.name))
      : null;

    const classList = user.classes.length > 0
      ? user.classes.map(c => `• **${c.course}** — ${c.schedule}`).join('\n')
      : 'No classes registered';

    const bioText = (user.bio && user.bio.trim()) ? user.bio.trim() : 'No bio set';

    const guildId = interaction.guildId || process.env.GUILD_ID;
    const badges = guildId ? getEarnedBadges(guildId, target.id) : [];
    const badgeText = formatBadgesForEmbed(badges);

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${target.username}'s Profile`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '📝 Bio', value: bioText },
        { name: '🎓 College', value: collegeRole ? collegeRole.name : 'No college role assigned', inline: true },
        { name: '📚 Classes Registered', value: `${user.classes.length}`, inline: true },
        { name: '🏆 Trophies', value: badgeText.slice(0, 1024) },
        { name: '📖 Class List', value: classList }
      )
      .setColor(0x5865F2)
      .setFooter({ text: `User ID: ${target.id}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
