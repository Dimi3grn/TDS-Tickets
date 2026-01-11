const config = require('../config');

/**
 * Check if a member has the Carry Helper role
 */
function isCarryHelper(member) {
  if (!member || !config.roles.carryHelper) return false;
  return member.roles.cache.has(config.roles.carryHelper);
}

/**
 * Check if a member has the Mod role
 */
function isMod(member) {
  if (!member || !config.roles.mod) return false;
  return member.roles.cache.has(config.roles.mod);
}

/**
 * Check if a member is a helper OR a mod
 */
function isStaff(member) {
  return isCarryHelper(member) || isMod(member);
}

/**
 * Check if a member has admin permissions
 */
function isAdmin(member) {
  if (!member) return false;
  return member.permissions.has('Administrator');
}

module.exports = {
  isCarryHelper,
  isMod,
  isStaff,
  isAdmin,
};
