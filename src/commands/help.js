const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, isMod } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  async execute(interaction) {
    const isHelper = isStaff(interaction.member);
    const isModerator = isMod(interaction.member);

    const embed = new EmbedBuilder()
      .setTitle('🎮 TDS Carry Bot - Help')
      .setColor(0x5865F2)
      .setDescription('Here are the available commands:');

    // Player commands
    embed.addFields({
      name: '👤 Player Commands',
      value: 
        '`/help` - Show this help message\n' +
        '*(Players create tickets using the dropdown in the ticket channel)*',
    });

    // Helper commands
    if (isHelper) {
      embed.addFields({
        name: '🛡️ Carry Helper Commands',
        value:
          '`/queue [mode]` - View waiting tickets\n' +
          '`/claim <ticket>` - Claim a ticket\n' +
          '`/compatible <ticket>` - Find tickets with overlapping availability\n' +
          '`/merge <target> <source>` - Merge two tickets\n' +
          '`/cohelper <@user>` - Add a co-helper to current ticket\n' +
          '`/complete [screenshot]` - Mark ticket as completed\n' +
          '`/close [reason]` - Close current ticket',
      });
    }

    // Mod commands
    if (isModerator) {
      embed.addFields({
        name: '⚙️ Moderator Commands',
        value:
          '`/session open` - Open a new carry session\n' +
          '`/session close` - Close the current session\n' +
          '`/session status` - View session statistics\n' +
          '`/setup` - Post the ticket panel (Admin only)',
      });
    }

    // Tips
    embed.addFields({
      name: '💡 Tips',
      value:
        '• Use `/compatible` to find players with matching availability\n' +
        '• Merge tickets to carry multiple players at once\n' +
        '• Add a co-helper if you need assistance\n' +
        '• Always post a screenshot when completing a carry',
    });

    embed.setFooter({ text: 'TDS Carry Bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
