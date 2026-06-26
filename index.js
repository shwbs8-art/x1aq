const mineflayer = require('mineflayer');
const fs = require('fs');
const {
  Client,
  GatewayIntentBits
} = require('discord.js');

// ================= OWNER =================
const OWNER_ID = "1221550661263429787";

// ================= DATA =================
const FILE = "./allowed.json";

let allowedPlayers = new Set();

if (fs.existsSync(FILE)) {
  try {
    allowedPlayers = new Set(JSON.parse(fs.readFileSync(FILE)));
  } catch {
    allowedPlayers = new Set();
  }
}

function saveAllowed() {
  fs.writeFileSync(FILE, JSON.stringify([...allowedPlayers]));
}

// ================= BOT STATE =================
let bot;

// ================= DISCORD =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function isOwner(msg) {
  return msg.author.id === OWNER_ID;
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

  bot.on('spawn', () => {
    console.log("🟢 Bot Online");

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

  // ================= WHITELIST SYSTEM =================
  bot.on('playerJoined', (p) => {

    const name = p.username.toLowerCase();

    if (!allowedPlayers.has(name)) {

      setTimeout(() => {
        bot.chat(`/kick ${p.username} ❌ غير مفعل - تواصل مع الإدارة`);
      }, 2000);

    } else {
      console.log("✔ Allowed:", p.username);
    }
  });

  // ================= RECONNECT =================
  bot.on('end', () => {
    console.log("🔄 Reconnecting...");
    setTimeout(startBot, 5000);
  });

  bot.on('error', (e) => console.log("Error:", e.message));
}

// ================= DISCORD COMMANDS =================
client.once('ready', () => {

  console.log("Discord Ready");

  client.on('messageCreate', (msg) => {

    if (!msg.content.startsWith("!") && !msg.content.startsWith("!تفعيل") && !msg.content.startsWith("!الغاء")) return;

    // ================= OWNER CHECK =================
    if (!isOwner(msg)) return;

    // ================= ACTIVATE PLAYER =================
    if (msg.content.startsWith("!تفعيل ")) {

      const name = msg.content.split(" ")[1].toLowerCase();

      allowedPlayers.add(name);
      saveAllowed();

      msg.reply(`✅ تم تفعيل: ${name}`);
    }

    // ================= REMOVE PLAYER =================
    if (msg.content.startsWith("!الغاء ")) {

      const name = msg.content.split(" ")[1].toLowerCase();

      allowedPlayers.delete(name);
      saveAllowed();

      msg.reply(`❌ تم إلغاء: ${name}`);
    }

    // ================= SAY =================
    if (msg.content.startsWith("!say ")) {

      const text = msg.content.slice(5);
      bot?.chat(text);

      msg.reply("💬 تم الإرسال");
    }

    // ================= RESTART =================
    if (msg.content === "!restart") {
      bot?.end();
      msg.reply("🔄 إعادة تشغيل...");
    }

    // ================= LIST =================
    if (msg.content === "!المفعلين") {
      msg.reply("📋 " + [...allowedPlayers].join(", "));
    }
  });

});

// ================= START =================
client.login(process.env.DISCORD_TOKEN);
startBot();
