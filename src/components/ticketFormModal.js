const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const db = require('../database');
const { createTicketEmbed } = require('../utils/embeds');

module.exports = {
  async execute(interaction, args) {
    const mode = args[0];
    const timezoneOffset = parseFloat(args[1]);
    const modeConfig = config.gameModes.find(m => m.value === mode);
    const tzConfig = config.timezones.find(tz => tz.value === args[1]);

    // Get form values
    const robloxUsername = interaction.fields.getTextInputValue('robloxUsername').trim();
    const levelInput = interaction.fields.getTextInputValue('level').trim();
    const availStartInput = interaction.fields.getTextInputValue('availabilityStart').trim();
    const availEndInput = interaction.fields.getTextInputValue('availabilityEnd').trim();
    const extraInfo = interaction.fields.getTextInputValue('extraInfo').trim().toLowerCase();

    // Validate level (no upper cap - some players are 1000+)
    const level = parseInt(levelInput);
    if (isNaN(level) || level < 0) {
      return interaction.reply({
        content: '❌ Please enter a valid level.',
        ephemeral: true,
      });
    }

    // Check level requirement
    if (modeConfig && modeConfig.minLevel > 0 && level < modeConfig.minLevel) {
      return interaction.reply({
        content: `❌ **${modeConfig.name}** mode requires Level ${modeConfig.minLevel}+. Your level: ${level}`,
        ephemeral: true,
      });
    }

    // Parse availability times
    const availability = parseAvailabilityTimes(availStartInput, availEndInput, timezoneOffset);

    // Parse extra info (private server, can chat) - format: "yes, yes" or "yes yes" or "y y"
    const parts = extraInfo.split(/[,\s]+/);
    const privateServer = (parts[0] || 'yes').startsWith('y') ? 'Yes' : 'No';
    const canChat = (parts[1] || parts[0] || 'yes').startsWith('y') ? 'Yes' : 'No';

    // Get timezone display name
    const timezone = tzConfig?.name || `UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`;

    // Get current session
    const session = db.session.getCurrent();
    if (!session) {
      return interaction.reply({
        content: '❌ No active session. Please try again later.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Create ticket channel
      const guild = interaction.guild;
      const categoryId = config.channels.ticketCategory;

      const ticketChannel = await guild.channels.create({
        name: `ticket-pending`,
        type: ChannelType.GuildText,
        parent: categoryId || null,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          // Allow carry helpers to view
          ...(config.roles.carryHelper ? [{
            id: config.roles.carryHelper,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages,
            ],
          }] : []),
          // Allow mods to view
          ...(config.roles.mod ? [{
            id: config.roles.mod,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.ManageChannels,
            ],
          }] : []),
        ],
      });

      // Create ticket in database
      const ticketId = db.ticket.create({
        discordUserId: interaction.user.id,
        robloxUsername,
        level,
        mode,
        timezone,
        timezoneOffset,
        availableType: availability.type,
        availableStart: availability.startUTC,
        availableEnd: availability.endUTC,
        availableDisplay: availability.display,
        privateServer,
        canChat,
        channelId: ticketChannel.id,
        sessionId: session.id,
      });

      // Update channel name with ticket number
      await ticketChannel.setName(`ticket-${String(ticketId).padStart(4, '0')}-${robloxUsername.slice(0, 10)}`);

      // Increment session ticket count
      db.session.incrementTickets(session.id);

      // Build ticket object for embed
      const ticket = {
        id: ticketId,
        discord_user_id: interaction.user.id,
        roblox_username: robloxUsername,
        level: level,
        mode: mode,
        timezone: timezone,
        available_type: availability.type,
        available_display: availability.display,
        private_server: privateServer,
        can_chat: canChat,
        status: 'waiting',
        created_at: new Date().toISOString(),
      };

      // Create ticket embed
      const ticketEmbed = createTicketEmbed(ticket, interaction.user);

      // Create action buttons
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`claim:${ticketId}`)
          .setLabel('Claim')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✋'),
        new ButtonBuilder()
          .setCustomId(`complete:${ticketId}`)
          .setLabel('Complete')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId(`close:${ticketId}`)
          .setLabel('Close')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
      );

      // Send ticket message
      await ticketChannel.send({
        content: `<@${interaction.user.id}> Welcome! Please wait patiently for a carry helper.\n\n` +
          `⏰ **Note:** If you don't respond within 30 minutes after a helper reaches out, your ticket may be closed.`,
        embeds: [ticketEmbed],
        components: [buttons],
      });

      // Get queue position
      const position = db.ticket.getQueuePosition(ticketId, mode);

      // Reply to user
      await interaction.editReply({
        content: `✅ Your ticket has been created: ${ticketChannel}\n\n` +
          `📊 You are **#${position}** in the ${modeConfig?.name || mode} queue.\n` +
          `⏳ Please wait patiently for a carry helper!`,
      });

    } catch (error) {
      console.error('❌ Error creating ticket:', error);
      await interaction.editReply({
        content: '❌ Failed to create ticket. Please try again or contact a mod.',
      });
    }
  },
};

/**
 * Parse start and end times into UTC timestamps
 */
function parseAvailabilityTimes(startInput, endInput, timezoneOffset) {
  const now = new Date();
  const normalizedStart = startInput.toLowerCase().trim();
  const normalizedEnd = endInput.toLowerCase().trim();

  let startUTC, endUTC;
  let type = 'now';
  let displayStart = startInput;
  let displayEnd = endInput;

  // Parse start time (don't auto-roll to tomorrow yet)
  if (normalizedStart === 'now' || normalizedStart === 'yes' || normalizedStart === 'ready') {
    startUTC = now;
    displayStart = 'Now';
    type = 'now';
  } else {
    startUTC = parseTimeInput(normalizedStart, timezoneOffset, now, false); // false = don't auto-roll
  }

  // Parse end time (don't auto-roll to tomorrow yet)
  endUTC = parseTimeInput(normalizedEnd, timezoneOffset, now, false);
  
  // If end is before start (e.g., 11pm - 2am), add a day to end
  if (endUTC <= startUTC) {
    endUTC = new Date(endUTC.getTime() + 24 * 60 * 60 * 1000);
  }

  // Only roll both to tomorrow if the END time is already in the past
  // (meaning the entire window has passed)
  if (endUTC < now) {
    startUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
    endUTC = new Date(endUTC.getTime() + 24 * 60 * 60 * 1000);
  }

  // Determine availability type based on start time
  if (startUTC <= now) {
    type = 'now';
  } else if (startUTC - now < 2 * 60 * 60 * 1000) {
    type = 'soon';
  } else {
    type = 'scheduled';
  }

  return {
    type,
    startUTC: startUTC.toISOString(),
    endUTC: endUTC.toISOString(),
    display: `${displayStart} - ${displayEnd}`,
  };
}

/**
 * Parse a time input string to a UTC Date
 * @param {boolean} autoRollTomorrow - If true, rolls to tomorrow if time is in the past
 */
function parseTimeInput(input, timezoneOffset, now, autoRollTomorrow = true) {
  // "in X hours"
  const hoursMatch = input.match(/(?:in\s+)?(\d+)\s*(?:hours?|hrs?|h)/i);
  if (hoursMatch) {
    return new Date(now.getTime() + parseInt(hoursMatch[1]) * 60 * 60 * 1000);
  }

  // "in X minutes"
  const minsMatch = input.match(/(?:in\s+)?(\d+)\s*(?:minutes?|mins?|m)/i);
  if (minsMatch) {
    return new Date(now.getTime() + parseInt(minsMatch[1]) * 60 * 1000);
  }

  // Time like "5pm", "17:00", "5:30pm"
  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const min = parseInt(timeMatch[2]) || 0;
    const ampm = timeMatch[3];

    // Convert 12-hour to 24-hour
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && hour !== 12) {
        hour += 12;
      } else if (ampm.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }
    }

    // Create date with UTC hours (treat input as user's local time)
    const utcDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,  // User's local hour
      min,
      0,
      0
    ));
    
    // Convert from user's local time to UTC by subtracting their offset
    // e.g., User in UTC+1 says 6pm → 18:00 - 1 hour = 17:00 UTC
    utcDate.setTime(utcDate.getTime() - timezoneOffset * 60 * 60 * 1000);

    // Only auto-roll to tomorrow if requested and time is in the past
    if (autoRollTomorrow && utcDate < now) {
      utcDate.setDate(utcDate.getUTCDate() + 1);
    }

    return utcDate;
  }

  // Default: 4 hours from now
  return new Date(now.getTime() + 4 * 60 * 60 * 1000);
}

