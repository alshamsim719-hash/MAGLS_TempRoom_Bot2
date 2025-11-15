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
    GatewayIntentBits.MessageContent,
  ],
});

console.log("🚀 Starting MAGLS Temp Room Bot...");

const rooms = new Map(); // ownerId => { voiceId, textId }

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// =================================================================
// CREATE TEMP ROOM
// =================================================================

async function createTempRoom(member) {
  const guild = member.guild;

  // Prevent double creation
  if (rooms.has(member.id)) {
    const info = rooms.get(member.id);
    const vc = guild.channels.cache.get(info.voiceId);
    if (vc) {
      member.voice.setChannel(vc).catch(() => {});
      return;
    }
  }

  // Create Voice Channel
  const voice = await guild.channels.create({
    name: `🎤・MAGLS — ${member.displayName}`,
    type: ChannelType.GuildVoice,
    parent: config.categoryId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        allow: ["ViewChannel", "Connect", "Speak"],
      },
      {
        id: member.id,
        allow: [
          "ViewChannel",
          "Connect",
          "Speak",
          "MuteMembers",
          "MoveMembers",
          "ManageChannels",
        ],
      },
      {
        id: client.user.id,
        allow: ["ViewChannel", "Connect", "Speak", "MuteMembers", "ManageChannels"],
      },
    ],
  });

  // Create Text Channel (This appears directly under the voice)
  const text = await guild.channels.create({
    name: `💬・MAGLS — ${member.displayName}`,
    type: ChannelType.GuildText,
    parent: config.categoryId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: ["ViewChannel"],
      },
      {
        id: member.id,
        allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
      },
      {
        id: client.user.id,
        allow: ["ViewChannel", "SendMessages", "EmbedLinks"],
      },
    ],
  });

  // Save
  rooms.set(member.id, {
    voiceId: voice.id,
    textId: text.id,
    ownerId: member.id,
  });

  // Move member to the new room
  member.voice.setChannel(voice).catch(() => {});

  // Send Control Panel
  sendControlPanel(text, member, voice);

  console.log(`🔥 Created temp room for ${member.user.tag}`);
}

// =================================================================
// CONTROL PANEL
// =================================================================

async function sendControlPanel(textChannel, owner, voiceChannel) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("🎛️ لوحة التحكم بالروم المؤقت")
    .setDescription(
      `**التحكم بالروم الخاص بك:**\n` +
      `الروم الصوتي: <#${voiceChannel.id}>\n\n` +
      `اختر الأدوات:`
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mute_all")
      .setLabel("كتم الجميع")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("unmute_all")
      .setLabel("فك الكتم")
      .setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("lock")
      .setLabel("قفل الروم")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("unlock")
      .setLabel("فتح الروم")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("hide")
      .setLabel("إخفاء")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("show")
      .setLabel("إظهار")
      .setStyle(ButtonStyle.Secondary)
  );

  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("kick_all")
      .setLabel("طرد الجميع")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("close_room")
      .setLabel("إغلاق الروم")
      .setStyle(ButtonStyle.Danger)
  );

  await textChannel.send({
    content: `👑 <@${owner.id}> هذه لوحة التحكم الخاصة برومك`,
    embeds: [embed],
    components: [row1, row2, row3, row4],
  });
}

// =================================================================
// BUTTON HANDLER
// =================================================================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const data = [...rooms.values()].find((d) => d.textId === interaction.channelId);
  if (!data) return;

  if (interaction.user.id !== data.ownerId)
    return interaction.reply({
      content: "❌ هذه اللوحة خاصة بصاحب الروم فقط.",
      ephemeral: true,
    });

  const guild = interaction.guild;
  const vc = guild.channels.cache.get(data.voiceId);

  if (!vc)
    return interaction.reply({ content: "❌ الروم غير موجود!", ephemeral: true });

  switch (interaction.customId) {
    case "mute_all":
      vc.members.forEach((m) => {
        if (m.id !== data.ownerId) m.voice.setMute(true).catch(() => {});
      });
      return interaction.reply({ content: "🔇 تم كتم الجميع.", ephemeral: true });

    case "unmute_all":
      vc.members.forEach((m) => m.voice.setMute(false).catch(() => {}));
      return interaction.reply({ content: "🔊 تم فك الكتم.", ephemeral: true });

    case "lock":
      await vc.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
      return interaction.reply({ content: "🔒 تم قفل الروم.", ephemeral: true });

    case "unlock":
      await vc.permissionOverwrites.edit(guild.roles.everyone, { Connect: true });
      return interaction.reply({ content: "🔓 تم فتح الروم.", ephemeral: true });

    case "hide":
      await vc.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
      return interaction.reply({ content: "👁️ تم إخفاء الروم.", ephemeral: true });

    case "show":
      await vc.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true });
      return interaction.reply({ content: "تم إظهار الروم.", ephemeral: true });

    case "kick_all":
      vc.members.forEach((m) => {
        if (m.id !== data.ownerId) m.voice.disconnect().catch(() => {});
      });
      return interaction.reply({ content: "🚫 تم طرد الجميع.", ephemeral: true });

    case "close_room":
      vc.delete().catch(() => {});
      interaction.channel.delete().catch(() => {});
      rooms.delete(data.ownerId);
      return interaction.reply({ content: "❌ تم حذف الروم.", ephemeral: true });
  }
});

// =================================================================
// VOICE HANDLER
// =================================================================

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member;

  // create room when entering lobby
  if (newState.channelId === config.lobbyId && !member.user.bot) {
    createTempRoom(member);
  }

  // auto delete room if last person leaves
  if (oldState.channelId) {
    const data = rooms.get(oldState.member.id);
    if (data) {
      const vc = oldState.guild.channels.cache.get(data.voiceId);
      if (vc && vc.members.filter((m) => !m.user.bot).size === 0) {
        vc.delete().catch(() => {});
        oldState.guild.channels.cache.get(data.textId)?.delete().catch(() => {});
        rooms.delete(data.ownerId);
        console.log("🗑️ Auto-deleted empty room.");
      }
    }
  }
});

// =================================================================
client.login(config.token);
