const mineflayer = require('mineflayer');
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

// ================= ENV =================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const MC_HOST = process.env.MC_HOST;
const MC_PORT = parseInt(process.env.MC_PORT || "25565");
const MC_USERNAME = process.env.MC_USERNAME;

// ================= EXPRESS =================
const app = express();
app.get('/', (req, res) => res.send("Bot running"));
app.listen(3000);

// ================= DISCORD =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

let bot;
let playersCount = 0;
let reconnects = 0;

// ================= SEND HELPERS =================
function log(msg) {
  const ch = client.channels.cache.get(LOG_CHANNEL_ID);
  if (ch) ch.send(msg).catch(() => {});
}

function status(msg) {
  const ch = client.channels.cache.get(CHANNEL_ID);
  if (ch) ch.send(msg).catch(() => {});
}

// ================= MINECRAFT BOT =================
function startBot() {
  console.log("Starting Minecraft bot...");

  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: MC_USERNAME,
    auth: 'offline',        // 👈 مهم جداً لـ TLauncher / cracked
    version: "1.21.11"      // 👈 إصدار السيرفر
  });

  // ===== SPAWN =====
  bot.on('spawn', () => {
    console.log("Bot spawned");
    reconnects = 0;

    log("🟢 دخل البوت للسيرفر");

    // Anti-AFK
    setInterval(() => {
      try {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);

        bot.setControlState('forward', true);
        setTimeout(() => bot.setControlState('forward', false), 800);
      } catch {}
    }, 5000);
  });

  // ===== PLAYERS =====
  bot.on('playerJoined', (p) => {
    playersCount = Object.keys(bot.players).length;
    log(`🟢 لاعب دخل: ${p.username}`);
  });

  bot.on('playerLeft', (p) => {
    playersCount = Object.keys(bot.players).length;
    log(`🔴 لاعب طلع: ${p.username}`);
  });

  // ===== CHAT LOG =====
  bot.on('chat', (user, msg) => {
    log(`💬 ${user}: ${msg}`);
  });

  // ===== ERROR =====
  bot.on('error', (err) => {
    log(`⚠️ خطأ: ${err.message}`);
  });

  // ===== AUTO RECONNECT (ANTI CRASH) =====
  bot.on('end', () => {
    reconnects++;

    const delay = Math.min(30000, reconnects * 5000);

    log(`🔄 البوت طفى... إعادة تشغيل بعد ${delay / 1000} ثانية`);

    setTimeout(startBot, delay);
  });
}

// ================= DISCORD =================
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // تحديث الحالة كل 5 دقائق
  setInterval(() => {
    status(`📊 السيرفر شغال\n👥 اللاعبين: ${playersCount}`);
  }, 5 * 60 * 1000);

  // رسالة ترحيب كل ساعة
  setInterval(() => {
    status("👋 أهلاً بكم في السيرفر!");
  }, 60 * 60 * 1000);
});

// ================= CRASH PROTECTION =================
process.on('uncaughtException', (err) => {
  log(`💥 Crash: ${err.message}`);
});

process.on('unhandledRejection', (err) => {
  log(`💥 Promise Crash: ${err}`);
});

// ================= START =================
client.login(DISCORD_TOKEN);
startBot();