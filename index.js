const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const mcDataLoader = require('minecraft-data');
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const { GoalNear } = goals;

// ================= WEB =================
const app = express();
app.get('/', (req, res) => res.send("Bot running OK"));
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

// ================= LOG FUNCTIONS =================
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

        const r = Math.random();

        if (r < 0.2) bot.clearControlStates();

        if (r > 0.6 && r < 0.8) {
          bot.setControlState('jump', true);
          setTimeout(() => bot.setControlState('jump', false), 250);
        }

      } catch {}
    }, 4000);
  }

  // ================= PLAYERS =================
  bot.on('playerJoined', p => {
    playersCount = Object.keys(bot.players).length;
    log(`🟢 دخل: ${p.username}`);
  });

  bot.on('playerLeft', p => {
    playersCount = Object.keys(bot.players).length;
    log(`🔴 طلع: ${p.username}`);
  });

  // ================= CHAT =================
  bot.on('chat', (u, msg) => {
    log(`💬 ${u}: ${msg}`);
  });

  // ================= AUTO RECONNECT =================
  bot.on('end', () => {
    log("🔄 Reconnecting...");
    setTimeout(startBot, 5000);
  });

  bot.on('error', e => log("⚠️ " + e.message));
}

// ================= DISCORD COMMANDS =================
client.once('ready', () => {

  console.log("Discord Ready");

  // تحديث الحالة كل 5 دقائق
  setInterval(() => {
    status(`📊 Server Online\n👥 Players: ${playersCount}`);
  }, 300000);

  // أوامر التحكم
  client.on('messageCreate', msg => {

    if (msg.content === "/players") {
      msg.reply(`👥 Players: ${playersCount}`);
    }

    if (msg.content === "/status") {
      msg.reply("🟢 Server is running");
    }

    if (msg.content === "/reconnect") {
      msg.reply("🔄 Restarting bot...");
      bot?.end();
    }

  });

});

// ================= CRASH PROTECTION =================
process.on('uncaughtException', e => log("💥 Crash: " + e.message));
process.on('unhandledRejection', e => log("💥 Error: " + e));

// ================= START =================
client.login(process.env.DISCORD_TOKEN);
startBot();
