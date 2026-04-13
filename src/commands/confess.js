const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getConfessionPostChannelId, getConfessionReviewChannelId } = require('../utils/guildConfig');

const CONFESSION_MODAL_ID = 'confession_modal';
const CONFESSION_INPUT_ID = 'confession_input';

module.exports = {
  CONFESSION_MODAL_ID,
  CONFESSION_INPUT_ID,
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Send an anonymous confession for admin review'),

  async execute(interaction) {
    const reviewChannelId = getConfessionReviewChannelId();
    const postChannelId = getConfessionPostChannelId();

    if (!reviewChannelId || !postChannelId) {
      return interaction.reply({
        content: '⚠️ Confessions are not configured yet. Ask an admin to run `/admin configureconfessions`.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(CONFESSION_MODAL_ID)
      .setTitle('Anonymous Confession');

    const input = new TextInputBuilder()
      .setCustomId(CONFESSION_INPUT_ID)
      .setLabel('Write your confession')
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(5)
      .setMaxLength(1500)
      .setPlaceholder('Type your confession here...')
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    return interaction.showModal(modal);
  },
};
