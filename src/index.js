require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { checkAndResetStreaks } = require('./utils/streakManager');
const { COLLEGE_ROLES } = require('./constants/colleges');
const { readDB } = require('./utils/database');
const { applyClassChannelPermissions, classToChannelName } = require('./utils/channelManager');
const { getConfessionPostChannelId, getConfessionReviewChannelId } = require('./utils/guildConfig');
const { createPendingConfession, getConfessionById, updateConfession } = require('./utils/confessionManager');
const { CONFESSION_MODAL_ID, CONFESSION_INPUT_ID } = require('./commands/confess');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
  }
}

// Events
client.once('clientReady', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📦 Commands loaded: ${client.commands.size}`);

  // Auto-create college roles
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    console.log('🎓 Checking college roles...');
    for (const roleName of COLLEGE_ROLES) {
      const exists = guild.roles.cache.find(r => r.name === roleName);
      if (!exists) {
        await guild.roles.create({
          name: roleName,
          hoist: true,
          mentionable: false,
          permissions: [],
        });
        console.log(`✅ Created role: ${roleName}`);
      }
    }
    console.log('✅ College roles check complete!');

    console.log('🔒 Syncing class channel permissions...');
    await guild.channels.fetch().catch(() => {});
    const db = readDB();
    const seen = new Set();
    for (const user of Object.values(db)) {
      for (const c of user.classes) {
        const key = `${c.course}|||${c.schedule}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const channelName = classToChannelName(c.course, c.schedule);
        const ch = guild.channels.cache.find(x => x.type === 0 && x.name === channelName);
        if (ch) {
          try {
            await applyClassChannelPermissions(guild, ch, c.course, c.schedule);
          } catch (e) {
            console.error(`Permission sync ${channelName}:`, e.message);
          }
        }
      }
    }
    console.log('✅ Class channel permission sync complete!');
  }

  // Check and reset streaks every hour
  setInterval(() => {
    checkAndResetStreaks();
    console.log('✅ Streak check ran');
  }, 1000 * 60 * 60);
});

client.on('messageCreate', require('./events/messageCreate'));
client.on('guildMemberAdd', require('./events/guildMemberAdd'));
client.on('guildMemberRemove', require('./events/guildMemberRemove'));

async function handleConfessionModalSubmit(interaction) {
  if (interaction.customId !== CONFESSION_MODAL_ID) return;

  const reviewChannelId = getConfessionReviewChannelId();
  const postChannelId = getConfessionPostChannelId();
  if (!reviewChannelId || !postChannelId) {
    return interaction.reply({
      content: '⚠️ Confessions are not configured yet. Ask an admin to run `/admin configureconfessions`.',
      ephemeral: true,
    });
  }

  const content = interaction.fields.getTextInputValue(CONFESSION_INPUT_ID).trim();
  if (!content) {
    return interaction.reply({
      content: '⚠️ Please write something before submitting.',
      ephemeral: true,
    });
  }

  const guild = interaction.client.guilds.cache.get(interaction.guildId);
  const reviewChannel = guild.channels.cache.get(reviewChannelId) || await guild.channels.fetch(reviewChannelId).catch(() => null);
  if (!reviewChannel || !reviewChannel.isTextBased()) {
    return interaction.reply({
      content: '⚠️ Confession review channel is missing or invalid.',
      ephemeral: true,
    });
  }

  const confession = createPendingConfession({
    userId: interaction.user.id,
    username: interaction.user.tag,
    guildId: interaction.guildId,
    content,
  });

  const reviewEmbed = new EmbedBuilder()
    .setTitle('🕵️ New confession for review')
    .setColor(0xF1C40F)
    .setDescription(content)
    .addFields(
      { name: 'Sender', value: `${interaction.user.tag} (<@${interaction.user.id}>)` },
      { name: 'Confession ID', value: confession.id }
    )
    .setFooter({ text: `Sender ID ${interaction.user.id}` })
    .setTimestamp();

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`conf_approve:${confession.id}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`conf_reject:${confession.id}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger)
  );

  await reviewChannel.send({ embeds: [reviewEmbed], components: [actions] });

  return interaction.reply({
    content: '✅ Confession submitted anonymously. It is now waiting for admin approval.',
    ephemeral: true,
  });
}

async function handleConfessionReviewButton(interaction) {
  const isApprove = interaction.customId.startsWith('conf_approve:');
  const isReject = interaction.customId.startsWith('conf_reject:');
  if (!isApprove && !isReject) return;

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: '⚠️ Only admins can review confessions.', ephemeral: true });
  }

  const confessionId = interaction.customId.split(':')[1];
  const confession = getConfessionById(confessionId);
  if (!confession) {
    return interaction.reply({ content: '⚠️ Confession record not found.', ephemeral: true });
  }
  if (confession.status !== 'pending') {
    return interaction.reply({ content: `⚠️ This confession is already ${confession.status}.`, ephemeral: true });
  }

  const disabledActions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`conf_approve:${confessionId}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`conf_reject:${confessionId}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(true)
  );

  if (isApprove) {
    const postChannelId = getConfessionPostChannelId();
    const guild = interaction.client.guilds.cache.get(interaction.guildId);
    const postChannel = guild.channels.cache.get(postChannelId) || await guild.channels.fetch(postChannelId).catch(() => null);
    if (!postChannel || !postChannel.isTextBased()) {
      return interaction.reply({
        content: '⚠️ Confession post channel is missing or invalid. Configure it with `/admin configureconfessions`.',
        ephemeral: true,
      });
    }

    const publishedEmbed = new EmbedBuilder()
      .setTitle('📩 Anonymous Confession')
      .setDescription(confession.content)
      .setColor(0x5865F2)
      .setTimestamp();

    const postedMessage = await postChannel.send({ embeds: [publishedEmbed] });
    updateConfession(confessionId, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: interaction.user.id,
      postedMessageId: postedMessage.id,
    });

    const approvedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(0x57F287)
      .addFields({ name: 'Review result', value: `✅ Approved by ${interaction.user.tag}` });

    await interaction.update({ embeds: [approvedEmbed], components: [disabledActions] });
    return;
  }

  updateConfession(confessionId, {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewedBy: interaction.user.id,
  });

  const rejectedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0xED4245)
    .addFields({ name: 'Review result', value: `❌ Rejected by ${interaction.user.tag}` });

  await interaction.update({ embeds: [rejectedEmbed], components: [disabledActions] });
}

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleConfessionModalSubmit(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleConfessionReviewButton(interaction);
      return;
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'Something went wrong while handling that interaction!',
        ephemeral: true
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: 'Something went wrong while handling that interaction!',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);