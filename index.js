const mineflayer = require('mineflayer');
const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require('discord.js');

// ================= OWNER =================
const OWNER_ID = "1221550661263429787";

// ================= CONFIG =================
const ADMIN_CHANNEL_ID = "1519954672994226196";
const PUBLIC_CHANNEL_ID = "1519685707709550622";

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
let statusMessage = null;
let statusInterval = null;

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

async function updateServerStatus() {
  try {
    const channel = client.channels.cache.get(PUBLIC_CHANNEL_ID);
    if (!channel) return;

    const players = Object.keys(bot?.players || {});
    const count = players.length;
    const maxPlayers = 20;

    let statusText = "";
    let color = 0x00FF00;

    if (count === 0) {
      statusText = "🟢 السيرفر فاضي";
      color = 0x00FF00;
    } else if (count <= 5) {
      statusText = `🟢 اللاعبين ${count}`;
      color = 0x00FF00;
    } else if (count <= 10) {
      statusText = `🟡 عدد اللاعبين ${count}`;
      color = 0xFFFF00;
    } else if (count <= 15) {
      statusText = `🟠 عدد اللاعبين ${count}`;
      color = 0xFFA500;
    } else {
      statusText = `🔴 السيرفر مزدحم (${count})`;
      color = 0xFF0000;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎮 𝗜𝗿𝗮𝗾 𝗕𝗮𝗯𝘆𝗹𝗼𝗻 𝗦𝗠𝗣")
      .setDescription(`**${statusText}**`)
      .setColor(color)
      .addFields(
        { name: "👥 عدد اللاعبين", value: `${count} / ${maxPlayers}`, inline: true },
        { name: "📊 الحالة", value: count >= maxPlayers ? "❌ ممتلئ" : "✅ متاح", inline: true },
        { name: "🕒 آخر تحديث", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
      )
      .setFooter({ text: "𝗜𝗿𝗮𝗾 𝗕𝗮𝗯𝘆𝗹𝗼𝗻 𝗦𝗠𝗣" })
      .setTimestamp();

    if (count > 0 && count <= 10) {
      embed.addFields({ 
        name: "👥 اللاعبين المتصلين", 
        value: players.join("\n"), 
        inline: false 
      });
    } else if (count > 10) {
      embed.addFields({ 
        name: "👥 اللاعبين المتصلين", 
        value: players.slice(0, 10).join("\n") + `\nو ${count - 10} آخرين...`, 
        inline: false 
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🚀 انضم الآن")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.google.com/`)
    );

    if (statusMessage) {
      await statusMessage.edit({ embeds: [embed], components: [row] });
    } else {
      statusMessage = await channel.send({ embeds: [embed], components: [row] });
    }

  } catch (e) {
    console.log("⚠️ خطأ في تحديث الحالة:", e.message);
  }
}

function startBot() {

  console.log("⏳ محاولة الاتصال بالسيرفر...");

  try {

    bot = mineflayer.createBot({
      host: process.env.MC_HOST,
      port: parseInt(process.env.MC_PORT) || 25565,
      username: "IraqBabylonSMP",
      auth: 'offline',
      version: "1.20.4",
      hideErrors: true,
      logErrors: false,
      checkTimeoutInterval: 120000,
      keepAlive: true,
      keepAliveInterval: 20000
    });

    bot.on('spawn', () => {
      console.log("🟢 Bot Online - IraqBabylonSMP");
      setInterval(humanMovement, 4000 + Math.random() * 2000);
      
      setTimeout(() => updateServerStatus(), 5000);
      if (statusInterval) clearInterval(statusInterval);
      statusInterval = setInterval(updateServerStatus, 300000);
    });

    bot.on('playerJoined', (p) => {

      const name = p.username.toLowerCase();

      if (!allowedPlayers.has(name)) {
        setTimeout(() => {
          try {
            bot.chat(`/kick ${p.username} ❌ غير مفعل`);
          } catch (e) {
            console.log("❌ خطأ في الطرد:", e.message);
          }
        }, 2000);
      }
    });

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
        setTimeout(() => {
          try {
            bot.chat(ai[text]);
          } catch (e) {
            console.log("❌ خطأ في الرد:", e.message);
          }
        }, 1200);
      }
    });

    bot.on('end', () => {
      console.log("🔄 Reconnecting in 10 seconds...");
      setTimeout(startBot, 10000);
    });

    bot.on('kicked', (r) => {
      console.log("❌ Kicked:", r);
      if (typeof r === 'string' && r.includes('Connection throttled')) {
        console.log("⏳ انتظر 3 دقائق...");
        setTimeout(startBot, 180000);
      } else {
        setTimeout(startBot, 10000);
      }
    });

    bot.on('error', (e) => {
      console.log("⚠️ Error:", e.message);
      if (e.message.includes('ECONNRESET')) {
        console.log("⏳ انتظر دقيقتين...");
        setTimeout(startBot, 120000);
      } else {
        setTimeout(startBot, 10000);
      }
    });

  } catch (e) {
    console.log("💥 Crash:", e.message);
    setTimeout(startBot, 10000);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {

  console.log("Discord Ready");

  // ================= أوامر عامة (للكل) =================
  client.on('messageCreate', (msg) => {

    if (msg.author.bot) return;
    if (msg.channel.id !== PUBLIC_CHANNEL_ID) return;

    const content = msg.content.toLowerCase();

    if (content.includes("السيرفر شغال") || content.includes("سيرفر شغال") || content === "server") {

      const players = Object.keys(bot?.players || {});
      const count = players.length;
      const maxPlayers = 20;

      let statusText = "";
      let color = 0x00FF00;

      if (count === 0) {
        statusText = "🟢 السيرفر فاضي";
        color = 0x00FF00;
      } else if (count <= 5) {
        statusText = `🟢 اللاعبين ${count}`;
        color = 0x00FF00;
      } else if (count <= 10) {
        statusText = `🟡 عدد اللاعبين ${count}`;
        color = 0xFFFF00;
      } else if (count <= 15) {
        statusText = `🟠 عدد اللاعبين ${count}`;
        color = 0xFFA500;
      } else {
        statusText = `🔴 السيرفر مزدحم (${count})`;
        color = 0xFF0000;
      }

      const embed = new EmbedBuilder()
        .setTitle("🎮 𝗜𝗿𝗮𝗾 𝗕𝗮𝗯𝘆𝗹𝗼𝗻 𝗦𝗠𝗣")
        .setDescription(`**${statusText}**`)
        .setColor(color)
        .addFields(
          { name: "👥 عدد اللاعبين", value: `${count} / ${maxPlayers}`, inline: true },
          { name: "📊 الحالة", value: count >= maxPlayers ? "❌ ممتلئ" : "✅ متاح", inline: true },
          { name: "🕒 آخر تحديث", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
        )
        .setFooter({ text: "𝗜𝗿𝗮𝗾 𝗕𝗮𝗯𝘆𝗹𝗼𝗻 𝗦𝗠𝗣" })
        .setTimestamp();

      if (count > 0 && count <= 10) {
        embed.addFields({ 
          name: "👥 اللاعبين المتصلين", 
          value: players.join("\n"), 
          inline: false 
        });
      } else if (count > 10) {
        embed.addFields({ 
          name: "👥 اللاعبين المتصلين", 
          value: players.slice(0, 10).join("\n") + `\nو ${count - 10} آخرين...`, 
          inline: false 
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("🚀 انضم الآن")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://www.google.com/`)
      );

      return msg.reply({ embeds: [embed], components: [row] });
    }
  });

  // ================= أوامر المالك (في الروم المخفي) =================
  client.on('messageCreate', (msg) => {

    if (msg.channel.id !== ADMIN_CHANNEL_ID) return;
    if (!msg.content.startsWith("!")) return;
    if (!isOwner(msg)) return;

    const args = msg.content.split(" ");
    const cmd = args[0];

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

    if (cmd === "!تفعيل") {
      const name = args[1]?.toLowerCase();
      if (!name) return;
      allowedPlayers.add(name);
      saveAllowed();
      return msg.reply(`✅ تم تفعيل: ${name}`);
    }

    if (cmd === "!الغاء") {
      const name = args[1]?.toLowerCase();
      if (!name) return;
      allowedPlayers.delete(name);
      saveAllowed();
      return msg.reply(`❌ تم إلغاء: ${name}`);
    }

    if (cmd === "!say") {
      const text = msg.content.slice(5);
      try {
        bot?.chat(text);
        return msg.reply("💬 تم الإرسال");
      } catch (e) {
        return msg.reply("❌ البوت غير متصل");
      }
    }

    if (cmd === "!restart") {
      bot?.end();
      return msg.reply("🔄 إعادة تشغيل...");
    }

    if (cmd === "!المفعلين") {
      return msg.reply([...allowedPlayers].join(", ") || "فارغ");
    }

    if (cmd === "!تحديث") {
      updateServerStatus();
      return msg.reply("✅ تم تحديث الحالة");
    }
  });

  // ================= الأزرار =================
  client.on('interactionCreate', async (i) => {

    if (i.channelId !== ADMIN_CHANNEL_ID) {
      return i.reply({
        content: "❌ هذا الروم غير مخصص للتحكم",
        ephemeral: true
      });
    }

    if (i.user.id !== OWNER_ID) {
      return i.reply({
        content: "❌ ممنوع",
        ephemeral: true
      });
    }

    if (i.isButton()) {

      if (i.customId === "تشغيل") {
        bot?.setControlState("forward", true);
        return i.reply("🟢 البوت شغال");
      }

      if (i.customId === "ايقاف") {
        bot?.clearControlStates();
        return i.reply("🔴 البوت متوقف");
      }

      if (i.customId === "حالة") {
        const count = Object.keys(bot?.players || {}).length;
        return i.reply(`📊 اللاعبين: ${count}/20`);
      }

      if (i.customId === "ادارة") {

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
            .setCustomId("goto")
            .setLabel("📍 انتقال")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("kick")
            .setLabel("👢 طرد")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("ban")
            .setLabel("🔨 باند")
            .setStyle(ButtonStyle.Danger)
        );

        return i.reply({
          content: "🛡️ قائمة الإدارة",
          components: [row],
          ephemeral: true
        });
      }

      if (i.customId === "players") {
        if (!bot) {
          return i.reply({ content: "❌ بوت ماينكرافت غير شغال.", ephemeral: true });
        }
        const players = Object.keys(bot.players || {});
        return i.reply({
          content: players.length
            ? "👥 اللاعبين المتصلين:\n\n" + players.join("\n")
            : "❌ لا يوجد لاعبين متصلين.",
          ephemeral: true
        });
      }

      if (["tp", "goto", "kick", "ban"].includes(i.customId)) {
        if (!bot) {
          return i.reply({ content: "❌ بوت ماينكرافت غير شغال.", ephemeral: true });
        }
        const players = Object.keys(bot.players || {});
        if (players.length === 0) {
          return i.reply({ content: "❌ لا يوجد لاعبين متصلين.", ephemeral: true });
        }

        const select = new StringSelectMenuBuilder()
          .setCustomId(i.customId + "_select")
          .setPlaceholder({
            "tp": "📥 اختر لاعب للسحب",
            "goto": "📍 اختر لاعب للانتقال",
            "kick": "👢 اختر لاعب للطرد",
            "ban": "🔨 اختر لاعب للباند"
          }[i.customId])
          .addOptions(players.map(name => ({ label: name, value: name })));

        const row = new ActionRowBuilder().addComponents(select);

        return i.reply({
          content: `اختر اللاعب:`,
          components: [row],
          ephemeral: true
        });
      }
    }

    if (i.isStringSelectMenu()) {

      const selected = i.values[0];
      const action = {
        "tp_select": `/tp ${selected}`,
        "goto_select": `/tp ${process.env.MC_USERNAME} ${selected}`,
        "kick_select": `/kick ${selected}`,
        "ban_select": `/ban ${selected}`
      }[i.customId];

      const response = {
        "tp_select": `✅ تم سحب ${selected}`,
        "goto_select": `✅ تم الانتقال إلى ${selected}`,
        "kick_select": `✅ تم طرد ${selected}`,
        "ban_select": `✅ تم باند ${selected}`
      }[i.customId];

      if (!action || !response) {
        return i.reply({ content: "❌ أمر غير معروف", ephemeral: true });
      }

      try {
        bot.chat(action);
        return i.reply({ content: response, ephemeral: true });
      } catch (e) {
        return i.reply({ content: `❌ خطأ: ${e.message}`, ephemeral: true });
      }
    }

  });

});

client.login(process.env.DISCORD_TOKEN);
setTimeout(startBot, 10000);
