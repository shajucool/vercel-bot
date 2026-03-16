# Casper Moderation Bot - Vercel Deployment

## Project Structure
```
vercel-bot/
├── api/
│   ├── bot.js            # Main bot logic (webhook handler)
│   └── set-webhook.js    # One-time webhook setup endpoint
├── package.json
├── vercel.json
└── README.md
```

## Deploy to Vercel

### 1. Push to GitHub
Push the `vercel-bot/` folder contents to a GitHub repo (the `api/`, `package.json`, `vercel.json` should be at the root of the repo).

### 2. Import in Vercel
- Go to [vercel.com](https://vercel.com) → **Add New Project**
- Import your GitHub repo
- Vercel auto-detects the serverless functions

### 3. Set Environment Variables
In Vercel dashboard → **Settings → Environment Variables**, add:

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | **YES** | Telegram bot token from @BotFather |
| `MONGO_URL` | Recommended | MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net`) |
| `DB_NAME` | No | Database name (default: `casper_bot`) |
| `WEBHOOK_SECRET` | No | Optional secret for webhook verification |
| `WEBHOOK_URL` | No | Override webhook URL (auto-detected from VERCEL_URL) |

> **MongoDB is recommended** for last-speaker tracking and language detection.
> Without it, commands work only via reply or @mention (no last-speaker fallback).
> Free option: [MongoDB Atlas](https://www.mongodb.com/atlas) free tier.

### 4. Deploy
Click **Deploy**. Vercel installs deps and deploys the serverless functions.

### 5. Register Webhook
After deployment, visit this URL **once** in your browser:

```
https://YOUR-APP.vercel.app/api/set-webhook
```

This tells Telegram to send updates to your Vercel endpoint.

You can also set it manually with curl:
```bash
curl "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://YOUR-APP.vercel.app/api/bot"
```

### 6. Verify
- Send `/help` to your bot in Telegram
- Check Vercel **Function Logs** for any errors

---

## Architecture

```
Telegram Cloud ──POST──▸ Vercel /api/bot ──▸ Telegraf ──▸ Reply
                           │
                           ▼
                        MongoDB (optional)
                    ┌──────────────────┐
                    │ last_speakers    │  per-group tracking
                    │ user_cache       │  username → user_id
                    │ user_messages    │  language detection
                    │ bot_stats        │  command counters
                    └──────────────────┘
```

## Commands (38 total)
- **Mute (10):** /shutup, /shush, /ftg, /bec, /stopbarking, /artdejapper, /sybau, /goofy, /keh, /vio
- **Unmute (2):** /talk, /parle
- **Kick (3):** /sort, /getout, /decawlis
- **Ban (3):** /vazintm, /bouge, /ciao
- **Admin (3):** /levelup, /assistoi, /leveldown
- **Fun (8):** /pussy, /shifta, /ntm, /cap, /mgd, /fu, /gay, /lesbien
- **Owner (8):** /papa, /pere, /boss, /patron, /chef, /owner, /roi, /king
- **Help (1):** /help

## Important Notes
- **No polling** — uses Telegram webhooks (Vercel-compatible)
- **Serverless-safe** — no `bot.launch()`, no infinite loops
- **Stateless by design** — all state stored in MongoDB
- **Owner protected** — @casperthe6ix (ID: 7109454163) immune to all punishments
- **10s function timeout** — all operations complete well within this limit
