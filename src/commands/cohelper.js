const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { isStaff } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cohelper')
    .setDescription('Add a co-helper to the current ticket')
    .addUserOption(option =>
      option
        .setName('helper')
        .setDescription('The helper to add')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Check if user is staff
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Only carry helpers can use this command.',
        ephemeral: true,
      });
    }

    // Get ticket from current channel
    const ticket = db.ticket.getByChannel(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        content: '❌ This command must be used in a ticket channel.',
        ephemeral: true,
      });
    }

    const cohelper = interaction.options.getUser('helper');

    // Check if cohelper is staff
    const cohelperMember = await interaction.guild.members.fetch(cohelper.id).catch(() => null);
    if (!cohelperMember || !isStaff(cohelperMember)) {
      return interaction.reply({
        content: '❌ The specified user is not a carry helper.',
        ephemeral: true,
      });
    }

    // Check if same as main helper
    if (cohelper.id === ticket.helper_id) {
      return interaction.reply({
        content: '❌ This user is already the main helper for this ticket.',
        ephemeral: true,
      });
    }

    // Add cohelper
    db.ticket.setCohelper(ticket.id, cohelper.id);

    await interaction.reply({
      content: `✅ **${cohelper.username}** has been added as co-helper!\n\n` +
        `Both <@${ticket.helper_id}> and <@${cohelper.id}> will be credited when this carry is completed.`,
    });
  },
};
