# 🎮 TDS Carry Bot — Final Version

---

## ✅ Features Implemented

| Feature | Status |
|---------|--------|
| Session open/close control | ✅ |
| Ticket creation with form | ✅ |
| Timezone selection (split dropdown) | ✅ |
| Availability start/end times | ✅ |
| UTC time conversion | ✅ |
| Dynamic availability status | ✅ |
| Queue view with filters | ✅ |
| Claim tickets | ✅ |
| Find compatible tickets | ✅ |
| Merge tickets | ✅ |
| Co-helper support | ✅ |
| Complete with proof | ✅ |
| Close tickets | ✅ |

---

## 🔄 Final Workflow

### Player Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SELECT GAME MODE (dropdown)                                 │
│     → Easy 🟢 / Fallen 🟠 / Frost ❄️ / Event ⭐ (Lv.35+)      │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. SELECT TIMEZONE (two dropdowns)                             │
│     → 🌎 Americas (UTC-12 to UTC-1)                             │
│     → 🌍 Europe/Africa/Asia (UTC+0 to UTC+12)                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. FILL FORM (modal)                                           │
│     → Roblox username                                           │
│     → Level in TDS                                              │
│     → Availability START (e.g., "4pm", "now", "in 2 hours")     │
│     → Availability END (e.g., "9pm", "in 4 hours")              │
│     → Private server & chat (e.g., "yes, yes")                  │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. TICKET CREATED                                              │
│     → Private channel: #ticket-0001-username                    │
│     → Shows all info + Claim/Complete/Close buttons             │
│     → Times converted to UTC for matching                       │
│     → Player sees queue position                                │
└─────────────────────────────────────────────────────────────────┘
```

### Helper Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. VIEW QUEUE                                                  │
│     /queue [mode]                                               │
│                                                                 │
│     📋 All Waiting Tickets                                     │
│     🕐 Current UTC Time: 3:15 PM UTC                           │
│                                                                 │
│     #010 ❄️ 🟢 3PM - 8PM UTC • Lv.75 • 3m ago                  │
│     #011 ❄️ 🟢 3:12PM - 10PM UTC • Lv.42 • 2m ago              │
│     #014 ⭐ 🟢 1PM - 5PM UTC • Lv.85 • just now                │
│     #013 ⭐ 🟡 4:14PM - 6:14PM UTC • Lv.78 • just now          │
│     #012 ⭐ 🔴 6:13PM - 11:13AM UTC • Lv.85 • 1m ago           │
│                                                                 │
│     Legend:                                                     │
│     🟢 NOW (within availability window)                         │
│     🟡 SOON (starting within 1 hour)                            │
│     🔵 LATER (starting within 2 hours)                          │
│     ⏰ SCHEDULED (more than 2 hours away)                       │
│     🔴 EXPIRED (availability window passed)                     │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CLAIM TICKET                                                │
│     /claim ticket:10                                            │
│     OR click "Claim" button in ticket channel                   │
│                                                                 │
│     → Status changes to CLAIMED                                 │
│     → Player gets notified                                      │
│     → Other helpers see it's taken                              │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. FIND COMPATIBLE TICKETS (optional)                          │
│     /compatible ticket:10                                       │
│                                                                 │
│     Shows tickets with OVERLAPPING UTC availability             │
│     Same mode + times that overlap = can play together!         │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. MERGE TICKETS (optional)                                    │
│     /merge target:10 source:11                                  │
│                                                                 │
│     → Player from #11 added to #10's channel                    │
│     → Channel #11 auto-deleted                                  │
│     → Both players can be carried together                      │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. ADD CO-HELPER (optional)                                    │
│     /cohelper helper:@OtherHelper                               │
│                                                                 │
│     → Both helpers credited in proof                            │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. COMPLETE CARRY                                              │
│     /complete [screenshot]                                      │
│     OR click "Complete" button                                  │
│                                                                 │
│     → Auto-posts to #carry-proof:                               │
│       ✅ Carry Complete!                                        │
│       Mode: ⭐ Event                                            │
│       Tickets: #10, #11                                         │
│       Helpers: @helper1 @helper2                                │
│       Players: @player1 @player2                                │
│     → Channel deleted after 30 seconds                          │
└─────────────────────────────────────────────────────────────────┘
```

### Mod Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  SESSION CONTROL                                                │
│     /session open   → Enable ticket creation                    │
│     /session close  → Disable ticket creation                   │
│     /session status → View stats                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 All Commands

### Everyone
| Command | Description |
|---------|-------------|
| `/help` | Show available commands |

### Players
| Command | Description |
|---------|-------------|
| *(Use dropdown in ticket channel to create ticket)* | |

### Carry Helpers
| Command | Description |
|---------|-------------|
| `/queue [mode]` | View waiting tickets |
| `/claim <ticket>` | Claim a ticket |
| `/compatible <ticket>` | Find tickets with overlapping availability |
| `/merge <target> <source>` | Merge two tickets |
| `/cohelper <@user>` | Add a co-helper |
| `/complete [screenshot]` | Mark carry as complete |
| `/close [reason]` | Close ticket without completing |

### Moderators
| Command | Description |
|---------|-------------|
| `/session open` | Open carry session |
| `/session close` | Close carry session |
| `/session status` | View session statistics |
| `/setup` | Post the ticket panel (Admin) |

---

## ⏰ Time System

### How It Works
1. **Player selects timezone** from dropdown (UTC-12 to UTC+12)
2. **Player enters local times** (e.g., "4pm" to "9pm")
3. **Bot converts to UTC** (e.g., UTC+1 4pm → 3pm UTC)
4. **Queue shows all times in UTC** with current UTC time header
5. **Dynamic status** updates every time someone views queue:
   - 🟢 NOW = Current time is within window
   - 🟡 SOON = Starting within 1 hour
   - 🔵 LATER = Starting within 2 hours
   - ⏰ SCHEDULED = More than 2 hours away
   - 🔴 EXPIRED = Window has passed

### Time Formats Accepted
- `now`, `ready`, `yes` → Current time
- `4pm`, `16:00`, `4:30pm` → Specific time
- `in 2 hours`, `in 30 minutes` → Relative time

---

## 🗄️ Database Schema

```sql
-- Sessions
sessions (
  id, status, opened_at, closed_at, opened_by, ticket_count
)

-- Tickets
tickets (
  id, discord_user_id, roblox_username, level, mode,
  timezone, timezone_offset,
  available_type, available_start, available_end, available_display,
  private_server, can_chat,
  status, channel_id, helper_id, cohelper_id,
  merged_into, merged_from,
  created_at, claimed_at, completed_at, close_reason, session_id
)

-- Carry Proof
carry_proof (
  id, ticket_ids, helper_ids, player_ids, mode,
  screenshot_url, proof_message_id, completed_at
)

-- Blacklist
blacklist (
  discord_user_id, reason, blocked_by, blocked_at
)
```

---

## 📁 Project Structure

```
tds-carry-bot/
├── src/
│   ├── commands/
│   │   ├── claim.js
│   │   ├── close.js
│   │   ├── cohelper.js
│   │   ├── compatible.js
│   │   ├── complete.js
│   │   ├── help.js
│   │   ├── merge.js
│   │   ├── queue.js
│   │   ├── session.js
│   │   └── setup.js
│   ├── components/
│   │   ├── claimButton.js
│   │   ├── closeButton.js
│   │   ├── closeConfirmModal.js
│   │   ├── completeButton.js
│   │   ├── modeSelect.js
│   │   ├── ticketFormModal.js
│   │   └── timezoneSelect.js
│   ├── events/
│   │   ├── interactionCreate.js
│   │   └── ready.js
│   ├── utils/
│   │   ├── availability.js
│   │   ├── embeds.js
│   │   └── permissions.js
│   ├── config.js
│   ├── database.js
│   ├── deploy-commands.js
│   └── index.js
├── data/
│   └── carry.sqlite
├── package.json
├── .env
├── .gitignore
└── PLAN.md
```

---

## 🚀 Setup Instructions

### 1. Discord Developer Portal
1. Create application at https://discord.com/developers/applications
2. Go to Bot → Add Bot
3. Enable: Message Content Intent, Server Members Intent, Presence Intent
4. Copy bot token

### 2. Create .env File
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id

TICKET_CHANNEL_ID=channel_for_ticket_panel
CARRY_PROOF_CHANNEL_ID=channel_for_proof
TICKET_CATEGORY_ID=category_for_ticket_channels

CARRY_HELPER_ROLE_ID=helper_role
MOD_ROLE_ID=mod_role
```

### 3. Install & Run
```bash
npm install
npm run deploy-commands
npm start
```

### 4. In Discord
1. `/setup` in ticket channel → Posts the panel
2. `/session open` → Enables ticket creation
3. Players can now create tickets!

---

## 🔮 Future Improvements (Not Implemented)

- [ ] `/mystatus` - Player checks their ticket status
- [ ] `/cancel` - Player cancels their own ticket
- [ ] `/available` - Player updates their availability
- [ ] `/forceclose` - Mod force closes any ticket
- [ ] `/transfer` - Mod transfers ticket to another helper
- [ ] `/blacklist` - Block users from creating tickets
- [ ] `/stats` - View carry statistics
- [ ] Auto-close expired tickets
- [ ] Ticket timeout warnings (20 min, then close at 30 min)

---

## ✨ Key Improvements Over Tickets v2

| Problem | Solution |
|---------|----------|
| Bot crashes at 50-100 tickets | Uses local SQLite, no excessive API calls |
| Manual timezone matching | Auto-converts to UTC, finds overlapping windows |
| Clunky merging (3+ commands) | One `/merge` command handles everything |
| No claim system | Formal claim with buttons and commands |
| Manual proof posting | Auto-generates proof on `/complete` |
| Confusing availability input | Separate timezone dropdown + start/end times |
| Static availability status | Dynamic 🟢🟡🔵⏰🔴 based on current time |
