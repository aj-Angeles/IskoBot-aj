require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { checkAndResetStreaks } = require('./utils/streakManager');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

const COLLEGE_ROLES = [
  'College of Architecture',
  'College of Arts and Letters',
  'College of Education',
  'College of Engineering',
  'College of Fine Arts',
  'College of Home Economics',
  'College of Human Kinetics',
  'College of Law',
  'College of Media and Communication',
  'College of Music',
  'College of Science',
  'College of Social Sciences and Philosophy',
  'National College of Public Administration and Governance',
  'School of Economics',
  'School of Library and Information Studies',
  'School of Statistics',
];

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

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    if (interaction.deferred) {
      await interaction.editReply({
        content: 'Something went wrong while executing that command!',
      });
    } else {
      await interaction.reply({
        content: 'Something went wrong while executing that command!',
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);