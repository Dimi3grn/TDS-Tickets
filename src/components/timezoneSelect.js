const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  async execute(interaction, args) {
    const selectedMode = args[0]; // args might include 'neg' or 'pos' suffix, ignore it
    const selectedTimezone = interaction.values[0];
    const modeConfig = config.gameModes.find(m => m.value === selectedMode);
    const tzConfig = config.timezones.find(tz => tz.value === selectedTimezone);

    // Show the ticket form modal
    const modal = new ModalBuilder()
      .setCustomId(`ticketForm:${selectedMode}:${selectedTimezone}`)
      .setTitle(`${modeConfig?.emoji || '🎮'} ${modeConfig?.name || selectedMode} Carry`);

    const robloxUsername = new TextInputBuilder()
      .setCustomId('robloxUsername')
      .setLabel('What\'s your Roblox username?')
      .setPlaceholder('Enter your exact Roblox username')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50);

    const level = new TextInputBuilder()
      .setCustomId('level')
      .setLabel('What\'s your level in TDS?')
      .setPlaceholder('e.g., 42')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(5);

    const availabilityStart = new TextInputBuilder()
      .setCustomId('availabilityStart')
      .setLabel('When can you START playing? (your local time)')
      .setPlaceholder('e.g., "now" or "5pm" or "17:00" or "in 2 hours"')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50);

    const availabilityEnd = new TextInputBuilder()
      .setCustomId('availabilityEnd')
      .setLabel('Until when can you play? (your local time)')
      .setPlaceholder('e.g., "9pm" or "21:00" or "in 4 hours"')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50);

    const extraInfo = new TextInputBuilder()
      .setCustomId('extraInfo')
      .setLabel('Private server, Chat in-game? (e.g., "yes, yes")')
      .setPlaceholder('yes, yes  OR  no, yes  OR  yes, no')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(20);

    modal.addComponents(
      new ActionRowBuilder().addComponents(robloxUsername),
      new ActionRowBuilder().addComponents(level),
      new ActionRowBuilder().addComponents(availabilityStart),
      new ActionRowBuilder().addComponents(availabilityEnd),
      new ActionRowBuilder().addComponents(extraInfo)
    );

    await interaction.showModal(modal);
  },
};
