const { REST, Routes } = require('discord.js');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Validate config
if (!config.token) {
  console.error('❌ Missing DISCORD_TOKEN in .env file!');
  process.exit(1);
}

if (!config.clientId) {
  console.error('❌ Missing CLIENT_ID in .env file!');
  process.exit(1);
}

// Load commands
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (command.data) {
    commands.push(command.data.toJSON());
    console.log(`📦 Loaded command: ${command.data.name}`);
  }
}

// Deploy
const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.\n`);

    let data;
    
    // If guild ID is provided, deploy to specific guild (faster for development)
    if (config.guildId) {
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      );
      console.log(`✅ Successfully reloaded ${data.length} commands to guild ${config.guildId}`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      );
      console.log(`✅ Successfully reloaded ${data.length} global commands`);
      console.log('⚠️  Global commands can take up to 1 hour to appear!');
    }

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
