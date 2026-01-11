const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for closing')
        .setRequired(false)
        .setMaxLength(200)
    ),

  async execute(interaction) {
    // Get ticket from current channel
    const ticket = db.ticket.getByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '❌ This command must be used in a ticket channel.',
        ephemeral: true,
      });
    }

    // Check permissions - staff can always close, player can close their own
    const isOwner = ticket.discord_user_id === interaction.user.id;
    if (!isStaff(interaction.member) && !isOwner) {
      return interaction.reply({
        content: '❌ You cannot close this ticket.',
        ephemeral: true,
      });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Close the ticket
    db.ticket.close(ticket.id, reason);

    await interaction.reply({
      content: `🔒 **Ticket #${ticket.id} closed**\n**Reason:** ${reason}\n\nThis channel will be deleted in 10 seconds...`,
    });

    // Delete channel after delay
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (error) {
        console.error('Failed to delete ticket channel:', error);
      }
    }, 10000);
  },
};
