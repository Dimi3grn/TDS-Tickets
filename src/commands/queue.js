const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { createQueueEmbed } = require('../utils/embeds');
const { isStaff } = require('../utils/permissions');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View waiting tickets in the queue')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Filter by game mode')
        .setRequired(false)
        .addChoices(
          ...config.gameModes.map(m => ({ name: m.name, value: m.value }))
        )
    )
    .addBooleanOption(option =>
      option
        .setName('available_now')
        .setDescription('Only show tickets available NOW')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Check if user is staff
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Only carry helpers can view the queue.',
        ephemeral: true,
      });
    }

    // Defer reply to prevent timeout
    await interaction.deferReply({ ephemeral: true });

    const mode = interaction.options.getString('mode');
    const availableNow = interaction.options.getBoolean('available_now');

    // Get tickets
    let tickets = mode 
      ? db.ticket.getWaitingByMode(mode)
      : db.ticket.getWaiting();

    // Filter by available now if requested
    if (availableNow) {
      tickets = tickets.filter(t => t.available_type === 'now');
    }

    const embed = createQueueEmbed(tickets, mode);

    await interaction.editReply({ 
      embeds: [embed],
    });
  },
};
