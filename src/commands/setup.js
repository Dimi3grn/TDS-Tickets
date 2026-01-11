const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const db = require('../database');
const { createTicketPanelEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post the ticket request panel in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const session = db.session.getCurrent();
    const embed = createTicketPanelEmbed(session);

    // Create mode selection dropdown
    const selectMenu = new StringSelectMenuBuilder()
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

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Send the panel
    await interaction.channel.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.editReply({
      content: '✅ Ticket panel has been posted!\n\n' +
        '**Next steps:**\n' +
        '1. Use `/session open` to allow ticket creation\n' +
        '2. Use `/session close` to stop new tickets',
    });
  },
};
