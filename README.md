# 🎓 IskoBot

A Discord bot built for the Iskord Community Server, a space for incoming UP Diiman freshmen to connect and make friends. IskoBot helps incoming students find classmates, manage their class schedules, discover study buddies, and build class channel streaks all within Discord.

---

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Commands](#-commands)
- [Project Structure](#-project-structure)
- [Data Storage](#-data-storage)
- [Contributing](#-contributing)

---

## ✨ Features

- **Class Management** — Students can register their classes using course codes and schedule identifiers (e.g. `Math 21 TWHFX-1`)
- **Private Class Channels** — Automatically creates a private channel for each unique class. Only registered students can see and access their class channels
- **Classmate Finder** — Find other students in the same class or taking the same course
- **Study Buddy** — Randomly get matched with a classmate as a study buddy
- **Common Classes** — See which classes you share with a specific student
- **Class Streaks** — Class channels earn streaks when at least 3 different students message daily, similar to Snapchat streaks
- **Streak Leaderboard** — See which class channels have the longest active streaks
- **Welcome Messages** — New members are greeted when they join the server
- **FAQ System** — Keyword-based auto-responses for common questions

---

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org) v18 or higher
- A [Discord account](https://discord.com)
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

---

## 🚀 Installation

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/IskoBot.git
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

Data files are created automatically on first run. No manual setup needed!

---

## ⚙️ Configuration

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
- ✅ Server Members Intent
- ✅ Message Content Intent

---

## 💬 Commands

### Class Management

| Command | Description |
|---|---|
| `/addclass <course> <schedule>` | Add a class to your list. Creates a private class channel automatically |
| `/removeclass <course> <schedule>` | Remove a class from your list. Deletes the channel if no students remain |
| `/myclasses` | View all your registered classes |

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

### Streaks

| Command | Description |
|---|---|
| `/streak info <course> <schedule>` | View the current streak and today's activity for a class channel |
| `/streak leaderboard` | View the top 10 class channels ranked by streak |

---

## 📁 Project Structure

```
IskoBot/
├── src/
│   ├── commands/
│   │   ├── addclass.js
│   │   ├── removeclass.js
│   │   ├── myclasses.js
│   │   ├── findclassmate.js
│   │   ├── findcourse.js
│   │   ├── findstudybuddy.js
│   │   ├── commonclasses.js
│   │   └── streak.js
│   ├── data/                    ← auto-created on first run
│   │   ├── users.json
│   │   ├── streaks.json
│   │   └── faqs.json
│   ├── events/
│   │   ├── messageCreate.js     ← handles messages and streak tracking
│   │   ├── guildMemberAdd.js    ← welcome message on join
│   │   └── guildMemberRemove.js ← cleanup on leave
│   ├── utils/
│   │   ├── database.js          ← read/write helpers for users.json
│   │   ├── channelManager.js    ← class channel creation and management
│   │   ├── streakManager.js     ← streak logic
│   │   └── faqManager.js        ← faq file management
│   ├── deploy.js                ← registers slash commands with Discord
│   └── index.js                 ← main entry point
├── .env                         ← secret credentials (never commit this)
├── .gitignore
├── nodemon.json
└── package.json
```

---

## 🗄️ Data Storage

IskoBot uses JSON files for data storage — no database required. All files are created automatically on first run.

### `users.json`
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

### `streaks.json`
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

### `faqs.json`
Stores keyword-response pairs for the FAQ system.
```json
[
  {
    "keywords": ["enrollment", "enroll"],
    "response": "To enroll, visit the student portal at [link]."
  }
]
```

> ⚠️ The `src/data/` directory is listed in `.gitignore` to prevent student data from being committed to version control.

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

*Built with ❤️ for freshman students. Good luck this semester! 🎓*
