const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Database file path
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'carry.sqlite');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database instance (will be initialized)
let db = null;

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT DEFAULT 'closed' CHECK(status IN ('open', 'closed')),
      opened_at DATETIME,
      closed_at DATETIME,
      opened_by TEXT,
      ticket_count INTEGER DEFAULT 0
    );

    -- Tickets table
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_user_id TEXT NOT NULL,
      roblox_username TEXT NOT NULL,
      level INTEGER NOT NULL,
      mode TEXT NOT NULL,
      timezone TEXT NOT NULL,
      timezone_offset REAL NOT NULL,
      available_type TEXT DEFAULT 'now' CHECK(available_type IN ('now', 'soon', 'later', 'scheduled')),
      available_start DATETIME NOT NULL,
      available_end DATETIME,
      available_display TEXT,
      private_server TEXT DEFAULT 'yes',
      can_chat TEXT DEFAULT 'yes',
      status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'claimed', 'in_progress', 'completed', 'closed', 'merged')),
      channel_id TEXT,
      helper_id TEXT,
      cohelper_id TEXT,
      merged_into INTEGER,
      merged_from TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      claimed_at DATETIME,
      completed_at DATETIME,
      close_reason TEXT,
      session_id INTEGER,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (merged_into) REFERENCES tickets(id)
    );

    -- Carry proof table
    CREATE TABLE IF NOT EXISTS carry_proof (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_ids TEXT NOT NULL,
      helper_ids TEXT NOT NULL,
      player_ids TEXT NOT NULL,
      mode TEXT NOT NULL,
      screenshot_url TEXT,
      proof_message_id TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Blacklist table
    CREATE TABLE IF NOT EXISTS blacklist (
      discord_user_id TEXT PRIMARY KEY,
      reason TEXT,
      blocked_by TEXT NOT NULL,
      blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_mode ON tickets(mode);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_session ON tickets(session_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_helper ON tickets(helper_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(discord_user_id);`);

  // Save database
  saveDatabase();
  
  console.log('✅ Database initialized');
  return db;
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Auto-save every 30 seconds
setInterval(saveDatabase, 30000);

// Helper to get single row
function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Helper to get all rows
function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper to run a statement
function run(sql, params = []) {
  db.run(sql, params);
  const result = db.exec("SELECT last_insert_rowid() as id");
  const lastId = result[0]?.values[0]?.[0] || null;
  saveDatabase();
  return { lastInsertRowid: lastId };
}

// ============== SESSION FUNCTIONS ==============

const session = {
  getCurrent: () => getOne(`SELECT * FROM sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1`),
  
  open: (userId) => {
    run(`INSERT INTO sessions (status, opened_at, opened_by) VALUES ('open', datetime('now'), ?)`, [userId]);
    return session.getCurrent();
  },
  
  close: (sessionId) => {
    run(`UPDATE sessions SET status = 'closed', closed_at = datetime('now') WHERE id = ?`, [sessionId]);
  },
  
  incrementTickets: (sessionId) => {
    run(`UPDATE sessions SET ticket_count = ticket_count + 1 WHERE id = ?`, [sessionId]);
  },
  
  getStats: (sessionId) => getOne(`
    SELECT 
      s.*,
      (SELECT COUNT(*) FROM tickets WHERE session_id = s.id) as total_tickets,
      (SELECT COUNT(*) FROM tickets WHERE session_id = s.id AND status = 'waiting') as waiting,
      (SELECT COUNT(*) FROM tickets WHERE session_id = s.id AND status = 'claimed') as claimed,
      (SELECT COUNT(*) FROM tickets WHERE session_id = s.id AND status = 'completed') as completed,
      (SELECT COUNT(*) FROM tickets WHERE session_id = s.id AND status = 'closed') as closed
    FROM sessions s WHERE s.id = ?
  `, [sessionId]),
};

// ============== TICKET FUNCTIONS ==============

const ticket = {
  create: (data) => {
    const result = run(`
      INSERT INTO tickets (
        discord_user_id, roblox_username, level, mode, 
        timezone, timezone_offset, available_type, available_start, available_end, available_display,
        private_server, can_chat, channel_id, session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.discordUserId,
      data.robloxUsername,
      data.level,
      data.mode,
      data.timezone,
      data.timezoneOffset,
      data.availableType,
      data.availableStart,
      data.availableEnd,
      data.availableDisplay,
      data.privateServer,
      data.canChat,
      data.channelId,
      data.sessionId
    ]);
    return result.lastInsertRowid;
  },

  getById: (id) => getOne(`SELECT * FROM tickets WHERE id = ?`, [id]),

  getByChannel: (channelId) => getOne(`SELECT * FROM tickets WHERE channel_id = ?`, [channelId]),

  getByUser: (userId) => getOne(`
    SELECT * FROM tickets WHERE discord_user_id = ? AND status IN ('waiting', 'claimed', 'in_progress')
  `, [userId]),

  getWaiting: () => getAll(`
    SELECT * FROM tickets 
    WHERE status = 'waiting' AND merged_into IS NULL
    ORDER BY 
      CASE available_type 
        WHEN 'now' THEN 0 
        WHEN 'soon' THEN 1 
        WHEN 'later' THEN 2 
        WHEN 'scheduled' THEN 3 
      END,
      created_at ASC
  `),

  getWaitingByMode: (mode) => getAll(`
    SELECT * FROM tickets 
    WHERE status = 'waiting' AND mode = ? AND merged_into IS NULL
    ORDER BY 
      CASE available_type 
        WHEN 'now' THEN 0 
        WHEN 'soon' THEN 1 
        WHEN 'later' THEN 2 
        WHEN 'scheduled' THEN 3 
      END,
      created_at ASC
  `, [mode]),

  getCompatible: (ticketId, mode, availStart, availEnd) => getAll(`
    SELECT * FROM tickets 
    WHERE id != ? 
      AND status = 'waiting' 
      AND mode = ?
      AND merged_into IS NULL
      AND (
        (available_start <= ? AND (available_end IS NULL OR available_end >= ?))
        OR (available_start >= ? AND available_start <= ?)
      )
    ORDER BY created_at ASC
  `, [ticketId, mode, availEnd, availStart, availStart, availEnd]),

  updateStatus: (id, status) => run(`UPDATE tickets SET status = ? WHERE id = ?`, [status, id]),

  claim: (id, helperId) => run(`
    UPDATE tickets SET status = 'claimed', helper_id = ?, claimed_at = datetime('now') WHERE id = ?
  `, [helperId, id]),

  unclaim: (id) => run(`
    UPDATE tickets SET status = 'waiting', helper_id = NULL, claimed_at = NULL WHERE id = ?
  `, [id]),

  setCohelper: (id, cohelperId) => run(`UPDATE tickets SET cohelper_id = ? WHERE id = ?`, [cohelperId, id]),

  merge: (sourceId, targetId) => {
    // Mark source as merged
    run(`UPDATE tickets SET status = 'merged', merged_into = ? WHERE id = ?`, [targetId, sourceId]);
    // Update target's merged_from array
    const target = ticket.getById(targetId);
    const mergedFrom = JSON.parse(target.merged_from || '[]');
    mergedFrom.push(sourceId);
    run(`UPDATE tickets SET merged_from = ? WHERE id = ?`, [JSON.stringify(mergedFrom), targetId]);
  },

  complete: (id) => run(`UPDATE tickets SET status = 'completed', completed_at = datetime('now') WHERE id = ?`, [id]),

  close: (id, reason) => run(`UPDATE tickets SET status = 'closed', close_reason = ? WHERE id = ?`, [reason, id]),

  updateAvailability: (id, type, start, end, display) => {
    run(`UPDATE tickets SET available_type = ?, available_start = ?, available_end = ?, available_display = ? WHERE id = ?`,
      [type, start, end, display, id]);
  },

  getQueuePosition: (ticketId, mode) => {
    const result = getOne(`
      SELECT COUNT(*) + 1 as position FROM tickets 
      WHERE status = 'waiting' 
        AND mode = ? 
        AND created_at < (SELECT created_at FROM tickets WHERE id = ?)
    `, [mode, ticketId]);
    return result ? result.position : 1;
  },
};

// ============== BLACKLIST FUNCTIONS ==============

const blacklist = {
  add: (userId, reason, blockedBy) => run(`
    INSERT OR REPLACE INTO blacklist (discord_user_id, reason, blocked_by) VALUES (?, ?, ?)
  `, [userId, reason, blockedBy]),

  remove: (userId) => run(`DELETE FROM blacklist WHERE discord_user_id = ?`, [userId]),

  check: (userId) => getOne(`SELECT * FROM blacklist WHERE discord_user_id = ?`, [userId]),

  getAll: () => getAll(`SELECT * FROM blacklist ORDER BY blocked_at DESC`),
};

// ============== CARRY PROOF FUNCTIONS ==============

const proof = {
  create: (data) => {
    const result = run(`
      INSERT INTO carry_proof (ticket_ids, helper_ids, player_ids, mode, screenshot_url, proof_message_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      JSON.stringify(data.ticketIds),
      JSON.stringify(data.helperIds),
      JSON.stringify(data.playerIds),
      data.mode,
      data.screenshotUrl || null,
      data.proofMessageId || null
    ]);
    return result.lastInsertRowid;
  },

  getRecent: (limit = 10) => getAll(`SELECT * FROM carry_proof ORDER BY completed_at DESC LIMIT ?`, [limit]),
};

// ============== EXPORT ==============

module.exports = {
  initDatabase,
  saveDatabase,
  session,
  ticket,
  blacklist,
  proof,
};
