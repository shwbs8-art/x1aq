const mineflayer = require('mineflayer');
const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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

function isOwner(msg) {
  return msg.author.id === OWNER_ID;
}

// ================= BOT =================
let bot;

// 🤖 حركة لاعب حقيقي (مطورة)
function humanMovement() {
  if (!bot || !bot.entity) return;

  const actions = ["forward", "back", "left", "right"];
  const action = actions[Math.floor(Math.random() * actions.length)];

  bot.clearControlStates();
  bot.setControlState(action, true);

  setTimeout(() => {
    bot.clearControlStates();
  }, 1500 + Math.random() * 2500);

  setTimeout(() => {
    bot.look(
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.5
    );
  }, 1000);

  if (Math.random() > 0.92) {
    bot.setControlState('jump', true);
    setTimeout(() => bot.setControlState('jump', false), 300);
  }
}

// ================= START BOT =================
function startBot() {

  try {

    bot = mineflayer.createBot({
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      auth: 'offline',
      version: "1.21.11"
    });

    bot.on('spawn', () => {
      console.log("🟢 Bot Online");

      setInterval(humanMovement, 4000 + Math.random() * 2000);
    });

    // 🚫 WHITELIST SYSTEM
    bot.on('playerJoined', (p) => {

      const name = p.username.toLowerCase();

      if (!allowedPlayers.has(name)) {
        setTimeout(() => {
          bot.chat(`/kick ${p.username} ❌ غير مفعل`);
        }, 2000);
      }
    });

    // 🤖 AI CHAT
    bot.on('chat', (user, msg) => {

      const text = msg.toLowerCase();

      const ai = {
        "hi": "هلا 👋",
        "hello": "أهلاً 😄",
        "gg": "GG 🔥",
        "bye": "باي 👋",
        "شلونك": "تمام وانت؟ 😄"
      };

      if (ai[text]) {
        setTimeout(() => bot.chat(ai[text]), 1200);
      }
    });

    // 🔁 SAFE RECONNECT
    bot.on('end', () => {
      console.log("🔄 Reconnecting...");
      setTimeout(startBot, 5000);
    });

    bot.on('kicked', (r) => {
      console.log("❌ Kicked:", r);
      setTimeout(startBot, 7000);
    });

    bot.on('error', (e) => console.log("⚠️ Error:", e.message));

  } catch (e) {
    console.log("💥 Crash:", e.message);
    setTimeout(startBot, 5000);
  }
}

// ================= DISCORD =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {

  console.log("Discord Ready");

  client.on('messageCreate', (msg) => {

    if (!msg.content.startsWith("!")) return;
    if (!isOwner(msg)) return;

    const args = msg.content.split(" ");
    const cmd = args[0];

    // 🎛️ لوحة التحكم
    if (cmd === "!لوحة") {

     const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("تشغيل")
.setLabel("🟢 تشغيل")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("ايقاف")
.setLabel("🔴 إيقاف")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("حالة")
.setLabel("📊 حالة")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("ادارة")
.setLabel("🛡️ الإدارة")
.setStyle(ButtonStyle.Secondary)

);

      return msg.reply({ content: "🎛️ لوحة التحكم", components: [row] });
    }

    // ✔ تفعيل لاعب
    if (cmd === "!تفعيل") {
      const name = args[1]?.toLowerCase();
      if (!name) return;

      allowedPlayers.add(name);
      saveAllowed();

      return msg.reply(`✅ تم تفعيل: ${name}`);
    }

    // ❌ إلغاء تفعيل
    if (cmd === "!الغاء") {
      const name = args[1]?.toLowerCase();
      if (!name) return;

      allowedPlayers.delete(name);
      saveAllowed();

      return msg.reply(`❌ تم إلغاء: ${name}`);
    }

    // 💬 إرسال رسالة داخل ماينكرافت
    if (cmd === "!say") {
      const text = msg.content.slice(5);
      bot?.chat(text);
      return msg.reply("💬 تم الإرسال");
    }

    // 🔄 إعادة تشغيل
    if (cmd === "!restart") {
      bot?.end();
      return msg.reply("🔄 إعادة تشغيل...");
    }

    // 📋 قائمة المفعلين
    if (cmd === "!المفعلين") {
      return msg.reply([...allowedPlayers].join(", ") || "فارغ");
    }
  });

  // 🎮 الأزرار
  client.on('interactionCreate', async (i) => {

    if (!i.isButton()) return;
    if (i.user.id !== OWNER_ID)
      return i.reply({ content: "❌ ممنوع", ephemeral: true });

    if (i.customId === 'تشغيل') {
      bot?.setControlState('forward', true);
      return i.reply("🟢 البوت شغال");
    }

    if (i.customId === 'ايقاف') {
      bot?.clearControlStates();
      return i.reply("🔴 البوت متوقف");
    }

 if (i.customId === 'حالة') {
  return i.reply(`📊 اللاعبين: ${Object.keys(bot?.players || {}).length}`);
}

if (i.customId === 'ادارة') {

  const row = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId("players")
      .setLabel("👥 اللاعبين")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("tp")
      .setLabel("📥 سحب")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("kick")
      .setLabel("👢 طرد")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("ban")
      .setLabel("🔨 باند")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("unban")
      .setLabel("🔓 فك باند")
      .setStyle(ButtonStyle.Secondary)

  );


  return i.reply({
    content: "🛡️ قائمة الإدارة",
    components: [row],
    ephemeral: true
  });

}

if (i.customId === "players") {

  if (!bot) {
    return i.reply({
      content: "❌ بوت ماينكرافت غير شغال.",
      ephemeral: true
    });
  }

  const players = Object.keys(bot.players || {});

  return i.reply({
    content: players.length
      ? "👥 اللاعبين المتصلين:\n\n" + players.join("\n")
      : "❌ لا يوجد لاعبين متصلين.",
    ephemeral: true
  });

}

});

});

// ================= START =================
client.login(process.env.DISCORD_TOKEN);
startBot();
