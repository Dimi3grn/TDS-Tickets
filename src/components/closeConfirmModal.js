const db = require('../database');

module.exports = {
  async execute(interaction, args) {
    const ticketId = parseInt(args[0]);
    const reason = interaction.fields.getTextInputValue('reason')?.trim() || 'No reason provided';

    // Get ticket
    const ticket = db.ticket.getById(ticketId);
    if (!ticket) {
      return interaction.reply({
        content: '❌ Ticket not found.',
        ephemeral: true,
      });
    }

    // Close the ticket
    db.ticket.close(ticketId, reason);

    await interaction.reply({
      content: `🔒 Ticket #${ticketId} has been closed.\n**Reason:** ${reason}\n\nThis channel will be deleted in 10 seconds...`,
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
