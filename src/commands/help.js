const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const pages = [
  {
    title: '📚 Class Management',
    fields: [
      {
        name: '/addclass <course> <schedule>',
        value: 'Add a class to your list. Automatically creates a private class channel where only classmates can see it.\n**Example:** `/addclass Math 21 TWHFX-1`'
      },
      {
        name: '/removeclass <course> <schedule>',
        value: 'Remove a class from your list. If no students remain in that class, the channel is automatically deleted.\n**Example:** `/removeclass Math 21 TWHFX-1`'
      },
      {
        name: '/myclasses',
        value: 'View all your currently registered classes in a neat list.'
      },
      {
        name: '/clearclasses',
        value: 'Remove yourself from all your classes at once. Great for when the semester ends! You will be asked to confirm before anything is cleared.'
      }
    ]
  },
  {
    title: '👥 Classmate Finder',
    fields: [
      {
        name: '/findclassmate',
        value: 'Show all your classmates across all your registered classes, grouped by class.'
      },
      {
        name: '/findclassmate <class>',
        value: 'Show classmates in a specific class.\n**Example:** `/findclassmate Math 21 TWHFX-1`'
      },
      {
        name: '/findcourse <course>',
        value: 'Show all students taking a course regardless of their schedule, grouped by section.\n**Example:** `/findcourse Math 21`'
      },
      {
        name: '/commonclasses <user>',
        value: 'See which classes you and another student have in common.\n**Example:** `/commonclasses @john_doe`'
      }
    ]
  },
  {
    title: '🎲 Study Buddy & Resources',
    fields: [
      {
        name: '/findstudybuddy',
        value: 'Randomly get matched with a study buddy from any of your classes.'
      },
      {
        name: '/findstudybuddy <class>',
        value: 'Randomly get matched with a study buddy from a specific class you are in.\n**Example:** `/findstudybuddy Math 21 TWHFX-1`'
      },
      {
        name: '/resources add <course> <title> <link>',
        value: 'Add a study resource for a course. Resources are shared across all sections of the same course.\n**Example:** `/resources add Math 21 Math 21 Reviewer https://drive.google.com/...`'
      },
      {
        name: '/resources list <course>',
        value: 'Browse all study resources shared for a course.\n**Example:** `/resources list Math 21`'
      }
    ]
  },
  {
    title: '🔥 Streaks & Misc',
    fields: [
      {
        name: '/streak info <course> <schedule>',
        value: 'View the current streak and how many students have messaged today for a specific class channel. At least 3 different students must message daily to maintain a streak.\n**Example:** `/streak info Math 21 TWHFX-1`'
      },
      {
        name: '/streak leaderboard',
        value: 'View the top 10 class channels ranked by their current streak.'
      },
      {
        name: '/advice',
        value: 'Get a random college survival tip. 💡'
      },
      {
        name: '/help',
        value: 'Show this help menu.'
      }
    ]
  }
];

function buildEmbed(page, index) {
  const embed = new EmbedBuilder()
    .setTitle(page.title)
    .setColor(0x5865F2)
    .setFooter({ text: `Page ${index + 1} of ${pages.length}` });

  for (const field of page.fields) {
    embed.addFields({ name: field.name, value: field.value });
  }

  return embed;
}

function buildButtons(index) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('help_prev')
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId('help_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === pages.length - 1)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),

  async execute(interaction) {
    let currentPage = 0;

    const embed = buildEmbed(pages[currentPage], currentPage);
    const buttons = buildButtons(currentPage);

    const reply = await interaction.reply({
      embeds: [embed],
      components: [buttons],
      fetchReply: true
    });

    const collector = reply.createMessageComponentCollector({
      time: 5 * 60 * 1000
    });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({
          content: '⚠️ Only the person who ran this command can navigate the pages!',
          ephemeral: true
        });
      }

      if (btn.customId === 'help_prev') currentPage--;
      if (btn.customId === 'help_next') currentPage++;

      await btn.update({
        embeds: [buildEmbed(pages[currentPage], currentPage)],
        components: [buildButtons(currentPage)]
      });
    });

    collector.on('end', async () => {
      const disabledButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('help_prev')
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('help_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await interaction.editReply({ components: [disabledButtons] }).catch(() => {});
    });
  }
};