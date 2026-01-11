const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { createCompatibleEmbed } = require('../utils/embeds');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compatible')
    .setDescription('Find tickets compatible with a ticket (same mode + overlapping availability)')
    .addIntegerOption(option =>
      option
        .setName('ticket')
        .setDescription('Ticket number to find matches for')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    // Check if user is staff
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Only carry helpers can use this command.',
        ephemeral: true,
      });
    }

    // Defer reply to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    const ticketId = interaction.options.getInteger('ticket');

    // Get source ticket
    const sourceTicket = db.ticket.getById(ticketId);
    if (!sourceTicket) {
      return interaction.editReply({
        content: `❌ Ticket #${ticketId} not found.`,
      });
    }

    // Check if source ticket is still waiting
    if (sourceTicket.status !== 'waiting' && sourceTicket.status !== 'claimed') {
      return interaction.editReply({
        content: `❌ Ticket #${ticketId} is not available for matching (status: ${sourceTicket.status}).`,
      });
    }

    // Find compatible tickets
    const compatibleTickets = db.ticket.getCompatible(
      ticketId,
      sourceTicket.mode,
      sourceTicket.available_start,
      sourceTicket.available_end || new Date(new Date(sourceTicket.available_start).getTime() + 4 * 60 * 60 * 1000).toISOString()
    );

    const embed = createCompatibleEmbed(sourceTicket, compatibleTickets);

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
