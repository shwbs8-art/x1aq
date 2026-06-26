const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const mcDataLoader = require('minecraft-data');
const express = require('express');
const mongoose = require('mongoose');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { GoalNear } = goals;

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"));

const PlayerSchema = new mongoose.Schema({
  name: String,
  action: String,
  time: { type: Date, default: Date.now }
});

const PlayerLog = mongoose.model("PlayerLog", PlayerSchema);

// ================= WEB =================
const app = express();
app.get('/', (req, res) => res.send("Bot Running"));
app.get('/status', (req, res) => {
  res.json({
    status: "online",
    players: playersCount
  });
});
app.listen(3000);

// ================= DISCORD =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let bot;
let mcData;
let move;
let playersCount = 0;

// ================= LOG =================
function log(msg) {
  const ch = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
  if (ch) ch.send(msg).catch(() => {});
}

function status(msg) {
  const ch = client.channels.cache.get(process.env.CHANNEL_ID);
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

  bot.loadPlugin(pathfinder);

  bot.on('spawn', () => {

    log("🟢 Bot Online");

    mcData = mcDataLoader(bot.version);
    move = new Movements(bot, mcData);
    bot.pathfinder.setMovements(move);

    smartAI();
    startWelcomeMessages();
  });

  // ================= SMART AI =================
  function smartAI() {
    setInterval(() => {

      if (!bot || !bot.entity) return;

      try {
        const pos = bot.entity.position;

        const x = pos.x + (Math.random() * 14 - 7);
        const z = pos.z + (Math.random() * 14 - 7);

        bot.pathfinder.setGoal(new GoalNear(x, pos.y, z, 1));

        bot.look(
          Math.random() * Math.PI * 2,
          (Math.random() - 0.5) * 0.5,
          true
        );

        if (Math.random() > 0.7) {
          bot.setControlState('jump', true);
          setTimeout(() => bot.setControlState('jump', false), 300);
        }

      } catch {}
    }, 4000);
  }

  // ================= WELCOME MESSAGE (EVERY HOUR) =================
  function startWelcomeMessages() {

    const serverName = "🏰 عراق بابلون";

    setInterval(() => {

      if (!bot || !bot.entity) return;

      const messages = [
        `✨ أهلاً بكم في ${serverName} 🔥`,
        `👋 مرحباً! استمتعوا في ${serverName}`,
        `🏰 ${serverName} يرحب بجميع اللاعبين ❤️`,
        `🔥 لا تنسون قواعد ${serverName}`
      ];

      const msg = messages[Math.floor(Math.random() * messages.length)];

      bot.chat(msg);

    }, 60 * 60 * 1000);
  }

  // ================= PLAYERS =================
  bot.on('playerJoined', async (p) => {
    playersCount = Object.keys(bot.players).length;
    log(`🟢 دخل: ${p.username}`);

    await PlayerLog.create({
      name: p.username,
      action: "join"
    });
  });

  bot.on('playerLeft', async (p) => {
    playersCount = Object.keys(bot.players).length;
    log(`🔴 طلع: ${p.username}`);

    await PlayerLog.create({
      name: p.username,
      action: "leave"
    });
  });

  // ================= CHAT =================
  bot.on('chat', (u, msg) => {
    log(`💬 ${u}: ${msg}`);
  });

  // ================= AUTO RECONNECT =================
  bot.on('end', () => {
    log("🔄 Restarting Bot...");
    setTimeout(startBot, 5000);
  });

  bot.on('error', (e) => log("⚠️ " + e.message));
}

// ================= DISCORD READY =================
client.once('ready', () => {

  console.log("Discord Ready");

  setInterval(() => {
    status(`📊 Online\n👥 Players: ${playersCount}`);
  }, 300000);

  client.on('messageCreate', async (msg) => {

    if (msg.content === "!panel") {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('status')
          .setLabel('Status')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId('restart')
          .setLabel('Restart Bot')
          .setStyle(ButtonStyle.Danger)
      );

      msg.reply({
        content: "🎛️ Control Panel",
        components: [row]
      });
    }
  });

  client.on('interactionCreate', async (i) => {

    if (!i.isButton()) return;

    if (i.customId === 'status') {
      i.reply(`🟢 Online\n👥 Players: ${playersCount}`);
    }

    if (i.customId === 'restart') {
      i.reply("🔄 Restarting...");
      bot?.end();
    }
  });
});

// ================= CRASH PROTECTION =================
process.on('uncaughtException', (err) => {
  log("💥 Crash: " + err.message);
  setTimeout(() => startBot(), 5000);
});

process.on('unhandledRejection', (err) => {
  log("💥 Error: " + err);
});

// ================= START =================
client.login(process.env.DISCORD_TOKEN);
startBot();
