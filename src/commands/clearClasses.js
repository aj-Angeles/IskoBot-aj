const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getUser, updateUser } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearclasses')
    .setDescription('Remove yourself from all your classes at once. Useful at the end of the semester!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = getUser(userId);

    if (!user || user.classes.length === 0) {
      return interaction.reply({
        content: `⚠️ You don't have any classes registered!`,
        ephemeral: true
      });
    }

    // Confirmation prompt
    const embed = new EmbedBuilder()
      .setTitle('⚠️ Clear All Classes')
      .setDescription(`You are about to remove yourself from **${user.classes.length} class(es)**. This will also remove you from all your class channels.\n\nAre you sure?`)
      .setColor(0xFF0000)
      .addFields({
        name: 'Your Classes',
        value: user.classes.map(c => `• **${c.course}** — ${c.schedule}`).join('\n')
      });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('clearclasses_confirm')
        .setLabel('Yes, clear all')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('clearclasses_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    const reply = await interaction.reply({
      embeds: [embed],
      components: [buttons],
      ephemeral: true,
      fetchReply: true
    });

    const collector = reply.createMessageComponentCollector({
      time: 30 * 1000 // 30 seconds to respond
    });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: '⚠️ This is not your confirmation!', ephemeral: true });
      }

      if (btn.customId === 'clearclasses_cancel') {
        return btn.update({
          content: '✅ Cancelled. Your classes are unchanged.',
          embeds: [],
          components: []
        });
      }

      if (btn.customId === 'clearclasses_confirm') {
        await btn.update({
          content: '⏳ Removing you from all classes...',
          embeds: [],
          components: []
        });

        const guild = interaction.client.guilds.cache.get(process.env.GUILD_ID);
        const classesToRemove = [...user.classes];

        // Clear all classes
        user.classes = [];
        updateUser(userId, user);

        // Remove from all channels and send leave messages
        for (const userClass of classesToRemove) {
          try {
            const channelName = `${userClass.course}-${userClass.schedule}`
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '');

            const channel = guild.channels.cache.find(
              c => c.type === 0 && c.name === channelName
            );

            if (channel) {
              // Check remaining students
              const { getClassmatesByClass } = require('../utils/database');
              const remaining = getClassmatesByClass(userClass.course, userClass.schedule);

              if (remaining.length === 0) {
                await channel.send(`👋 <@${userId}> has left. No more students in **${userClass.course} ${userClass.schedule}**. Deleting channel...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                await channel.delete();
              } else {
                await channel.send(`👋 <@${userId}> has left **${userClass.course} ${userClass.schedule}**.`);
              }
            }
          } catch (err) {
            console.error(`Error removing from ${userClass.course}:`, err.message);
          }
        }

        await interaction.editReply({
          content: `✅ Done! You've been removed from all **${classesToRemove.length} class(es)**. Good luck next semester! 🎓`,
          embeds: [],
          components: []
        });
      }
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.editReply({
          content: '⏰ Confirmation timed out. Your classes are unchanged.',
          embeds: [],
          components: []
        });
      }
    });
  }
};