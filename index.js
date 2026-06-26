const mineflayer = require('mineflayer');
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

// ================= CONFIG =================
const PORT = process.env.PORT || 3000;
const DASH_KEY = process.env.DASHBOARD_KEY;

// ================= STATE =================
let bot;
let playersCount = 0;
let botStatus = "offline";

// ================= EXPRESS (DASHBOARD) =================
const app = express();
app.use(express.json());

// 🌐 Home page
app.get('/', (req, res) => {
  res.send("MC Bot Dashboard Running ✅");
});

// 📊 Dashboard JSON API
app.get('/api/status', (req, res) => {
  res.json({
    status: botStatus,
    players: playersCount
  });
});

// 🎛️ CONTROL API (Dashboard buttons)
app.post('/api/control', (req, res) => {

  if (req.headers.key !== DASH_KEY) {
    return res.status(403).send("No Access");
  }

  const action = req.body.action;

  if (action === "restart") {
    restartBot();
    return res.json({ ok: true, msg: "restarted" });
  }

  if (action === "say") {
    if (bot && req.body.message) {
      bot.chat(req.body.message);
      return res.json({ ok: true });
    }
  }

  res.json({ ok: false });
});

app.listen(PORT, () => {
  console.log("Dashboard running on port " + PORT);
});

// ================= DISCORD =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function log(msg) {
  const ch = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (ch) ch.send(msg).catch(() => {});
}

// ================= MINECRAFT BOT =================
function startBot() {

  bot = mineflayer.createBot({
    host: process.env.MC_HOST,
    port: process.env.MC_PORT,
    username: process.env.MC_USERNAME,
    auth: 'offline',
    version: "1.21.11"
  });

  botStatus = "connecting";

  bot.on('spawn', () => {
    botStatus = "online";
    log("🟢 Bot Connected");

    // حركة بسيطة
    setInterval(() => {
      if (!bot || !bot.entity) return;

      bot.setControlState('forward', true);

      if (Math.random() > 0.7) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }

    }, 4000);
  });

  // 👥 Players tracking
  bot.on('playerJoined', (p) => {
    playersCount = Object.keys(bot.players).length;
    log(`🟢 Joined: ${p.username}`);
  });

  bot.on('playerLeft', (p) => {
    playersCount = Object.keys(bot.players).length;
    log(`🔴 Left: ${p.username}`);
  });

  // 💬 chat relay
  bot.on('chat', (u, msg) => {
    log(`💬 ${u}: ${msg}`);
  });

  // 🔄 restart
  bot.on('end', () => {
    botStatus = "offline";
    setTimeout(startBot, 5000);
  });

  bot.on('error', (e) => {
    log("⚠️ " + e.message);
  });
}

// ================= DISCORD =================
client.once('ready', () => {
  console.log("Discord Ready");

  // panel command
  client.on('messageCreate', (msg) => {

    if (msg.content === "!panel") {
      msg.reply(`
🎛️ Dashboard Commands:

📊 GET STATUS:
GET /api/status

🎮 CONTROL:
POST /api/control
- restart
- say
      `);
    }

    // 💬 send message to minecraft
    if (msg.content.startsWith("!say ")) {
      const text = msg.content.slice(5);
      if (bot) bot.chat(text);
    }

    // 🔄 restart bot
    if (msg.content === "!restart") {
      restartBot();
      msg.reply("🔄 Restarting...");
    }

  });
});

// ================= SAFE RESTART =================
function restartBot() {
  try {
    bot?.end();
  } catch {}
  setTimeout(startBot, 3000);
}

// ================= CRASH PROTECTION =================
process.on('uncaughtException', (e) => {
  console.log("Crash:", e.message);
  restartBot();
});

process.on('unhandledRejection', () => {
  restartBot();
});

// ================= START =================
client.login(process.env.DISCORD_TOKEN);
startBot();
