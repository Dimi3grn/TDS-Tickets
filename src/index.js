const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const config = require('./config');
const { initDatabase } = require('./database');
const fs = require('fs');
const path = require('path');

// Validate config
if (!config.token) {
  console.error('❌ Missing DISCORD_TOKEN in .env file!');
  console.error('   Copy env.example to .env and fill in your bot token.');
  process.exit(1);
}

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);
    }
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`✅ Loaded event: ${event.name}`);
  }
}

// Error handling
client.on(Events.Error, error => {
  console.error('❌ Client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled rejection:', error);
});

// Initialize database and login
(async () => {
  try {
    // Initialize database first
    await initDatabase();
    
    // Then login to Discord
    await client.login(config.token);
    console.log('🚀 Bot is starting...');
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
})();
