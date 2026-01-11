const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database');
const { isStaff } = require('../utils/permissions');

module.exports = {
  async execute(interaction, args) {
    const ticketId = parseInt(args[0]);

    // Get ticket
    const ticket = db.ticket.getById(ticketId);
    if (!ticket) {
      return interaction.reply({
        content: '❌ Ticket not found.',
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

    // Show modal to ask for reason
    const modal = new ModalBuilder()
      .setCustomId(`closeConfirm:${ticketId}`)
      .setTitle('Close Ticket');

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason for closing (optional)')
      .setPlaceholder('e.g., Player didn\'t respond, Completed via party queue, etc.')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(200);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

    await interaction.showModal(modal);
  },
};
