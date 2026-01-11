const { EmbedBuilder } = require('discord.js');
const db = require('../database');
const { isStaff } = require('../utils/permissions');

module.exports = {
  async execute(interaction, args) {
    const ticketId = parseInt(args[0]);

    // Check if user is staff
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Only carry helpers can claim tickets.',
        ephemeral: true,
      });
    }

    // Get ticket
    const ticket = db.ticket.getById(ticketId);
    if (!ticket) {
      return interaction.reply({
        content: '❌ Ticket not found.',
        ephemeral: true,
      });
    }

    // Check if already claimed
    if (ticket.status === 'claimed' || ticket.status === 'in_progress') {
      return interaction.reply({
        content: `❌ This ticket is already claimed by <@${ticket.helper_id}>.`,
        ephemeral: true,
      });
    }

    // Check if ticket is still open
    if (ticket.status !== 'waiting') {
      return interaction.reply({
        content: `❌ This ticket cannot be claimed (status: ${ticket.status}).`,
        ephemeral: true,
      });
    }

    // Claim the ticket
    db.ticket.claim(ticketId, interaction.user.id);

    // Update the message to show claimed status
    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(0x00ff00)
      .setFooter({ text: `Status: CLAIMED by ${interaction.user.username} • Created` });

    await interaction.update({
      embeds: [embed],
    });

    // Send notification in channel
    await interaction.channel.send({
      content: `✅ <@${interaction.user.id}> has claimed this ticket!\n\n` +
        `<@${ticket.discord_user_id}> — Your helper is here! Please respond within 30 minutes.`,
    });
  },
};
