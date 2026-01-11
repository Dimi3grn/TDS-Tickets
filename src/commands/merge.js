const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database');
const { isStaff } = require('../utils/permissions');
const { createTicketEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('merge')
    .setDescription('Merge two tickets together (adds player from source to target)')
    .addIntegerOption(option =>
      option
        .setName('target')
        .setDescription('Target ticket (keeps this channel)')
        .setRequired(true)
        .setMinValue(1)
    )
    .addIntegerOption(option =>
      option
        .setName('source')
        .setDescription('Source ticket (player will be moved, channel deleted)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    // Check if user is staff
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Only carry helpers can merge tickets.',
        ephemeral: true,
      });
    }

    const targetId = interaction.options.getInteger('target');
    const sourceId = interaction.options.getInteger('source');

    if (targetId === sourceId) {
      return interaction.reply({
        content: '❌ Cannot merge a ticket with itself.',
        ephemeral: true,
      });
    }

    // Get both tickets
    const targetTicket = db.ticket.getById(targetId);
    const sourceTicket = db.ticket.getById(sourceId);

    if (!targetTicket) {
      return interaction.reply({
        content: `❌ Target ticket #${targetId} not found.`,
        ephemeral: true,
      });
    }

    if (!sourceTicket) {
      return interaction.reply({
        content: `❌ Source ticket #${sourceId} not found.`,
        ephemeral: true,
      });
    }

    // Check statuses
    if (targetTicket.status === 'completed' || targetTicket.status === 'closed' || targetTicket.status === 'merged') {
      return interaction.reply({
        content: `❌ Target ticket #${targetId} is not available (status: ${targetTicket.status}).`,
        ephemeral: true,
      });
    }

    if (sourceTicket.status === 'completed' || sourceTicket.status === 'closed' || sourceTicket.status === 'merged') {
      return interaction.reply({
        content: `❌ Source ticket #${sourceId} is not available (status: ${sourceTicket.status}).`,
        ephemeral: true,
      });
    }

    // Check if same mode
    if (targetTicket.mode !== sourceTicket.mode) {
      return interaction.reply({
        content: `❌ Cannot merge tickets with different modes (${targetTicket.mode} vs ${sourceTicket.mode}).`,
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      // Get target channel
      const targetChannel = await interaction.guild.channels.fetch(targetTicket.channel_id);
      if (!targetChannel) {
        return interaction.editReply({
          content: '❌ Target ticket channel not found.',
        });
      }

      // Add source player to target channel
      await targetChannel.permissionOverwrites.create(sourceTicket.discord_user_id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      // Merge in database
      db.ticket.merge(sourceId, targetId);

      // Notify in target channel
      await targetChannel.send({
        content: `🔀 **Ticket Merged!**\n\n` +
          `<@${sourceTicket.discord_user_id}> from ticket #${sourceId} has been added to this ticket.\n` +
          `**Their info:**\n` +
          `• Roblox: ${sourceTicket.roblox_username}\n` +
          `• Level: ${sourceTicket.level}\n` +
          `• Availability: ${sourceTicket.available_display || 'Now'}`,
      });

      // Delete source channel
      try {
        const sourceChannel = await interaction.guild.channels.fetch(sourceTicket.channel_id);
        if (sourceChannel) {
          await sourceChannel.send({
            content: `🔀 This ticket has been merged into <#${targetChannel.id}>.\nThis channel will be deleted in 5 seconds...`,
          });
          setTimeout(async () => {
            try {
              await sourceChannel.delete();
            } catch (e) {
              console.error('Failed to delete source channel:', e);
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Failed to handle source channel:', error);
      }

      await interaction.editReply({
        content: `✅ **Merged ticket #${sourceId} into #${targetId}!**\n\n` +
          `• <@${sourceTicket.discord_user_id}> has been added to <#${targetChannel.id}>\n` +
          `• Source ticket channel will be deleted shortly`,
      });

    } catch (error) {
      console.error('Error merging tickets:', error);
      await interaction.editReply({
        content: '❌ Failed to merge tickets. Check bot permissions.',
      });
    }
  },
};
