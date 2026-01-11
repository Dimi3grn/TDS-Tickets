const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`❌ Error executing ${interaction.commandName}:`, error);
        
        const errorMessage = '❌ There was an error executing this command.';
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      const [action, ...args] = interaction.customId.split(':');

      try {
        // Dynamic handler loading
        const handlerPath = `../components/${action}Button.js`;
        try {
          const handler = require(handlerPath);
          await handler.execute(interaction, args);
        } catch (e) {
          if (e.code === 'MODULE_NOT_FOUND') {
            console.warn(`⚠️ No handler for button: ${action}`);
          } else {
            throw e;
          }
        }
      } catch (error) {
        console.error(`❌ Error handling button ${interaction.customId}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Something went wrong!', ephemeral: true });
        }
      }
      return;
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      const [action, ...args] = interaction.customId.split(':');

      try {
        const handlerPath = `../components/${action}Select.js`;
        try {
          const handler = require(handlerPath);
          await handler.execute(interaction, args);
        } catch (e) {
          if (e.code === 'MODULE_NOT_FOUND') {
            console.warn(`⚠️ No handler for select menu: ${action}`);
          } else {
            throw e;
          }
        }
      } catch (error) {
        console.error(`❌ Error handling select menu ${interaction.customId}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Something went wrong!', ephemeral: true });
        }
      }
      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      const [action, ...args] = interaction.customId.split(':');

      try {
        const handlerPath = `../components/${action}Modal.js`;
        try {
          const handler = require(handlerPath);
          await handler.execute(interaction, args);
        } catch (e) {
          if (e.code === 'MODULE_NOT_FOUND') {
            console.warn(`⚠️ No handler for modal: ${action}`);
          } else {
            throw e;
          }
        }
      } catch (error) {
        console.error(`❌ Error handling modal ${interaction.customId}:`, error);
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '❌ Something went wrong!', ephemeral: true });
        }
      }
      return;
    }
  },
};
