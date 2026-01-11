/**
 * Availability parsing and matching utilities
 * 
 * Key concept: All times are stored as UTC timestamps for easy comparison.
 * The user's timezone is used to convert their local time input to UTC.
 */

/**
 * Parse availability input and convert to UTC timestamps
 * 
 * @param {string} input - User's availability input (e.g., "now", "2 hours", "5pm-9pm")
 * @param {number} timezoneOffset - User's timezone offset in hours (e.g., 8 for UTC+8)
 * @returns {Object} { type, start, end, display }
 */
function parseAvailability(input, timezoneOffset) {
  const now = new Date();
  const normalizedInput = input.toLowerCase().trim();

  // "now" or "available now" or similar
  if (normalizedInput === 'now' || normalizedInput === 'yes' || normalizedInput === 'available' || normalizedInput === 'ready') {
    return {
      type: 'now',
      start: now.toISOString(),
      end: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(), // Assume 4 hour window
      display: 'Now',
    };
  }

  // "in X hours" or "X hours" or "Xh"
  const hoursMatch = normalizedInput.match(/(?:in\s+)?(\d+)\s*(?:hours?|hrs?|h)/i);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1]);
    const start = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return {
      type: hours <= 2 ? 'soon' : 'later',
      start: start.toISOString(),
      end: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      display: `In ${hours}h`,
    };
  }

  // "in X minutes" or "X minutes" or "Xm"
  const minsMatch = normalizedInput.match(/(?:in\s+)?(\d+)\s*(?:minutes?|mins?|m)/i);
  if (minsMatch) {
    const mins = parseInt(minsMatch[1]);
    const start = new Date(now.getTime() + mins * 60 * 1000);
    return {
      type: mins <= 30 ? 'now' : 'soon',
      start: start.toISOString(),
      end: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      display: `In ${mins}m`,
    };
  }

  // Time range: "5pm-9pm" or "17:00-21:00"
  const rangeMatch = normalizedInput.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (rangeMatch) {
    const startTime = parseTimeToUTC(
      parseInt(rangeMatch[1]),
      parseInt(rangeMatch[2]) || 0,
      rangeMatch[3],
      timezoneOffset
    );
    const endTime = parseTimeToUTC(
      parseInt(rangeMatch[4]),
      parseInt(rangeMatch[5]) || 0,
      rangeMatch[6],
      timezoneOffset
    );

    // If end is before start, assume it's the next day
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    const type = startTime <= now ? 'now' : (startTime - now < 2 * 60 * 60 * 1000 ? 'soon' : 'scheduled');
    return {
      type,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      display: formatTimeRange(rangeMatch),
    };
  }

  // Single time: "5pm" or "17:00"
  const singleTimeMatch = normalizedInput.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (singleTimeMatch) {
    const startTime = parseTimeToUTC(
      parseInt(singleTimeMatch[1]),
      parseInt(singleTimeMatch[2]) || 0,
      singleTimeMatch[3],
      timezoneOffset
    );

    // If time is in the past, assume tomorrow
    if (startTime < now) {
      startTime.setDate(startTime.getDate() + 1);
    }

    const type = startTime <= now ? 'now' : (startTime - now < 2 * 60 * 60 * 1000 ? 'soon' : 'scheduled');
    return {
      type,
      start: startTime.toISOString(),
      end: new Date(startTime.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      display: formatSingleTime(singleTimeMatch),
    };
  }

  // Default: treat as "now" if we can't parse
  return {
    type: 'now',
    start: now.toISOString(),
    end: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    display: input || 'Now',
  };
}

/**
 * Parse a time (hour, minute, am/pm) and convert to UTC Date
 */
function parseTimeToUTC(hour, minute, ampm, timezoneOffset) {
  const now = new Date();

  // Convert 12-hour to 24-hour if am/pm specified
  if (ampm) {
    if (ampm.toLowerCase() === 'pm' && hour !== 12) {
      hour += 12;
    } else if (ampm.toLowerCase() === 'am' && hour === 12) {
      hour = 0;
    }
  }

  // Create date in user's local time
  const localDate = new Date(now);
  localDate.setHours(hour, minute, 0, 0);

  // Convert to UTC by subtracting the timezone offset
  const utcDate = new Date(localDate.getTime() - timezoneOffset * 60 * 60 * 1000);

  return utcDate;
}

/**
 * Format a time range for display
 */
function formatTimeRange(match) {
  const startHour = match[1];
  const startMin = match[2] ? `:${match[2]}` : '';
  const startAmPm = match[3] || '';
  const endHour = match[4];
  const endMin = match[5] ? `:${match[5]}` : '';
  const endAmPm = match[6] || '';

  return `${startHour}${startMin}${startAmPm}-${endHour}${endMin}${endAmPm}`;
}

/**
 * Format a single time for display
 */
function formatSingleTime(match) {
  const hour = match[1];
  const min = match[2] ? `:${match[2]}` : '';
  const ampm = match[3] || '';

  return `${hour}${min}${ampm}`;
}

/**
 * Check if two availability windows overlap
 * 
 * @param {Object} ticket1 - First ticket with available_start and available_end
 * @param {Object} ticket2 - Second ticket with available_start and available_end
 * @returns {boolean} True if they overlap
 */
function doAvailabilitiesOverlap(ticket1, ticket2) {
  const start1 = new Date(ticket1.available_start);
  const end1 = ticket1.available_end ? new Date(ticket1.available_end) : new Date(start1.getTime() + 4 * 60 * 60 * 1000);
  const start2 = new Date(ticket2.available_start);
  const end2 = ticket2.available_end ? new Date(ticket2.available_end) : new Date(start2.getTime() + 4 * 60 * 60 * 1000);

  // Two ranges overlap if one starts before the other ends
  return start1 < end2 && start2 < end1;
}

/**
 * Get timezone display string from offset
 */
function getTimezoneDisplay(offset) {
  const sign = offset >= 0 ? '+' : '';
  const hours = Math.floor(Math.abs(offset));
  const mins = (Math.abs(offset) % 1) * 60;

  if (mins === 0) {
    return `UTC${sign}${offset}`;
  }
  return `UTC${sign}${hours}:${mins.toString().padStart(2, '0')}`;
}

module.exports = {
  parseAvailability,
  doAvailabilitiesOverlap,
  getTimezoneDisplay,
};
