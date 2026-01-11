const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../database');
const { isStaff } = require('../utils/permissions');
const { createProofEmbed } = require('../utils/embeds');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('complete')
    .setDescription('Mark the current ticket as completed')
    .addAttachmentOption(option =>
      option
        .setName('screenshot')
        .setDescription('Screenshot proof of the carry')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Check if user is staff
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Only carry helpers can complete tickets.',
        ephemeral: true,
      });
    }

    // Get ticket from current channel
    const ticket = db.ticket.getByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '❌ This command must be used in a ticket channel.',
        ephemeral: true,
      });
    }

    // Check if ticket is claimed
    if (ticket.status === 'waiting') {
      return interaction.reply({
        content: '❌ This ticket must be claimed before completing.',
        ephemeral: true,
      });
    }

    if (ticket.status === 'completed') {
      return interaction.reply({
        content: '❌ This ticket is already completed.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const screenshot = interaction.options.getAttachment('screenshot');
    const screenshotUrl = screenshot?.url || null;

    // Mark as complete
    db.ticket.complete(ticket.id);

    // Gather all ticket IDs (including merged)
    const mergedFrom = JSON.parse(ticket.merged_from || '[]');
    const allTicketIds = [ticket.id, ...mergedFrom];

    // Gather all players
    const playerIds = [ticket.discord_user_id];
    for (const mergedId of mergedFrom) {
      const mergedTicket = db.ticket.getById(mergedId);
      if (mergedTicket) {
        playerIds.push(mergedTicket.discord_user_id);
      }
    }

    // Gather helpers
    const helperIds = [ticket.helper_id || interaction.user.id];
    if (ticket.cohelper_id) {
      helperIds.push(ticket.cohelper_id);
    }

    // Create proof entry
    db.proof.create({
      ticketIds: allTicketIds,
      helperIds,
      playerIds,
      mode: ticket.mode,
      screenshotUrl,
      proofMessageId: null,
    });

    // Post to carry proof channel
    const proofChannelId = config.channels.carryProof;
    if (proofChannelId) {
      try {
        const proofChannel = await interaction.guild.channels.fetch(proofChannelId);
        if (proofChannel) {
          const proofEmbed = createProofEmbed(allTicketIds, helperIds, playerIds, ticket.mode, screenshotUrl);
          await proofChannel.send({ embeds: [proofEmbed] });
        }
      } catch (error) {
        console.error('Failed to post carry proof:', error);
      }
    }

    await interaction.editReply({
      content: `✅ **Ticket #${ticket.id} marked as complete!**\n\n` +
        `**Tickets:** ${allTicketIds.map(id => `#${id}`).join(', ')}\n` +
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
