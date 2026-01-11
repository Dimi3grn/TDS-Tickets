const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const { createSessionStatusEmbed, createTicketPanelEmbed } = require('../utils/embeds');
const { isMod, isAdmin } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('Manage carry sessions')
    .addSubcommand(subcommand =>
      subcommand
        .setName('open')
        .setDescription('Open a new carry session (allow ticket creation)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Close the current session (stop new tickets)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current session status and statistics')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // Check permissions for open/close
    if ((subcommand === 'open' || subcommand === 'close') && 
        !isMod(interaction.member) && !isAdmin(interaction.member)) {
      return interaction.reply({
        content: '❌ Only moderators can open/close sessions.',
        ephemeral: true,
      });
    }

    if (subcommand === 'open') {
      // Check if already open
      const current = db.session.getCurrent();
      if (current && current.status === 'open') {
        return interaction.reply({
          content: '❌ A session is already open! Close it first with `/session close`.',
          ephemeral: true,
        });
      }

      // Open new session
      const result = db.session.open(interaction.user.id);
      const session = db.session.getCurrent();

      await interaction.reply({
        content: `✅ **Session #${session.id} is now OPEN!**\n\n` +
          `Players can now create tickets. Use \`/session close\` to stop accepting new tickets.`,
      });

      // Try to update the ticket panel if configured
      await updateTicketPanel(interaction.guild, session);

    } else if (subcommand === 'close') {
      const current = db.session.getCurrent();
      if (!current || current.status !== 'open') {
        return interaction.reply({
          content: '❌ No session is currently open.',
          ephemeral: true,
        });
      }

      // Close session
      db.session.close(current.id);
      const stats = db.session.getStats(current.id);

      await interaction.reply({
        content: `🔒 **Session #${current.id} is now CLOSED!**\n\n` +
          `**Summary:**\n` +
          `• Total tickets: ${stats.total_tickets}\n` +
          `• Completed: ${stats.completed}\n` +
          `• Still waiting: ${stats.waiting}\n` +
          `• Claimed: ${stats.claimed}`,
      });

      // Try to update the ticket panel
      await updateTicketPanel(interaction.guild, null);

    } else if (subcommand === 'status') {
      const current = db.session.getCurrent();
      const stats = current ? db.session.getStats(current.id) : null;
      const embed = createSessionStatusEmbed(current, stats);

      await interaction.reply({ embeds: [embed] });
    }
  },
};

/**
 * Try to update the ticket panel embed to reflect session status
 */
async function updateTicketPanel(guild, session) {
  const ticketChannelId = config.channels.ticket;
  if (!ticketChannelId) return;

  try {
    const channel = await guild.channels.fetch(ticketChannelId);
    if (!channel) return;

    // Look for the bot's panel message (last message with select menu)
    const messages = await channel.messages.fetch({ limit: 20 });
    const panelMessage = messages.find(m => 
      m.author.bot && 
      m.components.length > 0 &&
      m.components[0].components[0]?.customId === 'mode'
    );

    if (panelMessage) {
      const newEmbed = createTicketPanelEmbed(session);
      await panelMessage.edit({ embeds: [newEmbed] });
    }
  } catch (error) {
    console.error('Failed to update ticket panel:', error);
  }
}
