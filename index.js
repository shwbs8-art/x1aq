const mineflayer = require('mineflayer');
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

// ================= CONFIG =================
const OWNER_ID = process.env.OWNER_ID;
const PORT = process.env.PORT || 3000;

// ================= STATE =================
let bot;
let playersCount = 0;

// ================= EXPRESS =================
const app = express();
app.get('/', (req, res) => res.send("MC Bot Running ✅"));
app.get('/status', (req, res) => {
  res.json({
    status: bot ? "online" : "offline",
    players: playersCount
  });
});

app.listen(PORT, () => {
  console.log("Web running on port " + PORT);
});

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
    console.log("Bot Online");

    // حركة بسيطة
    setInterval(() => {
      if (!bot || !bot.entity) return;

      bot.setControlState('forward', true);

      if (Math.random() > 0.7) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
      }

    }, 4000);

    // 💬 AI Chat Replies
    bot.on('chat', (user, msg) => {

      const text = msg.toLowerCase();

      const ai = {
        "hi": "هلا بيك 👋",
        "hello": "أهلاً وسهلاً 🔥",
        "شلونك": "تمام وانت؟ 😄",
        "gg": "GG 🔥",
        "bye": "مع السلامة 👋"
      };

      if (ai[text]) {
        setTimeout(() => bot.chat(ai[text]), 1000);
      }
    });
  });

  // 👥 Players
  bot.on('playerJoined', (p) => {
    playersCount = Object.keys(bot.players).length;
    console.log("Join:", p.username);
  });

  bot.on('playerLeft', (p) => {
    playersCount = Object.keys(bot.players).length;
    console.log("Left:", p.username);
  });

  // 🔄 reconnect
  bot.on('end', () => setTimeout(startBot, 5000));

  bot.on('error', (e) => console.log(e.message));
}

// ================= DISCORD PANEL =================
client.once('ready', () => {

  console.log("Discord Ready");

  // 🎛️ لوحة التحكم
  client.on('messageCreate', async (msg) => {

    if (msg.content === "!لوحة") {

      if (!isOwner(msg)) return msg.reply("❌ ما عندك صلاحية");

      const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId('تشغيل')
          .setLabel('🟢 تشغيل السيرفر')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId('ايقاف')
          .setLabel('🔴 إيقاف السيرفر')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId('حالة')
          .setLabel('📊 حالة السيرفر')
          .setStyle(ButtonStyle.Primary)

      );

      msg.reply({
        content: "🎛️ لوحة التحكم",
        components: [row]
      });
    }

    // 💬 إرسال رسالة داخل ماينكرافت
    if (msg.content.startsWith("!say ")) {
      if (!isOwner(msg)) return;
      const text = msg.content.slice(5);
      bot?.chat(text);
    }

    // 🔄 restart
    if (msg.content === "!restart") {
      if (!isOwner(msg)) return;
      bot?.end();
      msg.reply("🔄 تم إعادة التشغيل");
    }
  });

  // 🎮 Buttons Control
  client.on('interactionCreate', async (i) => {

    if (!i.isButton()) return;
    if (i.user.id !== OWNER_ID) {
      return i.reply({ content: "❌ غير مصرح", ephemeral: true });
    }

    if (i.customId === 'تشغيل') {
      bot?.setControlState('forward', true);
      i.reply("🟢 البوت يتحرك الآن");
    }

    if (i.customId === 'ايقاف') {
      bot?.clearControlStates();
      i.reply("🔴 تم إيقاف البوت");
    }

    if (i.customId === 'حالة') {
      i.reply(`📊 اللاعبين: ${playersCount}`);
    }
  });

});

// ================= START =================
client.login(process.env.DISCORD_TOKEN);
startBot();
