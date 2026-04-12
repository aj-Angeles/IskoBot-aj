const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getResources, addResource } = require('../utils/resourceManager');

function normalizeCourse(course) {
  return course
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resources')
    .setDescription('Share and browse study resources per course')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a resource for a course')
        .addStringOption(option =>
          option.setName('course')
            .setDescription('Course name e.g. Math 21')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the resource e.g. Math 21 Reviewer')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('link')
            .setDescription('Link to the resource')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all resources for a course')
        .addStringOption(option =>
          option.setName('course')
            .setDescription('Course name e.g. Math 21')
            .setRequired(true))),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const course = normalizeCourse(interaction.options.getString('course').trim());

    if (subcommand === 'add') {
      await interaction.deferReply({ ephemeral: true });

      const title = interaction.options.getString('title').trim();
      const link = interaction.options.getString('link').trim();

      // Validate link
      try {
        new URL(link);
      } catch {
        return interaction.editReply({
          content: `⚠️ Please provide a valid URL starting with http:// or https://`,
        });
      }

      addResource(course, title, link, interaction.user.username);

      const embed = new EmbedBuilder()
        .setTitle('📎 Resource Added!')
        .addFields(
          { name: '📖 Course', value: course, inline: true },
          { name: '📄 Title', value: title, inline: true },
          { name: '🔗 Link', value: link }
        )
        .setColor(0x57F287)
        .setFooter({ text: `Added by ${interaction.user.username}` });

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'list') {
      await interaction.deferReply();

      const resources = getResources(course);

      if (resources.length === 0) {
        return interaction.editReply({
          content: `😔 No resources found for **${course}** yet. Be the first to add one with **/resources add**!`,
        });
      }

      const list = resources.map((r, i) =>
        `**${i + 1}. [${r.title}](${r.link})**\nAdded by ${r.addedBy} on ${r.addedAt}`
      ).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle(`📚 Resources for ${course}`)
        .setDescription(list)
        .setColor(0x5865F2)
        .setFooter({ text: `${resources.length} resource(s) found` });

      return interaction.editReply({ embeds: [embed] });
    }
  }
};