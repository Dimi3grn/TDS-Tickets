const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const db = require('../database');

module.exports = {
  async execute(interaction, args) {
    const selectedMode = interaction.values[0];
    const modeConfig = config.gameModes.find(m => m.value === selectedMode);

    // Check if session is open
    const session = db.session.getCurrent();
    if (!session || session.status !== 'open') {
      return interaction.reply({
        content: '❌ Carry service is currently **closed**. Please wait for a session to open.',
        ephemeral: true,
      });
    }

    // Check if user is blacklisted
    const blacklisted = db.blacklist.check(interaction.user.id);
    if (blacklisted) {
      return interaction.reply({
        content: `❌ You are blocked from creating tickets.\n**Reason:** ${blacklisted.reason || 'No reason provided'}`,
        ephemeral: true,
      });
    }

    // Check if user already has an open ticket (disabled for testing)
    // const existingTicket = db.ticket.getByUser(interaction.user.id);
    // if (existingTicket) {
    //   return interaction.reply({
    //     content: `❌ You already have an open ticket: <#${existingTicket.channel_id}>\nPlease wait for it to be completed or cancel it first.`,
    //     ephemeral: true,
    //   });
    // }

    // Split timezones into negative (Americas) and positive (Europe/Asia)
    const negativeTimezones = config.timezones.filter(tz => parseFloat(tz.value) < 0);
    const positiveTimezones = config.timezones.filter(tz => parseFloat(tz.value) >= 0);

    // Create two dropdowns with different IDs
    const negativeSelect = new StringSelectMenuBuilder()
      .setCustomId(`timezone:${selectedMode}:neg`)
      .setPlaceholder('🌎 Americas (UTC-12 to UTC-1)')
      .addOptions(
        negativeTimezones.map(tz => ({
          label: tz.name,
          value: tz.value,
        }))
      );

    const positiveSelect = new StringSelectMenuBuilder()
      .setCustomId(`timezone:${selectedMode}:pos`)
      .setPlaceholder('🌍 Europe / Africa / Asia (UTC+0 to UTC+12)')
      .addOptions(
        positiveTimezones.map(tz => ({
          label: tz.name,
          value: tz.value,
        }))
      );

    const row1 = new ActionRowBuilder().addComponents(negativeSelect);
    const row2 = new ActionRowBuilder().addComponents(positiveSelect);

    await interaction.reply({
      content: `${modeConfig?.emoji || '🎮'} **${modeConfig?.name || selectedMode}** mode selected!\n\n🌍 **Step 2:** Select your timezone from one of the dropdowns below:`,
      components: [row1, row2],
      ephemeral: true,
    });

    // Reset the original dropdown by editing the message
    // This allows selecting the same mode again for a new ticket
    try {
      const originalMessage = interaction.message;
      if (originalMessage) {
        // Re-create the dropdown to reset selection state
        const resetSelect = new StringSelectMenuBuilder()
          .setCustomId('mode')
          .setPlaceholder('🎮 Select a game mode...')
          .addOptions(
            config.gameModes.map(mode => ({
              label: mode.name,
              description: mode.minLevel > 0 ? `Requires Level ${mode.minLevel}+` : 'Available for all levels',
              value: mode.value,
              emoji: mode.emoji,
            }))
          );
        const resetRow = new ActionRowBuilder().addComponents(resetSelect);
        await originalMessage.edit({ components: [resetRow] });
      }
    } catch (error) {
      // Ignore errors - dropdown reset is not critical
    }
  },
};
