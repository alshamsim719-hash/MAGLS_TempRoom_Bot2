const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

console.log("🚀 Starting MAGLS Temp Room Bot...");

const rooms = new Map(); // ownerId → data

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


// =======================
// Create Temp Room
// =======================
async function createTempRoom(member) {
  const guild = member.guild;

  if (rooms.has(member.id)) {
    const info = rooms.get(member.id);
    const vc = guild.channels.cache.get(info.voiceId);
    if (vc) {
      member.voice.setChannel(vc).catch(() => {});
      return;
    }
  }

  // Create Voice Room
  const voice = await guild.channels.create({
    name: `👑 MAGLS — ${member.displayName}`,
    type: ChannelType.GuildVoice,
    parent: config.categoryId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        allow: ["ViewChannel", "Connect", "Speak"]
      },
      {
        id: member.id,
        allow: ["ViewChannel", "Connect", "Speak", "MuteMembers", "MoveMembers"]
      },
      {
        id: client.user.id,
        allow: ["ViewChannel", "Connect", "Speak", "MuteMembers", "ManageChannels"]
      }
    ]
  });

  // ==========================
  // Create Linked TEXT (THREAD)
  // ==========================
  const thread = await guild.channels.create({
    name: `💬・MAGLS — ${member.displayName}`,
    type: ChannelType.PrivateThread,
    invitable: false,
    parent: voice
  });

  await thread.members.add(member.id);
  await thread.members.add(client.user.id);

  // Save room data
  rooms.set(member.id, {
    ownerId: member.id,
    voiceId: voice.id,
    threadId: thread.id
  });

  await member.voice.setChannel(voice).catch(() => {});

  // ===== Send Control Panel =====
  sendControlPanel(thread, member, voice);
}



// =======================
// Control Panel
// =======================
async function sendControlPanel(thread, owner, voiceChannel) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("👑 لوحة التحكم بالروم الصوتي")
    .setDescription(
      `يمكنك التحكم في الروم الخاص بك من خلال الأزرار أدناه:\n\nصاحب الروم: **${owner.displayName}**`
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("mute_all").setLabel("كتم الكل").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("unmute_all").setLabel("فك الكتم").setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("lock").setLabel("قفل").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("unlock").setLabel("فتح").setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("hide").setLabel("إخفاء").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("show").setLabel("إظهار").setStyle(ButtonStyle.Secondary)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("kick_all").setLabel("طرد الكل").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("close").setLabel("إنهاء الروم").setStyle(ButtonStyle.Danger)
  );

  await thread.send({
    content: `👑 <@${owner.id}> | لوحة التحكم الخاصة بك:`,
    embeds: [embed],
    components: [row1, row2, row3, row4]
  });
}



// =======================
// Button Actions
// =======================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const info = [...rooms.values()].find(r => r.threadId === interaction.channelId);
  if (!info) return;

  if (interaction.user.id !== info.ownerId)
    return interaction.reply({ content: "❌ فقط صاحب الروم يمكنه استخدام اللوحة.", ephemeral: true });

  const guild = interaction.guild;
  const voice = guild.channels.cache.get(info.voiceId);

  switch (interaction.customId) {
    case "mute_all":
      voice.members.forEach(m => {
        if (m.id !== info.ownerId) m.voice.setMute(true).catch(() => {});
      });
      return interaction.reply({ content: "🔇 تم كتم الجميع.", ephemeral: true });

    case "unmute_all":
      voice.members.forEach(m => m.voice.setMute(false).catch(() => {}));
      return interaction.reply({ content: "🔊 تم فك الكتم.", ephemeral: true });

    case "lock":
      await voice.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
      return interaction.reply({ content: "🔒 تم قفل الروم.", ephemeral: true });

    case "unlock":
      await voice.permissionOverwrites.edit(guild.roles.everyone, { Connect: true });
      return interaction.reply({ content: "🔓 تم فتح الروم.", ephemeral: true });

    case "hide":
      await voice.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
      return interaction.reply({ content: "👁️ تم إخفاء الروم.", ephemeral: true });

    case "show":
      await voice.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
      return interaction.reply({ content: "تم إظهار الروم.", ephemeral: true });

    case "kick_all":
      voice.members.forEach(m => {
        if (m.id !== info.ownerId) m.voice.disconnect().catch(() => {});
      });
      return interaction.reply({ content: "🚫 تم طرد الجميع.", ephemeral: true });

    case "close":
      voice.delete().catch(() => {});
      interaction.channel.delete().catch(() => {});
      rooms.delete(info.ownerId);
      return interaction.reply({ content: "❌ تم حذف الروم.", ephemeral: true });
  }
});



// =======================
// Voice State Handler
// =======================
client.on("voiceStateUpdate", async (oldState, newState) => {
  if (newState.channelId === config.lobbyId) {
    if (!newState.member.user.bot) createTempRoom(newState.member);
  }

  // Delete when empty
  if (rooms.has(oldState.member.id)) {
    const data = rooms.get(oldState.member.id);
    const vc = oldState.guild.channels.cache.get(data.voiceId);

    if (vc && vc.members.filter(m => !m.user.bot).size === 0) {
      vc.delete().catch(() => {});
      oldState.guild.channels.cache.get(data.threadId)?.delete().catch(() => {});
      rooms.delete(oldState.member.id);
    }
  }
});



// =======================
client.login(config.token);
