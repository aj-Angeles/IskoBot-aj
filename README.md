# 🎓 IskoBot

A Discord bot built for the Iskord Community Server, a space for incoming UP Diliman freshmen to connect and make friends. IskoBot helps incoming students find classmates, manage their class schedules, discover study buddies, and build class channel streaks all within Discord.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Recent commits](#recent-commits)
- [Commands](#commands)
- [Project Structure](#project-structure)
- [Data Storage](#data-storage)
- [Contributing](#contributing)

---

## Features

- **Class Management** — Students can register their classes using course codes and schedule identifiers (e.g. `Math 21 TWHFX-1`)
- **Private Class Channels** — Automatically creates a private channel for each unique class. Only registered students can see and access their class channels
- **Classmate Finder** — Find other students in the same class or taking the same course
- **Study Buddy** — Randomly get matched with a classmate as a study buddy
- **Common Classes** — See which classes you share with a specific student
- **Resources** — Share and browse study resources per course, accessible to all sections
- **Class Streaks** — Class channels earn streaks when at least 3 different students message daily, similar to Snapchat streaks
- **Streak Leaderboard** — See which class channels have the longest active streaks
- **User Profiles** — View your own or another student's profile including their college and registered classes
- **College Info** — See how many students are registered per UP Diliman college
- **Server Statistics** — Dashboard showing total students, classes, streaks, and most popular courses
- **Welcome Messages** — New members are greeted when they join the server
- **FAQ System** — Keyword-based auto-responses for common questions
- **College Advice** — Random college survival tips for freshmen
- **Admin Suite** — Full admin command system for managing users, classes, resources, roles, and data
- **User Reports** — Members can `/report` to staff; admins configure the report channel and ping role with `/admin configurereports` (no env-only channel requirement)

---

## Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- A [Discord account](https://discord.com)
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

---

## Installation

**1. Clone the repository**
```bash
git clone https://github.com/aj-Angeles/IskoBot.git
cd IskoBot
```

**2. Install dependencies**
```bash
npm install
```

**3. Create your `.env` file** in the root directory:
```
TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_server_id_here
```

**4. Start the bot**
```bash
npm start
```

Data files and college roles are created automatically on first run. No manual setup needed!

---

## Configuration

### Getting Your Credentials

| Variable | Where to Find |
|---|---|
| `TOKEN` | Discord Developer Portal → Your App → Bot → Reset Token |
| `CLIENT_ID` | Discord Developer Portal → Your App → General Information → Application ID |
| `GUILD_ID` | Discord → Right-click your server icon → Copy Server ID (requires Developer Mode) |

### Enabling Developer Mode in Discord
Go to **User Settings → Advanced → Developer Mode** and toggle it on.

### Bot Permissions Required
When inviting the bot to your server, make sure it has the following permissions:
- Manage Channels
- Manage Roles
- View Channels
- Send Messages
- Read Message History
- Mention Everyone

Use this invite URL (replace `YOUR_CLIENT_ID`):
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=274877908992
```

### Required Privileged Gateway Intents
In the Discord Developer Portal under your app's **Bot** tab, enable:
- Server Members Intent
- Message Content Intent

### Reports (`/report`)

Staff destination is stored in `src/data/guildConfig.json` (auto-created). **Administrators** should run:

- **`/admin configurereports`** — Set the **channel** where `/report` submissions are posted and the **role** to ping (optional). Run it with **no options** to see the current channel and ping role. Use **`clear_channel`** / **`clear_role`** booleans to remove stored values.

Optional legacy: you can still set `REPORT_CHANNEL_ID` in `.env` as a fallback when no channel is stored in guild config (slash command settings take precedence when set).

### College Roles
College roles are created automatically on first bot start. They will appear hoisted (separated) on the member list. The following roles will be created:
- College of Architecture
- College of Arts and Letters
- College of Education
- College of Engineering
- College of Fine Arts
- College of Home Economics
- College of Human Kinetics
- College of Law
- College of Media and Communication
- College of Music
- College of Science
- College of Social Sciences and Philosophy
- National College of Public Administration and Governance
- School of Economics
- School of Library and Information Studies
- School of Statistics

---

## Recent commits

Latest updates on this repository (see `git log` for full history):

| Commit | Summary |
|--------|---------|
| `dd5dcfd` | Moved several commands under `/admin` (admin-only surface). |
| `d5bcce6` | Auto-create college roles on first run; ephemeral `/admin addrole` / `removerole`. |
| `cad81b6` | README table of contents fix. |

After pulling, run `npm install`, then `node src/deploy.js` whenever slash commands change, then start the bot (`npm run prod` or `npm start`).

---

## Commands

### Class Management

| Command | Description |
|---|---|
| `/addclass <course> <schedule>` | Add a class to your list. Creates a private class channel automatically |
| `/removeclass <course> <schedule>` | Remove a class from your list. Deletes the channel if no students remain |
| `/myclasses` | View all your registered classes |
| `/clearclasses` | Remove yourself from all classes at once. Useful at the end of the semester! |

### Classmate Finder

| Command | Description |
|---|---|
| `/findclassmate` | Show all classmates across all your classes |
| `/findclassmate <class>` | Show classmates in a specific class |
| `/findcourse <course>` | Show all students taking a course, grouped by schedule |
| `/commonclasses <user>` | Show classes you share with a specific user |

### Study Buddy

| Command | Description |
|---|---|
| `/findstudybuddy` | Get a randomly selected study buddy from any of your classes |
| `/findstudybuddy <class>` | Get a randomly selected study buddy from a specific class |

### Resources

| Command | Description |
|---|---|
| `/resources add <course> <title> <link>` | Add a study resource for a course. Shared across all sections |
| `/resources list <course>` | Browse all study resources shared for a course |

### Streaks

| Command | Description |
|---|---|
| `/streak info <course> <schedule>` | View the current streak and today's activity for a class channel |
| `/streak leaderboard` | View the top 10 class channels ranked by streak |

### Info and Stats

| Command | Description |
|---|---|
| `/userinfo` | View your own profile — college and registered classes |
| `/userinfo <user>` | View another student's profile |
| `/classinfo <course> <schedule>` | View info about a specific class — students, streak, resources |
| `/serverstats` | View server-wide statistics |
| `/collegeinfo` | View student counts for all UP Diliman colleges |
| `/collegeinfo <college>` | View students registered under a specific college |

### Reports

| Command | Description |
|---|---|
| `/report <user> <reason>` | Send a report to staff (ephemeral confirmation for the reporter). Requires a configured report channel. |

### Misc

| Command | Description |
|---|---|
| `/advice` | Get a random college survival tip |
| `/help` | Show the full command list with descriptions |

### Admin Only

> These commands are only visible and accessible to server administrators.

| Command | Description |
|---|---|
| `/admin addclass <user> <course> <schedule>` | Add a class to a specific user |
| `/admin removeclass <user> <course> <schedule>` | Remove a class from a specific user |
| `/admin clearclasses <user>` | Clear all classes from a specific user |
| `/admin removeuser <user>` | Completely erase a user from the system |
| `/admin removeresource <course> <number>` | Remove a specific resource from a course by its number |
| `/admin clearresources <course>` | Wipe all resources for a specific course |
| `/admin addrole <user> <role>` | Assign a college role to a user |
| `/admin removerole <user> <role>` | Remove a college role from a user |
| `/admin wipedata <target>` | Wipe bot data — choose from users, streaks, resources, faqs, or all |
| `/admin configurereports` | Set or view the `/report` **channel** and **ping role**; optional `clear_channel` / `clear_role` |

---

## Project Structure

```
IskoBot-aj/
├── src/
│   ├── commands/
│   │   ├── addclass.js
│   │   ├── removeclass.js
│   │   ├── clearclasses.js
│   │   ├── myclasses.js
│   │   ├── findclassmate.js
│   │   ├── findcourse.js
│   │   ├── findstudybuddy.js
│   │   ├── commonclasses.js
│   │   ├── resources.js
│   │   ├── streak.js
│   │   ├── userinfo.js
│   │   ├── classinfo.js
│   │   ├── serverstats.js
│   │   ├── collegeinfo.js
│   │   ├── advice.js
│   │   ├── help.js
│   │   ├── report.js
│   │   └── admin.js
│   ├── data/                    <- auto-created on first run
│   │   ├── users.json
│   │   ├── streaks.json
│   │   ├── resources.json
│   │   ├── guildConfig.json
│   │   └── faqs.json
│   ├── events/
│   │   ├── messageCreate.js     <- handles messages and streak tracking
│   │   ├── guildMemberAdd.js    <- welcome message on join
│   │   └── guildMemberRemove.js <- cleanup on leave
│   ├── utils/
│   │   ├── database.js          <- read/write helpers for users.json
│   │   ├── channelManager.js    <- class channel creation and management
│   │   ├── streakManager.js     <- streak logic
│   │   ├── resourceManager.js   <- resource file management
│   │   ├── guildConfig.js       <- per-guild report settings
│   │   └── faqManager.js        <- faq file management
│   ├── deploy.js                <- registers slash commands with Discord
│   └── index.js                 <- main entry point
├── .env                         <- secret credentials (never commit this)
├── .gitignore
├── nodemon.json
└── package.json
```

---

## Data Storage

IskoBot uses JSON files for data storage — no database required. All files are created automatically on first run.

### users.json
Stores each student's Discord ID, username, and registered classes.
```json
{
  "123456789012345678": {
    "userId": "123456789012345678",
    "username": "john_doe",
    "classes": [
      { "course": "Math 21", "schedule": "TWHFX-1" },
      { "course": "Stat 117", "schedule": "THV" }
    ]
  }
}
```

### streaks.json
Stores streak data per class channel.
```json
{
  "math-21-twhfx-1": {
    "streak": 5,
    "lastUpdated": "2024-01-15",
    "todayUsers": ["123456789", "987654321", "112233445"]
  }
}
```

### resources.json
Stores study resources per course.
```json
{
  "Math 21": [
    {
      "title": "Math 21 Reviewer",
      "link": "https://drive.google.com/...",
      "addedBy": "john_doe",
      "addedAt": "2024-01-15"
    }
  ]
}
```

### guildConfig.json

Stores report routing for `/report`:

```json
{
  "reportChannelId": "123456789012345678",
  "reportPingRoleId": "987654321098765432"
}
```

Managed via `/admin configurereports`. Omit or set keys to `null` when unused. Optional `REPORT_CHANNEL_ID` in `.env` is used only when `reportChannelId` is not set.

### faqs.json
Stores keyword-response pairs for the FAQ system.
```json
[
  {
    "keywords": ["enrollment", "enroll"],
    "response": "To enroll, visit the student portal at [link]."
  }
]
```

> The `src/data/` directory is listed in `.gitignore` to prevent student data from being committed to version control.

---

## Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

*Built with love for freshman students. Good luck this semester!*
