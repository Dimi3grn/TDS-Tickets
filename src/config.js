// Load environment variables
require('dotenv').config();

module.exports = {
  // Bot credentials
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  // Channel IDs
  channels: {
    ticket: process.env.TICKET_CHANNEL_ID,
    carryProof: process.env.CARRY_PROOF_CHANNEL_ID,
    ticketCategory: process.env.TICKET_CATEGORY_ID,
  },

  // Role IDs
  roles: {
    carryHelper: process.env.CARRY_HELPER_ROLE_ID,
    mod: process.env.MOD_ROLE_ID,
  },

  // Game modes available for carries
  gameModes: [
    { name: 'Easy', value: 'easy', emoji: '🟢', minLevel: 0 },
    { name: 'Fallen', value: 'fallen', emoji: '🟠', minLevel: 0 },
    { name: 'Frost Invasion', value: 'frost', emoji: '❄️', minLevel: 0 },
    { name: 'Event', value: 'event', emoji: '⭐', minLevel: 35 },
  ],

  // Timezone options for the dropdown
  timezones: [
    { name: 'UTC-12 (Baker Island)', value: '-12' },
    { name: 'UTC-11 (Samoa)', value: '-11' },
    { name: 'UTC-10 (Hawaii)', value: '-10' },
    { name: 'UTC-9 (Alaska)', value: '-9' },
    { name: 'UTC-8 (PST - Los Angeles)', value: '-8' },
    { name: 'UTC-7 (MST - Denver)', value: '-7' },
    { name: 'UTC-6 (CST - Chicago)', value: '-6' },
    { name: 'UTC-5 (EST - New York)', value: '-5' },
    { name: 'UTC-4 (Atlantic)', value: '-4' },
    { name: 'UTC-3 (Brazil)', value: '-3' },
    { name: 'UTC-2', value: '-2' },
    { name: 'UTC-1 (Azores)', value: '-1' },
    { name: 'UTC+0 (London, GMT)', value: '0' },
    { name: 'UTC+1 (Paris, Berlin)', value: '1' },
    { name: 'UTC+2 (Cairo, Athens)', value: '2' },
    { name: 'UTC+3 (Moscow, Istanbul)', value: '3' },
    { name: 'UTC+4 (Dubai)', value: '4' },
    { name: 'UTC+5 (Pakistan)', value: '5' },
    { name: 'UTC+5:30 (India)', value: '5.5' },
    { name: 'UTC+6 (Bangladesh)', value: '6' },
    { name: 'UTC+7 (Bangkok, Jakarta)', value: '7' },
    { name: 'UTC+8 (Singapore, Perth, China)', value: '8' },
    { name: 'UTC+9 (Tokyo, Seoul)', value: '9' },
    { name: 'UTC+10 (Sydney)', value: '10' },
    { name: 'UTC+11', value: '11' },
    { name: 'UTC+12 (New Zealand)', value: '12' },
  ],

  // Ticket settings
  ticket: {
    responseTimeoutMinutes: 30,  // Close ticket if no response after helper reaches out
    warningMinutes: 20,          // Warn player before timeout
    maxTicketsPerSession: 60,    // Auto-close session after this many tickets
  },
};
