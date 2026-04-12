const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const tips = [
  "Don't skip your 7AM classes. You'll regret it by midterms. 😅",
  "Make friends in every class — you'll need someone to borrow notes from.",
  "The library is your best friend during exam week. Claim your spot early!",
  "Sleep is not optional. A rested brain beats an all-nighter every time.",
  "Talk to your professors. They're more approachable than you think.",
  "Start your long exams early. Cramming the night before rarely works.",
  "Join at least one org. College is more than just grades.",
  "Keep a planner. Deadlines sneak up on you fast.",
  "Eat breakfast. Your brain needs fuel, especially for morning classes.",
  "It's okay to not know your life plan yet. Figure it out as you go.",
  "Back up your files. Losing a term paper the night before is a nightmare.",
  "Find your study spot early — cafe, library, or an empty classroom.",
  "Don't compare your grades to others. Run your own race.",
  "Ask for help early. Waiting until you're failing is too late.",
  "Take breaks. Burnout is real and it hits hard.",
  "Learn to say no. You can't do everything and that's okay.",
  "Make time for things you enjoy outside of school.",
  "Your mental health matters more than your GPA.",
  "Get to know your classmates. Your network starts now.",
  "Review your notes the same day you take them. It makes a huge difference."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('advice')
    .setDescription('Get a random piece of advice for surviving college 🎓'),

  async execute(interaction) {
    const tip = tips[Math.floor(Math.random() * tips.length)];

    const embed = new EmbedBuilder()
      .setTitle('💡 College Survival Tip')
      .setDescription(tip)
      .setColor(0x57F287)
      .setFooter({ text: 'You got this! 💪' });

    await interaction.reply({ embeds: [embed] });
  }
};