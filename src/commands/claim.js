const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim a ticket')
    .addIntegerOption(option =>
      option
        .setName('ticket')
        .setDescription('Ticket number to claim')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    // Check if user is staff
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Only carry helpers can claim tickets.',
        ephemeral: true,
      });
    }

    const ticketId = interaction.options.getInteger('ticket');

    // Get ticket
    const ticket = db.ticket.getById(ticketId);
    if (!ticket) {
      return interaction.reply({
        content: `❌ Ticket #${ticketId} not found.`,
        ephemeral: true,
      });
    }

    // Check if already claimed
    if (ticket.status === 'claimed' || ticket.status === 'in_progress') {
      return interaction.reply({
        content: `❌ Ticket #${ticketId} is already claimed by <@${ticket.helper_id}>.`,
        ephemeral: true,
      });
    }

    // Check if ticket is still waiting
    if (ticket.status !== 'waiting') {
      return interaction.reply({
        content: `❌ Ticket #${ticketId} cannot be claimed (status: ${ticket.status}).`,
        ephemeral: true,
      });
    }

    // Claim the ticket
    db.ticket.claim(ticketId, interaction.user.id);

    await interaction.reply({
      content: `✅ You have claimed ticket #${ticketId}!\n\n` +
        `📍 Go to <#${ticket.channel_id}> to help the player.`,
      ephemeral: true,
    });

    // Send notification in ticket channel
    try {
      const ticketChannel = await interaction.guild.channels.fetch(ticket.channel_id);
      if (ticketChannel) {
        await ticketChannel.send({
          content: `✅ <@${interaction.user.id}> has claimed this ticket!\n\n` +
            `<@${ticket.discord_user_id}> — Your helper is here! Please respond within 30 minutes.`,
        });

        // Try to update the ticket embed
        const messages = await ticketChannel.messages.fetch({ limit: 10 });
        const ticketMessage = messages.find(m => m.author.bot && m.embeds.length > 0);
        if (ticketMessage && ticketMessage.embeds[0]) {
          const embed = EmbedBuilder.from(ticketMessage.embeds[0])
            .setColor(0x00ff00)
            .setFooter({ text: `Status: CLAIMED by ${interaction.user.username} • Created` });
          await ticketMessage.edit({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  },
};
