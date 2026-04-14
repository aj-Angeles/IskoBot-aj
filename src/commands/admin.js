const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getUser, saveUser, updateUser, readDB, writeDB, getClassmatesByClass } = require('../utils/database');
const { getResources } = require('../utils/resourceManager');
const { COLLEGE_ROLES, collegeChoices } = require('../constants/colleges');
const {
  setReportPingRoleId,
  setReportChannelId,
  getReportPingRoleId,
  getReportChannelId,
  getConfessionReviewChannelId,
  setConfessionReviewChannelId,
  getConfessionPostChannelId,
  setConfessionPostChannelId
} = require('../utils/guildConfig');
const { getOrCreateClassChannel, applyClassChannelPermissions } = require('../utils/channelManager');
const { getAllStreaks } = require('../utils/streakManager');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

function normalizeCourse(course) {
  return course
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function confirmAction(interaction, description, onConfirm) {
  const embed = new EmbedBuilder()
    .setTitle('⚠️ Confirm Action')
    .setDescription(description)
    .setColor(0xFF0000);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_confirm')
      .setLabel('Yes, confirm')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('admin_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
  );

  const reply = await interaction.editReply({
    embeds: [embed],
    components: [buttons]
  });

  const collector = reply.createMessageComponentCollector({ time: 30 * 1000 });

  collector.on('collect', async (btn) => {
    if (btn.user.id !== interaction.user.id) {
      return btn.reply({ content: '⚠️ This is not your confirmation!', ephemeral: true });
    }

    if (btn.customId === 'admin_cancel') {
      return btn.update({ content: '✅ Cancelled. No changes were made.', embeds: [], components: [] });
    }

    if (btn.customId === 'admin_confirm') {
      await btn.update({ content: '⏳ Processing...', embeds: [], components: [] });
      await onConfirm();
    }
  });

  collector.on('end', (collected) => {
    if (collected.size === 0) {
      interaction.editReply({ content: '⏰ Confirmation timed out. No changes were made.', embeds: [], components: [] });
    }
  });
}

const roleChoices = COLLEGE_ROLES.map(r => ({ name: r, value: r }));
roleChoices.push({
  name: 'Iskolar ng Bayan',
  value: 'Iskolar ng Bayan'
});

const DEMOGRAPHIC_ENV = [
  { env: 'DEMOGRAPHIC_HE_HIM_ROLE_ID', label: 'He/Him' },
  { env: 'DEMOGRAPHIC_SHE_HER_ROLE_ID', label: 'She/Her' },
  { env: 'DEMOGRAPHIC_THEY_THEM_ROLE_ID', label: 'They/Them' },
  { env: 'DEMOGRAPHIC_ANY_ROLE_ID', label: 'Any' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin only commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub.setName('addclass')
        .setDescription('Add a class to a user')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(o => o.setName('course').setDescription('Course name e.g. Math 21').setRequired(true))
        .addStringOption(o => o.setName('schedule').setDescription('Schedule e.g. TWHFX-1').setRequired(true)))

    .addSubcommand(sub =>
      sub.setName('removeclass')
        .setDescription('Remove a class from a user')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(o => o.setName('course').setDescription('Course name e.g. Math 21').setRequired(true))
        .addStringOption(o => o.setName('schedule').setDescription('Schedule e.g. TWHFX-1').setRequired(true)))

    .addSubcommand(sub =>
      sub.setName('clearclasses')
        .setDescription('Clear all classes from a user')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)))

    .addSubcommand(sub =>
      sub.setName('removeuser')
        .setDescription('Completely erase a user from the system')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)))

    .addSubcommand(sub =>
      sub.setName('removeresource')
        .setDescription('Remove a specific resource from a course')
        .addStringOption(o => o.setName('course').setDescription('Course name e.g. Math 21').setRequired(true))
        .addIntegerOption(o => o.setName('number').setDescription('Resource number from /resources list').setRequired(true)))

    .addSubcommand(sub =>
      sub.setName('clearresources')
        .setDescription('Wipe all resources for a course')
        .addStringOption(o => o.setName('course').setDescription('Course name e.g. Math 21').setRequired(true)))

    .addSubcommand(sub =>
      sub.setName('wipedata')
        .setDescription('Wipe bot data')
        .addStringOption(o =>
          o.setName('target')
            .setDescription('What to wipe')
            .setRequired(true)
            .addChoices(
              { name: '⚠️ All Data', value: 'all' },
              { name: 'Users', value: 'users' },
              { name: 'Streaks', value: 'streaks' },
              { name: 'Resources', value: 'resources' },
              { name: 'FAQs', value: 'faqs' }
            )))

    .addSubcommand(sub =>
      sub.setName('addrole')
        .setDescription('Add a college role to a user')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(o =>
          o.setName('role')
            .setDescription('College role to assign')
            .setRequired(true)
            .addChoices(...roleChoices)))

    .addSubcommand(sub =>
      sub.setName('removerole')
        .setDescription('Remove a college role from a user')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(o =>
          o.setName('role')
            .setDescription('College role to remove')
            .setRequired(true)
            .addChoices(...roleChoices)))

    .addSubcommand(sub =>
      sub.setName('collegeinfo')
        .setDescription('College student counts (admin)')
        .addStringOption(o =>
          o.setName('college')
            .setDescription('Specific college (optional)')
            .setRequired(false)
            .addChoices(...collegeChoices)))

    .addSubcommand(sub =>
      sub.setName('serverstats')
        .setDescription('Extended server stats and demographics'))

    .addSubcommand(sub =>
      sub.setName('rolelist')
        .setDescription('List members with a role')
        .addRoleOption(o => o.setName('role').setDescription('Role to list').setRequired(true)))

    .addSubcommand(sub =>
      sub.setName('configurereports')
        .setDescription('Set or view where /report posts and which role is pinged')
        .addChannelOption(o =>
          o.setName('channel')
            .setDescription('Channel for incoming /report messages')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false))
        .addRoleOption(o =>
          o.setName('role')
            .setDescription('Role to ping on new reports')
            .setRequired(false))
        .addBooleanOption(o =>
          o.setName('clear_channel')
            .setDescription('Remove the configured report channel')
            .setRequired(false))
        .addBooleanOption(o =>
          o.setName('clear_role')
            .setDescription('Remove the report ping role')
            .setRequired(false)))

    .addSubcommand(sub =>
      sub.setName('configureconfessions')
        .setDescription('Set or view confession review/post channels')
        .addChannelOption(o =>
          o.setName('review_channel')
            .setDescription('Admin-only channel where confessions are reviewed')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false))
        .addChannelOption(o =>
          o.setName('post_channel')
            .setDescription('Public channel where approved confessions are posted')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false))
        .addBooleanOption(o =>
          o.setName('clear_review_channel')
            .setDescription('Remove the configured confession review channel')
            .setRequired(false))
        .addBooleanOption(o =>
          o.setName('clear_post_channel')
            .setDescription('Remove the configured confession post channel')
            .setRequired(false))),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const guild = interaction.client.guilds.cache.get(process.env.GUILD_ID);

    // ========================
    // /admin collegeinfo
    // ========================
    if (sub === 'collegeinfo') {
      const selectedCollege = interaction.options.getString('college');

      if (selectedCollege) {
        const role = guild.roles.cache.find(r => r.name === selectedCollege);

        if (!role) {
          return interaction.editReply({
            content: `⚠️ No role found for **${selectedCollege}**. Make sure the role exists in the server!`,
          });
        }

        const members = role.members;
        const memberList = members.size > 0
          ? members.map(m => `• <@${m.id}> (${m.user.username})`).join('\n')
          : 'No students registered yet';

        const embed = new EmbedBuilder()
          .setTitle(`🎓 ${selectedCollege}`)
          .addFields(
            { name: '👥 Total Students', value: `${members.size}`, inline: true },
            { name: '📋 Student List', value: memberList }
          )
          .setColor(0x5865F2)
          .setFooter({ text: 'Iskord Community Server' });

        return interaction.editReply({ embeds: [embed] });
      }

      const counts = [];

      for (const collegeName of COLLEGE_ROLES) {
        const role = guild.roles.cache.find(r => r.name === collegeName);
        counts.push({ name: collegeName, count: role ? role.members.size : 0 });
      }

      counts.sort((a, b) => b.count - a.count);

      const list = counts
        .map(c => `• **${c.name}** — ${c.count} student(s)`)
        .join('\n');

      const total = counts.reduce((acc, c) => acc + c.count, 0);

      const embed = new EmbedBuilder()
        .setTitle('🎓 College Breakdown')
        .setDescription(list)
        .addFields({ name: '👥 Total Students with College Roles', value: `${total}` })
        .setColor(0x5865F2)
        .setFooter({ text: 'Iskord Community Server' });

      return interaction.editReply({ embeds: [embed] });
    }

    // ========================
    // /admin serverstats
    // ========================
    if (sub === 'serverstats') {
      await guild.members.fetch().catch(() => {});
      const db = readDB();
      const streaks = getAllStreaks();

      const uniqueClasses = new Set();
      for (const user of Object.values(db)) {
        for (const c of user.classes) {
          uniqueClasses.add(`${c.course} ${c.schedule}`);
        }
      }

      const courseCounts = {};
      for (const user of Object.values(db)) {
        for (const c of user.classes) {
          courseCounts[c.course] = (courseCounts[c.course] || 0) + 1;
        }
      }
      const topCourses = Object.entries(courseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([course, count], i) => `${i + 1}. **${course}** — ${count} student(s)`)
        .join('\n') || 'No courses yet';

      const activeStreaks = Object.values(streaks).filter(s => s.streak > 0).length;

      const demoLines = [];
      for (const { env: envKey, label } of DEMOGRAPHIC_ENV) {
        const id = process.env[envKey];
        if (!id) {
          demoLines.push(`**${label}:** not configured`);
          continue;
        }
        const role = guild.roles.cache.get(id) || await guild.roles.fetch(id).catch(() => null);
        if (!role) {
          demoLines.push(`**${label}:** invalid role id`);
          continue;
        }
        demoLines.push(`**${label}:** ${role.members.size}`);
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Server statistics (admin)')
        .addFields(
          { name: '👥 Server members', value: `${guild.memberCount}`, inline: true },
          { name: '📚 Bot-registered users', value: `${Object.keys(db).length}`, inline: true },
          { name: '📚 Unique classes', value: `${uniqueClasses.size}`, inline: true },
          { name: '🔥 Active streaks', value: `${activeStreaks}`, inline: true },
          { name: '🏆 Most popular courses', value: topCourses },
          { name: '📣 Demographics (role counts)', value: demoLines.join('\n') }
        )
        .setColor(0x5865F2)
        .setFooter({ text: 'Users with multiple pronoun roles are counted in each bucket.' });

      return interaction.editReply({ embeds: [embed] });
    }

    // ========================
    // /admin rolelist
    // ========================
    if (sub === 'rolelist') {
      const role = interaction.options.getRole('role', true);
      await guild.members.fetch().catch(() => {});
      const list = role.members.map(m => `${m.user.tag} (<@${m.id}>)`);
      if (list.length === 0) {
        return interaction.editReply({ content: `**${role.name}** has no members.` });
      }
      const chunks = [];
      let buf = '';
      for (const line of list) {
        const next = buf ? `${buf}\n${line}` : line;
        if (next.length > 1900) {
          chunks.push(buf);
          buf = line;
        } else {
          buf = next;
        }
      }
      if (buf) chunks.push(buf);

      await interaction.editReply({
        content: `**${role.name}** — ${role.members.size} member(s)\n\n${chunks[0]}`,
      });
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i], ephemeral: true });
      }
      return;
    }

    // ========================
    // /admin configurereports
    // ========================
    if (sub === 'configurereports') {
      const channelOpt = interaction.options.getChannel('channel');
      const roleOpt = interaction.options.getRole('role');
      const clearChannel = interaction.options.getBoolean('clear_channel') === true;
      const clearRole = interaction.options.getBoolean('clear_role') === true;

      if (clearChannel && channelOpt) {
        return interaction.editReply({ content: '⚠️ Use either **clear_channel** or **channel**, not both.' });
      }
      if (clearRole && roleOpt) {
        return interaction.editReply({ content: '⚠️ Use either **clear_role** or **role**, not both.' });
      }

      const doAnything = channelOpt || roleOpt || clearChannel || clearRole;

      if (!doAnything) {
        const storedCh = getReportChannelId();
        const envCh = process.env.REPORT_CHANNEL_ID || null;
        const effectiveCh = storedCh || envCh;
        const roleId = getReportPingRoleId();

        let channelLine = '— not set';
        if (effectiveCh) {
          const ch = guild.channels.cache.get(effectiveCh) || await guild.channels.fetch(effectiveCh).catch(() => null);
          channelLine = ch
            ? `${ch} (\`${effectiveCh}\`)${storedCh ? '' : ' · *from REPORT_CHANNEL_ID*'}`
            : `invalid/missing channel (\`${effectiveCh}\`)${storedCh ? '' : ' · *from REPORT_CHANNEL_ID*'}`;
        }

        let roleLine = '— not set';
        if (roleId) {
          const rl = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
          roleLine = rl ? `${rl} (\`${roleId}\`)` : `invalid/missing role (\`${roleId}\`)`;
        }

        const embed = new EmbedBuilder()
          .setTitle('📋 Report settings')
          .addFields(
            { name: 'Channel', value: channelLine, inline: false },
            { name: 'Ping role', value: roleLine, inline: false }
          )
          .setColor(0x5865F2)
          .setFooter({ text: 'Set channel/role options, or use clear_channel / clear_role.' });

        return interaction.editReply({ embeds: [embed] });
      }

      const lines = [];
      if (clearChannel) {
        setReportChannelId(null);
        lines.push('✅ Report channel cleared from bot config.');
      } else if (channelOpt) {
        if (!channelOpt.isTextBased()) {
          return interaction.editReply({ content: '⚠️ Choose a text-based channel.' });
        }
        setReportChannelId(channelOpt.id);
        lines.push(`✅ Report channel set to ${channelOpt} (\`${channelOpt.id}\`).`);
      }

      if (clearRole) {
        setReportPingRoleId(null);
        lines.push('✅ Report ping role cleared.');
      } else if (roleOpt) {
        setReportPingRoleId(roleOpt.id);
        lines.push(`✅ Reports will ping **${roleOpt.name}** (\`${roleOpt.id}\`).`);
      }

      return interaction.editReply({ content: lines.join('\n') });
    }

    // ========================
    // /admin configureconfessions
    // ========================
    if (sub === 'configureconfessions') {
      const reviewChannelOpt = interaction.options.getChannel('review_channel');
      const postChannelOpt = interaction.options.getChannel('post_channel');
      const clearReviewChannel = interaction.options.getBoolean('clear_review_channel') === true;
      const clearPostChannel = interaction.options.getBoolean('clear_post_channel') === true;

      if (clearReviewChannel && reviewChannelOpt) {
        return interaction.editReply({ content: '⚠️ Use either **clear_review_channel** or **review_channel**, not both.' });
      }
      if (clearPostChannel && postChannelOpt) {
        return interaction.editReply({ content: '⚠️ Use either **clear_post_channel** or **post_channel**, not both.' });
      }

      const doAnything = reviewChannelOpt || postChannelOpt || clearReviewChannel || clearPostChannel;
      if (!doAnything) {
        const reviewChannelId = getConfessionReviewChannelId();
        const postChannelId = getConfessionPostChannelId();

        let reviewLine = '— not set';
        if (reviewChannelId) {
          const ch = guild.channels.cache.get(reviewChannelId) || await guild.channels.fetch(reviewChannelId).catch(() => null);
          reviewLine = ch ? `${ch} (\`${reviewChannelId}\`)` : `invalid/missing channel (\`${reviewChannelId}\`)`;
        }

        let postLine = '— not set';
        if (postChannelId) {
          const ch = guild.channels.cache.get(postChannelId) || await guild.channels.fetch(postChannelId).catch(() => null);
          postLine = ch ? `${ch} (\`${postChannelId}\`)` : `invalid/missing channel (\`${postChannelId}\`)`;
        }

        const embed = new EmbedBuilder()
          .setTitle('🕵️ Confession settings')
          .addFields(
            { name: 'Review channel (admins)', value: reviewLine, inline: false },
            { name: 'Post channel (public)', value: postLine, inline: false }
          )
          .setColor(0x5865F2)
          .setFooter({ text: 'Set channels or use clear_review_channel / clear_post_channel.' });

        return interaction.editReply({ embeds: [embed] });
      }

      const lines = [];
      if (clearReviewChannel) {
        setConfessionReviewChannelId(null);
        lines.push('✅ Confession review channel cleared.');
      } else if (reviewChannelOpt) {
        if (!reviewChannelOpt.isTextBased()) {
          return interaction.editReply({ content: '⚠️ Choose a text-based review channel.' });
        }
        setConfessionReviewChannelId(reviewChannelOpt.id);
        lines.push(`✅ Confession review channel set to ${reviewChannelOpt} (\`${reviewChannelOpt.id}\`).`);
      }

      if (clearPostChannel) {
        setConfessionPostChannelId(null);
        lines.push('✅ Confession post channel cleared.');
      } else if (postChannelOpt) {
        if (!postChannelOpt.isTextBased()) {
          return interaction.editReply({ content: '⚠️ Choose a text-based post channel.' });
        }
        setConfessionPostChannelId(postChannelOpt.id);
        lines.push(`✅ Confession post channel set to ${postChannelOpt} (\`${postChannelOpt.id}\`).`);
      }

      return interaction.editReply({ content: lines.join('\n') });
    }

    // ========================
    // /admin addclass
    // ========================
    if (sub === 'addclass') {
      const target = interaction.options.getUser('user');
      const course = normalizeCourse(interaction.options.getString('course').trim());
      const schedule = interaction.options.getString('schedule').trim().toUpperCase();

      saveUser(target.id, target.username);
      const user = getUser(target.id);

      const alreadyAdded = user.classes.some(c => c.course === course && c.schedule === schedule);
      if (alreadyAdded) {
        return interaction.editReply({ content: `⚠️ **${target.username}** is already in **${course} ${schedule}**!` });
      }

      const existingClassmates = getClassmatesByClass(course, schedule);
      user.classes.push({ course, schedule });
      updateUser(target.id, user);

      await interaction.editReply({ content: `✅ Added **${course} ${schedule}** to **${target.username}**'s classes!` });

      try {
        await guild.channels.fetch().catch(() => {});
        const channel = await getOrCreateClassChannel(guild, course, schedule);

        if (existingClassmates.length > 0) {
          await channel.send(`@here 👋 Welcome <@${target.id}> to **${course} ${schedule}**! Say hi to your new classmate!`);
        } else {
          await channel.send(`🎉 <@${target.id}> is the first to register **${course} ${schedule}**! More classmates will show up soon.`);
        }
      } catch (err) {
        console.error('Channel error:', err.message);
      }
    }

    // ========================
    // /admin removeclass
    // ========================
    if (sub === 'removeclass') {
      const target = interaction.options.getUser('user');
      const course = normalizeCourse(interaction.options.getString('course').trim());
      const schedule = interaction.options.getString('schedule').trim().toUpperCase();
      const user = getUser(target.id);

      if (!user) return interaction.editReply({ content: `⚠️ **${target.username}** is not registered in the system!` });

      const index = user.classes.findIndex(c => c.course === course && c.schedule === schedule);
      if (index === -1) return interaction.editReply({ content: `⚠️ **${target.username}** is not in **${course} ${schedule}**!` });

      user.classes.splice(index, 1);
      updateUser(target.id, user);

      await interaction.editReply({ content: `✅ Removed **${course} ${schedule}** from **${target.username}**'s classes!` });

      try {
        const channelName = `${course}-${schedule}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const channel = guild.channels.cache.find(c => c.type === 0 && c.name === channelName);

        if (channel) {
          const remaining = getClassmatesByClass(course, schedule);
          if (remaining.length === 0) {
            await channel.send(`👋 <@${target.id}> was removed. No more students in **${course} ${schedule}**. Deleting channel...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await channel.delete();
          } else {
            await applyClassChannelPermissions(guild, channel, course, schedule);
            await channel.send(`👋 <@${target.id}> was removed from **${course} ${schedule}** by an admin.`);
          }
        }
      } catch (err) {
        console.error('Channel error:', err.message);
      }
    }

    // ========================
    // /admin clearclasses
    // ========================
    if (sub === 'clearclasses') {
      const target = interaction.options.getUser('user');
      const user = getUser(target.id);

      if (!user || user.classes.length === 0) {
        return interaction.editReply({ content: `⚠️ **${target.username}** has no classes registered!` });
      }

      await confirmAction(
        interaction,
        `You are about to clear all **${user.classes.length} class(es)** from **${target.username}**. This cannot be undone.`,
        async () => {
          const classesToRemove = [...user.classes];
          user.classes = [];
          updateUser(target.id, user);

          for (const userClass of classesToRemove) {
            try {
              const channelName = `${userClass.course}-${userClass.schedule}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              const channel = guild.channels.cache.find(c => c.type === 0 && c.name === channelName);
              if (channel) {
                const remaining = getClassmatesByClass(userClass.course, userClass.schedule);
                if (remaining.length === 0) {
                  await channel.send(`👋 <@${target.id}> was removed. No more students in **${userClass.course} ${userClass.schedule}**. Deleting channel...`);
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  await channel.delete();
                } else {
                  await applyClassChannelPermissions(guild, channel, userClass.course, userClass.schedule);
                  await channel.send(`👋 <@${target.id}> was removed from **${userClass.course} ${userClass.schedule}** by an admin.`);
                }
              }
            } catch (err) {
              console.error('Channel error:', err.message);
            }
          }

          await interaction.editReply({ content: `✅ Cleared all classes from **${target.username}**!`, embeds: [], components: [] });
        }
      );
    }

    // ========================
    // /admin removeuser
    // ========================
    if (sub === 'removeuser') {
      const target = interaction.options.getUser('user');
      const user = getUser(target.id);

      if (!user) return interaction.editReply({ content: `⚠️ **${target.username}** is not registered in the system!` });

      await confirmAction(
        interaction,
        `You are about to completely erase **${target.username}** from the system including all their classes. This cannot be undone.`,
        async () => {
          const classesToRemove = [...user.classes];

          const db = readDB();
          delete db[target.id];
          writeDB(db);

          for (const userClass of classesToRemove) {
            try {
              const channelName = `${userClass.course}-${userClass.schedule}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              const channel = guild.channels.cache.find(c => c.type === 0 && c.name === channelName);
              if (channel) {
                const remaining = getClassmatesByClass(userClass.course, userClass.schedule);
                if (remaining.length === 0) {
                  await channel.send(`👋 <@${target.id}> was removed. No more students in **${userClass.course} ${userClass.schedule}**. Deleting channel...`);
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  await channel.delete();
                } else {
                  await applyClassChannelPermissions(guild, channel, userClass.course, userClass.schedule);
                  await channel.send(`👋 <@${target.id}> was removed from **${userClass.course} ${userClass.schedule}** by an admin.`);
                }
              }
            } catch (err) {
              console.error('Channel error:', err.message);
            }
          }

          await interaction.editReply({ content: `✅ **${target.username}** has been completely removed from the system!`, embeds: [], components: [] });
        }
      );
    }

    // ========================
    // /admin removeresource
    // ========================
    if (sub === 'removeresource') {
      const course = normalizeCourse(interaction.options.getString('course').trim());
      const number = interaction.options.getInteger('number');
      const resources = getResources(course);

      if (resources.length === 0) return interaction.editReply({ content: `⚠️ No resources found for **${course}**!` });
      if (number < 1 || number > resources.length) {
        return interaction.editReply({ content: `⚠️ Invalid number. **${course}** has ${resources.length} resource(s). Pick a number between 1 and ${resources.length}.` });
      }

      const removed = resources[number - 1];
      resources.splice(number - 1, 1);

      const { readResources, writeResources } = require('../utils/resourceManager');
      const all = readResources();
      all[course] = resources;
      writeResources(all);

      return interaction.editReply({ content: `✅ Removed resource **"${removed.title}"** from **${course}**!` });
    }

    // ========================
    // /admin clearresources
    // ========================
    if (sub === 'clearresources') {
      const course = normalizeCourse(interaction.options.getString('course').trim());
      const resources = getResources(course);

      if (resources.length === 0) return interaction.editReply({ content: `⚠️ No resources found for **${course}**!` });

      await confirmAction(
        interaction,
        `You are about to wipe all **${resources.length} resource(s)** for **${course}**. This cannot be undone.`,
        async () => {
          const { readResources, writeResources } = require('../utils/resourceManager');
          const all = readResources();
          delete all[course];
          writeResources(all);

          await interaction.editReply({ content: `✅ Cleared all resources for **${course}**!`, embeds: [], components: [] });
        }
      );
    }

    // ========================
    // /admin wipedata
    // ========================
    if (sub === 'wipedata') {
      const target = interaction.options.getString('target');

      const dataTargets = {
        users: { file: 'users.json', empty: '{}', label: 'Users' },
        streaks: { file: 'streaks.json', empty: '{}', label: 'Streaks' },
        resources: { file: 'resources.json', empty: '{}', label: 'Resources' },
        faqs: { file: 'faqs.json', empty: '[]', label: 'FAQs' }
      };

      const targetLabel = target === 'all' ? '⚠️ ALL DATA' : dataTargets[target].label;

      await confirmAction(
        interaction,
        `You are about to wipe **${targetLabel}**. This is **irreversible**.`,
        async () => {
          if (target === 'all') {
            for (const [, info] of Object.entries(dataTargets)) {
              fs.writeFileSync(path.join(dataDir, info.file), info.empty);
            }
          } else {
            const info = dataTargets[target];
            fs.writeFileSync(path.join(dataDir, info.file), info.empty);
          }

          await interaction.editReply({ content: `✅ **${targetLabel}** has been wiped successfully!`, embeds: [], components: [] });
        }
      );
    }

    // ========================
    // /admin addrole
    // ========================
    if (sub === 'addrole') {
      const target = interaction.options.getUser('user');
      const roleName = interaction.options.getString('role');

      let member = guild.members.cache.get(target.id);
      if (!member) member = await guild.members.fetch(target.id).catch(() => null);

      if (!member) return interaction.editReply({ content: `⚠️ Could not find **${target.username}** in the server!` });

      const role = guild.roles.cache.find(r => r.name === roleName);
      if (!role) return interaction.editReply({ content: `⚠️ Role **${roleName}** does not exist! Try restarting the bot to auto-create roles.` });

      if (member.roles.cache.has(role.id)) {
        return interaction.editReply({ content: `⚠️ **${target.username}** already has the **${roleName}** role!` });
      }

      await member.roles.add(role);
      return interaction.editReply({ content: `✅ Added **${roleName}** to **${target.username}**!` });
    }

    // ========================
    // /admin removerole
    // ========================
    if (sub === 'removerole') {
      const target = interaction.options.getUser('user');
      const roleName = interaction.options.getString('role');

      let member = guild.members.cache.get(target.id);
      if (!member) member = await guild.members.fetch(target.id).catch(() => null);

      if (!member) return interaction.editReply({ content: `⚠️ Could not find **${target.username}** in the server!` });

      const role = guild.roles.cache.find(r => r.name === roleName);
      if (!role) return interaction.editReply({ content: `⚠️ Role **${roleName}** does not exist!` });

      if (!member.roles.cache.has(role.id)) {
        return interaction.editReply({ content: `⚠️ **${target.username}** does not have the **${roleName}** role!` });
      }

      await member.roles.remove(role);
      return interaction.editReply({ content: `✅ Removed **${roleName}** from **${target.username}**!` });
    }
  }
};