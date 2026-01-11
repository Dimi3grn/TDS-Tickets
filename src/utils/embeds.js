const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Create the main ticket panel embed (shown in ticket request channel)
 */
function createTicketPanelEmbed(session) {
  const isOpen = session && session.status === 'open';
  
  const embed = new EmbedBuilder()
    .setTitle('🎮 TDS Carry Service')
    .setDescription(
      `**Status:** ${isOpen ? '🟢 OPEN' : '🔴 CLOSED'}\n\n` +
      `${isOpen 
        ? '✨ Select a game mode below to request a carry!' 
        : '⏳ Carry service is currently closed. Please wait for a session to open.'
      }`
    )
    .addFields(
      {
        name: '📋 Rules',
        value: 
          '1️⃣ Only open a ticket when you are available to play\n' +
          '2️⃣ Be respectful to helpers and other players\n' +
          '3️⃣ Respond within 30 minutes when a helper reaches out\n' +
          '4️⃣ Do not spam or create multiple tickets',
      },
      {
        name: '🎯 Available Modes',
        value: config.gameModes.map(m => `${m.emoji} **${m.name}**${m.minLevel > 0 ? ` (Lv.${m.minLevel}+)` : ''}`).join('\n'),
      }
    )
    .setColor(isOpen ? 0x00ff00 : 0xff0000)
    .setFooter({ text: 'TDS Carry Bot' })
    .setTimestamp();

  return embed;
}

/**
 * Create embed for a ticket channel
 */
function createTicketEmbed(ticket, user) {
  const modeConfig = config.gameModes.find(m => m.value === ticket.mode);
  
  const availabilityIcon = {
    'now': '🟢',
    'soon': '🟡',
    'later': '🔵',
    'scheduled': '⏰',
  }[ticket.available_type] || '🟢';

  const embed = new EmbedBuilder()
    .setTitle(`${modeConfig?.emoji || '🎮'} Ticket #${ticket.id} - ${modeConfig?.name || ticket.mode}`)
    .setDescription(`Hello <@${ticket.discord_user_id}>! A carry helper will be with you soon.`)
    .addFields(
      { name: '👤 Roblox Username', value: ticket.roblox_username, inline: true },
      { name: '📊 Level', value: String(ticket.level), inline: true },
      { name: '🎮 Mode', value: modeConfig?.name || ticket.mode, inline: true },
      { name: '🌍 Timezone', value: ticket.timezone, inline: true },
      { name: `${availabilityIcon} Availability`, value: ticket.available_display || 'Now', inline: true },
      { name: '🔗 Private Server', value: ticket.private_server, inline: true },
      { name: '💬 Can Chat', value: ticket.can_chat, inline: true },
    )
    .setColor(0x5865F2)
    .setFooter({ text: `Status: ${ticket.status.toUpperCase()} • Created` })
    .setTimestamp(new Date(ticket.created_at));

  if (user) {
    embed.setThumbnail(user.displayAvatarURL());
  }

  return embed;
}

/**
 * Create queue list embed
 */
function createQueueEmbed(tickets, mode = null) {
  const title = mode 
    ? `📋 Queue - ${config.gameModes.find(m => m.value === mode)?.name || mode}`
    : '📋 All Waiting Tickets';

  // Current UTC time in AM/PM format
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMins = now.getUTCMinutes();
  const ampm = utcHours >= 12 ? 'PM' : 'AM';
  const displayHours = utcHours % 12 || 12;
  const utcTimeStr = `${displayHours}:${utcMins.toString().padStart(2, '0')} ${ampm} UTC`;

  if (tickets.length === 0) {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(`🕐 **Current UTC Time:** ${utcTimeStr}\n\nNo tickets in queue!`)
      .setColor(0x808080);
  }

  const lines = tickets.slice(0, 20).map(t => {
    const modeEmoji = config.gameModes.find(m => m.value === t.mode)?.emoji || '🎮';
    
    // Dynamic availability calculation
    const { icon: availIcon, label: availLabel } = getDynamicAvailability(t, now);
    
    // Convert times to UTC display
    const utcDisplay = getUTCTimeDisplay(t);
    
    const waitTime = getWaitTime(t.created_at);
    return `\`#${String(t.id).padStart(3, '0')}\` ${modeEmoji} ${availIcon} **${utcDisplay}** • Lv.${t.level} • ${waitTime}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`🕐 **Current UTC Time:** ${utcTimeStr}\n\n${lines.join('\n')}`)
    .setColor(0x5865F2)
    .setFooter({ text: `${tickets.length} ticket(s) waiting` })
    .setTimestamp();

  if (tickets.length > 20) {
    embed.setDescription(`🕐 **Current UTC Time:** ${utcTimeStr}\n\n${lines.join('\n')}\n\n*...and ${tickets.length - 20} more*`);
  }

  return embed;
}

/**
 * Calculate dynamic availability based on current time
 */
function getDynamicAvailability(ticket, now) {
  // Parse dates - handle SQLite format "YYYY-MM-DD HH:MM:SS" 
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // If it's already a Date object
    if (dateStr instanceof Date) return dateStr;
    // Convert SQLite format to ISO format and treat as UTC
    const normalized = dateStr.replace(' ', 'T');
    return new Date(normalized + (normalized.includes('Z') ? '' : 'Z'));
  };

  const startTime = parseDate(ticket.available_start);
  const endTime = ticket.available_end 
    ? parseDate(ticket.available_end) 
    : new Date(startTime.getTime() + 4 * 60 * 60 * 1000);

  // Check if current time is within availability window
  if (now >= startTime && now <= endTime) {
    return { icon: '🟢', label: 'NOW' };
  }
  
  // Check if start time is in the past (missed window)
  if (now > endTime) {
    return { icon: '🔴', label: 'EXPIRED' };
  }
  
  // Start time is in the future
  const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);
  
  if (hoursUntilStart <= 1) {
    return { icon: '🟡', label: 'SOON' };
  } else if (hoursUntilStart <= 2) {
    return { icon: '🔵', label: 'LATER' };
  } else {
    return { icon: '⏰', label: 'SCHEDULED' };
  }
}

/**
 * Get UTC time display for a ticket (in AM/PM format)
 */
function getUTCTimeDisplay(ticket) {
  // Parse dates - handle SQLite format "YYYY-MM-DD HH:MM:SS"
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const normalized = dateStr.replace(' ', 'T');
    return new Date(normalized + (normalized.includes('Z') ? '' : 'Z'));
  };

  const startTime = parseDate(ticket.available_start);
  const endTime = ticket.available_end ? parseDate(ticket.available_end) : null;

  const formatUTCTime = (date) => {
    let hours = date.getUTCHours();
    const mins = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    const minsStr = mins > 0 ? `:${mins.toString().padStart(2, '0')}` : '';
    return `${hours}${minsStr}${ampm}`;
  };

  if (endTime) {
    return `${formatUTCTime(startTime)} - ${formatUTCTime(endTime)} UTC`;
  }
  return `${formatUTCTime(startTime)} UTC`;
}

/**
 * Create compatible tickets embed
 */
function createCompatibleEmbed(sourceTicket, compatibleTickets) {
  const modeConfig = config.gameModes.find(m => m.value === sourceTicket.mode);
  const now = new Date();
  const utcTimeStr = now.toUTCString().replace('GMT', 'UTC');

  // Get source ticket UTC display
  const sourceUTC = getUTCTimeDisplay(sourceTicket);
  const { icon: sourceIcon } = getDynamicAvailability(sourceTicket, now);

  if (compatibleTickets.length === 0) {
    return new EmbedBuilder()
      .setTitle(`🔍 Compatible with Ticket #${sourceTicket.id}`)
      .setDescription(`🕐 **Current UTC Time:** ${utcTimeStr}\n\n**Source:** #${sourceTicket.id} • ${sourceIcon} ${sourceUTC}\n\nNo compatible tickets found with overlapping availability.`)
      .setColor(0xff9900);
  }

  const lines = compatibleTickets.map(t => {
    const { icon: availIcon } = getDynamicAvailability(t, now);
    const utcDisplay = getUTCTimeDisplay(t);
    return `\`#${String(t.id).padStart(3, '0')}\` ${availIcon} **${utcDisplay}** • Lv.${t.level}`;
  });

  return new EmbedBuilder()
    .setTitle(`🔍 Compatible with Ticket #${sourceTicket.id}`)
    .setDescription(
      `🕐 **Current UTC Time:** ${utcTimeStr}\n\n` +
      `**Source:** #${sourceTicket.id} • ${modeConfig?.emoji || ''} ${modeConfig?.name || sourceTicket.mode} • ${sourceIcon} ${sourceUTC}\n\n` +
      `**Compatible tickets:**\n${lines.join('\n')}`
    )
    .setColor(0x00ff00)
    .setFooter({ text: `${compatibleTickets.length} compatible ticket(s) found` });
}

/**
 * Create carry proof embed
 */
function createProofEmbed(ticketIds, helpers, players, mode, screenshotUrl) {
  const modeConfig = config.gameModes.find(m => m.value === mode);

  const embed = new EmbedBuilder()
    .setTitle(`✅ Carry Complete!`)
    .setDescription(
      `**Mode:** ${modeConfig?.emoji || '🎮'} ${modeConfig?.name || mode}\n` +
      `**Tickets:** ${ticketIds.map(id => `#${id}`).join(', ')}`
    )
    .addFields(
      { name: '🛡️ Helpers', value: helpers.map(h => `<@${h}>`).join(' '), inline: true },
      { name: '👥 Players', value: players.map(p => `<@${p}>`).join(' '), inline: true },
    )
    .setColor(0x00ff00)
    .setTimestamp();

  if (screenshotUrl) {
    embed.setImage(screenshotUrl);
  }

  return embed;
}

/**
 * Create session status embed
 */
function createSessionStatusEmbed(session, stats) {
  if (!session) {
    return new EmbedBuilder()
      .setTitle('📊 Session Status')
      .setDescription('No active session.')
      .setColor(0x808080);
  }

  const embed = new EmbedBuilder()
    .setTitle('📊 Session Status')
    .setDescription(`**Status:** ${session.status === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}`)
    .addFields(
      { name: '🎫 Total Tickets', value: String(stats?.total_tickets || 0), inline: true },
      { name: '⏳ Waiting', value: String(stats?.waiting || 0), inline: true },
      { name: '🔒 Claimed', value: String(stats?.claimed || 0), inline: true },
      { name: '✅ Completed', value: String(stats?.completed || 0), inline: true },
      { name: '❌ Closed', value: String(stats?.closed || 0), inline: true },
    )
    .setColor(session.status === 'open' ? 0x00ff00 : 0xff0000)
    .setFooter({ text: `Session #${session.id}` })
    .setTimestamp();

  if (session.opened_at) {
    embed.addFields({ 
      name: '🕐 Opened', 
      value: `<t:${Math.floor(new Date(session.opened_at).getTime() / 1000)}:R>`, 
      inline: true 
    });
  }

  return embed;
}

/**
 * Helper: Get human-readable wait time
 */
function getWaitTime(createdAt) {
  if (!createdAt) return 'just now';
  
  const now = new Date();
  let created;
  
  // Handle different timestamp formats from SQLite
  if (typeof createdAt === 'string') {
    // SQLite datetime format: "2024-01-15 14:30:00" or ISO format
    created = new Date(createdAt.replace(' ', 'T') + (createdAt.includes('Z') ? '' : 'Z'));
  } else {
    created = new Date(createdAt);
  }
  
  // If invalid date, return just now
  if (isNaN(created.getTime())) return 'just now';
  
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 0) return 'just now';
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

module.exports = {
  createTicketPanelEmbed,
  createTicketEmbed,
  createQueueEmbed,
  createCompatibleEmbed,
  createProofEmbed,
  createSessionStatusEmbed,
};
