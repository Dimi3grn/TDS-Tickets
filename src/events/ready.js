const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`\n✅ Bot is online as ${client.user.tag}!`);
    console.log(`📊 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`👥 Watching ${client.users.cache.size} users\n`);

    // Set bot status
    client.user.setActivity('for carry requests', { type: ActivityType.Watching });
  },
};
