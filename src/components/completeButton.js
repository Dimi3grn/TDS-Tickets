const db = require('../database');
const { isStaff } = require('../utils/permissions');
const { createProofEmbed } = require('../utils/embeds');
const config = require('../config');

module.exports = {
  async execute(interaction, args) {
    const ticketId = parseInt(args[0]);

    // Check if user is staff
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Only carry helpers can complete tickets.',
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

    // Check if ticket is claimed
    if (ticket.status !== 'claimed' && ticket.status !== 'in_progress') {
      return interaction.reply({
        content: '❌ This ticket must be claimed before completing.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    // Mark as complete
    db.ticket.complete(ticketId);

    // Gather all ticket IDs (including merged)
    const mergedFrom = JSON.parse(ticket.merged_from || '[]');
    const allTicketIds = [ticketId, ...mergedFrom];

    // Gather all players
    const playerIds = [ticket.discord_user_id];
    for (const mergedId of mergedFrom) {
      const mergedTicket = db.ticket.getById(mergedId);
      if (mergedTicket) {
        playerIds.push(mergedTicket.discord_user_id);
      }
    }

    // Gather helpers
    const helperIds = [ticket.helper_id];
    if (ticket.cohelper_id) {
      helperIds.push(ticket.cohelper_id);
    }

    // Create proof entry
    db.proof.create({
      ticketIds: allTicketIds,
      helperIds,
      playerIds,
      mode: ticket.mode,
      screenshotUrl: null,
      proofMessageId: null,
    });

    // Post to carry proof channel
    const proofChannelId = config.channels.carryProof;
    if (proofChannelId) {
      try {
        const proofChannel = await interaction.guild.channels.fetch(proofChannelId);
        if (proofChannel) {
          const proofEmbed = createProofEmbed(allTicketIds, helperIds, playerIds, ticket.mode, null);
          await proofChannel.send({ embeds: [proofEmbed] });
        }
      } catch (error) {
        console.error('Failed to post carry proof:', error);
      }
    }

    await interaction.editReply({
      content: `✅ Ticket #${ticketId} marked as complete!\n\n` +
        `**Helpers:** ${helperIds.map(h => `<@${h}>`).join(' ')}\n` +
        `**Players:** ${playerIds.map(p => `<@${p}>`).join(' ')}\n\n` +
        `This channel will be deleted in 30 seconds...`,
    });

    // Delete channel after delay
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (error) {
        console.error('Failed to delete ticket channel:', error);
      }
    }, 30000);
  },
};
