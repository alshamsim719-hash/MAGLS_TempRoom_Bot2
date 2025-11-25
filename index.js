require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  AuditLogEvent
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.GuildMember]
});

// ==============================
// ضع هنا ID القنوات الخاصة باللوق
// ==============================
const LOG = {
  ban: "1442550749341945886",
  unban: "1442550782330147078",
  kick: "1442550806321565826",
  join: "1442550849258651799",
  leave: "1442550872377786499",
  roleGive: "1442550894662123651",
  roleRemove: "1442550950865928202",
  nickname: "1442551010718515210",
  message: "1442551032625496135",
  security: "1442550982742376448"
};

// ===============
// بوت جاهز
// ===============
client.on("ready", () => {
  console.log(`🔥 Logged in as ${client.user.tag}`);
});

// ====================
// Ban Logs
// ====================
client.on("guildBanAdd", async (ban) => {
  const ch = ban.guild.channels.cache.get(LOG.ban);
  if (!ch) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❗ Ban Log")
        .setDescription(`**User:** ${ban.user.tag}\n**ID:** ${ban.user.id}`)
        .setColor("Red")
        .setTimestamp()
    ]
  });
});

// ====================
// UnBan Logs
// ====================
client.on("guildBanRemove", async (ban) => {
  const ch = ban.guild.channels.cache.get(LOG.unban);
  if (!ch) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❗ UnBan Log")
        .setDescription(`**User:** ${ban.user.tag}\n**ID:** ${ban.user.id}`)
        .setColor("Green")
        .setTimestamp()
    ]
  });
});

// ====================
// Kick Logs
// ====================
client.on("guildMemberRemove", async (member) => {
  const fetched = await member.guild.fetchAuditLogs({
    type: AuditLogEvent.MemberKick,
    limit: 1
  });
  const entry = fetched.entries.first();

  if (!entry) return;

  const ch = member.guild.channels.cache.get(LOG.kick);
  if (!ch) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❗ Kick Log")
        .setDescription(
          `**User:** ${member.user.tag}\n**By:** ${entry.executor.tag}`
        )
        .setColor("Orange")
        .setTimestamp()
    ]
  });
});

// ====================
// Join Logs
// ====================
client.on("guildMemberAdd", (member) => {
  const ch = member.guild.channels.cache.get(LOG.join);
  if (!ch) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❗ Join Log")
        .setDescription(`**User:** ${member.user.tag}`)
        .setColor("Blue")
        .setTimestamp()
    ]
  });
});

// ====================
// Leave Logs
// ====================
client.on("guildMemberRemove", (member) => {
  const ch = member.guild.channels.cache.get(LOG.leave);
  if (!ch) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❗ Leave Log")
        .setDescription(`**User:** ${member.user.tag}`)
        .setColor("Grey")
        .setTimestamp()
    ]
  });
});

// ====================
// Roles Logs
// ====================
client.on("guildMemberUpdate", (oldM, newM) => {
  let channelGive = newM.guild.channels.cache.get(LOG.roleGive);
  let channelRemove = newM.guild.channels.cache.get(LOG.roleRemove);

  // Role Added
  const added = newM.roles.cache.filter((r) => !oldM.roles.cache.has(r.id));
  if (added.size > 0) {
    added.forEach((role) => {
      channelGive?.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("❗ Role Added")
            .setDescription(
              `**User:** ${newM.user.tag}\n**Role:** ${role.name}`
            )
            .setColor("Green")
            .setTimestamp()
        ]
      });
    });
  }

  // Role Removed
  const removed = oldM.roles.cache.filter((r) => !newM.roles.cache.has(r.id));
  if (removed.size > 0) {
    removed.forEach((role) => {
      channelRemove?.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("❗ Role Removed")
            .setDescription(
              `**User:** ${newM.user.tag}\n**Role:** ${role.name}`
            )
            .setColor("Red")
            .setTimestamp()
        ]
      });
    });
  }
});

// ====================
// Nickname Logs
// ====================
client.on("guildMemberUpdate", (oldM, newM) => {
  if (oldM.nickname !== newM.nickname) {
    const ch = newM.guild.channels.cache.get(LOG.nickname);
    if (!ch) return;

    ch.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("❗ Nickname Change")
          .setDescription(
            `**User:** ${newM.user.tag}\n**Old:** ${oldM.nickname}\n**New:** ${newM.nickname}`
          )
          .setColor("Purple")
          .setTimestamp()
      ]
    });
  }
});

// ====================
// Message Logs
// ====================

// Delete
client.on("messageDelete", (msg) => {
  const ch = msg.guild.channels.cache.get(LOG.message);
  if (!ch || !msg.author) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❗ Message Deleted")
        .setDescription(
          `**User:** ${msg.author.tag}\n**Content:** ${msg.content || "Embed/File"}`
        )
        .setColor("Red")
        .setTimestamp()
    ]
  });
});

// Edit
client.on("messageUpdate", (oldMsg, newMsg) => {
  const ch = newMsg.guild.channels.cache.get(LOG.message);
  if (!ch || !oldMsg.content || !newMsg.content) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❗ Message Edited")
        .setDescription(
          `**User:** ${newMsg.author.tag}\n**Old:** ${oldMsg.content}\n**New:** ${newMsg.content}`
        )
        .setColor("Yellow")
        .setTimestamp()
    ]
  });
});

// ====================
// Security Log
// ====================
client.on("guildAuditLogEntryCreate", (entry) => {
  const ch = entry.target.guild.channels.cache.get(LOG.security);
  if (!ch) return;

  ch.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("❗ Security Log")
        .setDescription(
          `**Action:** ${entry.action}\n**Executor:** ${entry.executor.tag}`
        )
        .setColor("DarkRed")
        .setTimestamp()
    ]
  });
});

// ====================
// Login
// ====================
client.login(process.env.TOKEN);
