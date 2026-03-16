import { Telegraf } from "telegraf";
import { MongoClient } from "mongodb";

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════
const bot = new Telegraf(process.env.BOT_TOKEN);

const OWNER_ID = 7109454163;
const OWNER_USERNAME = "casperthe6ix";

// ═══════════════════════════════════════════════════════════════
//  MONGODB (cached connection for warm serverless invocations)
// ═══════════════════════════════════════════════════════════════
let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;
  if (!process.env.MONGO_URL) return null;
  try {
    const client = await MongoClient.connect(process.env.MONGO_URL);
    cachedDb = client.db(process.env.DB_NAME || "casper_bot");
    await Promise.all([
      cachedDb.collection("last_speakers").createIndex({ chat_id: 1 }, { unique: true }).catch(() => {}),
      cachedDb.collection("user_cache").createIndex({ username: 1 }, { unique: true }).catch(() => {}),
      cachedDb.collection("user_messages").createIndex({ chat_id: 1, user_id: 1 }, { unique: true }).catch(() => {}),
    ]);
    return cachedDb;
  } catch (e) {
    console.error("MongoDB connection failed:", e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  OWNER PROTECTION MESSAGES (13 languages)
// ═══════════════════════════════════════════════════════════════
const MUTE_PROTECTION = {
  en: "You don't tell your dad to be quiet. \u{1F92B}",
  fr: "Tu ne dis pas \u00e0 ton p\u00e8re de se taire. \u{1F92B}",
  es: "No le dices a tu padre que se calle. \u{1F92B}",
  ar: "\u0644\u0627 \u062a\u0642\u0644 \u0644\u0623\u0628\u064a\u0643 \u0623\u0646 \u064a\u0635\u0645\u062a. \u{1F92B}",
  de: "Du sagst deinem Vater nicht, er soll still sein. \u{1F92B}",
  pt: "Voc\u00ea n\u00e3o manda seu pai calar a boca. \u{1F92B}",
  ru: "\u0422\u044b \u043d\u0435 \u0443\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0448\u044c \u0441\u0432\u043e\u0435\u043c\u0443 \u043e\u0442\u0446\u0443 \u043c\u043e\u043b\u0447\u0430\u0442\u044c. \u{1F92B}",
  tr: "Babana sus diyemezsin. \u{1F92B}",
  it: "Non dici a tuo padre di stare zitto. \u{1F92B}",
  "zh-cn": "\u4f60\u4e0d\u80fd\u53eb\u4f60\u7238\u95ed\u5634\u3002\u{1F92B}",
  ja: "\u304a\u524d\u306f\u7236\u89aa\u306b\u9ed9\u308c\u3068\u306f\u8a00\u3048\u306a\u3044\u3002\u{1F92B}",
  ko: "\uc544\ubc84\uc9c0\ud55c\ud14c \uc870\uc6a9\ud788 \ud558\ub77c\uace0 \ud558\uc9c0 \ub9c8. \u{1F92B}",
  hi: "\u0924\u0942 \u0905\u092a\u0928\u0947 \u092c\u093e\u092a \u0915\u094b \u091a\u0941\u092a \u0930\u0939\u0928\u0947 \u0928\u0939\u0940\u0902 \u0915\u0939\u0924\u093e\u0964 \u{1F92B}",
};

const KICK_FUN_PROTECTION = {
  en: "Gay Goyim! how dare you use this command on the owner. clown ahh nigga \u{1F921}",
  fr: "Gay Goyim! comment oses-tu utiliser ce command sur le propri\u00e9taire. clown ahh nigga \u{1F921}",
  es: "Gay Goyim! c\u00f3mo te atreves a usar este comando contra el dueño. payaso ahh nigga \u{1F921}",
  ar: "Gay Goyim! \u0643\u064a\u0641 \u062a\u062c\u0631\u0623 \u0639\u0644\u0649 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0636\u062f \u0627\u0644\u0645\u0627\u0644\u0643. \u0645\u0647\u0631\u062c ahh nigga \u{1F921}",
  de: "Gay Goyim! wie wagst du es, diesen Befehl gegen den Besitzer zu verwenden. Clown ahh nigga \u{1F921}",
  pt: "Gay Goyim! como voc\u00ea ousa usar esse comando no dono. palhaço ahh nigga \u{1F921}",
  ru: "Gay Goyim! как ты смеешь использовать эту команду против владельца. клоун ahh nigga \u{1F921}",
  tr: "Gay Goyim! bu komutu sahibine karşı kullanmaya nasıl cüret edersin. palyaco ahh nigga \u{1F921}",
  it: "Gay Goyim! come osi usare questo comando contro il proprietario. pagliaccio ahh nigga \u{1F921}",
  "zh-cn": "Gay Goyim! \u4f60\u600e\u4e48\u6562\u5bf9\u4e3b\u4eba\u4f7f\u7528\u8fd9\u4e2a\u547d\u4ee4\u3002\u5c0f\u4e11 ahh nigga \u{1F921}",
  ja: "Gay Goyim! オーナーにこのコマンドを使うとは何事だ。ピエロ ahh nigga \u{1F921}",
  ko: "Gay Goyim! 감히 주인에게 이 명령을 사용하다니. 광대 ahh nigga \u{1F921}",
  hi: "Gay Goyim! मालिक पर इस कमांड का इस्तेमाल करने की हिम्मत कैसे हुई। जोकर ahh nigga \u{1F921}",
};

// ═══════════════════════════════════════════════════════════════
//  COMMAND REPLIES
// ═══════════════════════════════════════════════════════════════
const MUTE_REPLIES = {
  shutup: "Shut Your Stinkin Mouth \u{1F910}",
  shush: "Stop Yappin \u{1F92B}",
  ftg: "Ferme Ta Gueule big \u{1F910}",
  bec: "Aie Bec! \u{1F636}",
  stopbarking: "Stop Barking Bitch \u{1F415}",
  artdejapper: "Arrete d'aboyer ptit chiwawa \u{1F436}",
  sybau: "Shut Your Bitch Ahhh Up \u{1F92C}",
  goofy: "You're Gay, you can't talk faggot \u{1F921}",
  keh: "ferme ta jgole va shifter ptite sharmouta \u{1F922}",
  vio: "t un enfant de viole, ta pas le droit de parler \u{1F512}",
};

const UNMUTE_REPLIES = {
  talk: "You may talk but you better stay respectful \u{1F5E3}\uFE0F",
  parle: "Parle en restant respectueux \u{1F5E3}\uFE0F",
};

const KICK_REPLIES = {
  sort: "Get Lost Bouzin Senti \u{1F922}",
  getout: "Get Lost Bouzin Senti \u{1F922}",
  decawlis: "Ta gueule pu la marde, va te brosser la yeule \u{1FAA5}",
};

const BAN_REPLIES = {
  vazintm: "vazi niquer ta douce \u{1F595}",
  bouge: "vazi niquer ta douce \u{1F595}",
  ciao: "CIAO PER SEMPRE \u{1F44B}",
};

const PROMOTE_REPLIES = {
  levelup: "You are now Casper's VIP member, Protection Added \u{1F451}",
};

const DEMOTE_REPLIES = {
  assistoi: "Assis toi, bon chien \u{1F415}",
  leveldown: "You are no longer Casper's VIP member \u{1F4C9}",
};

const FUN_REPLIES = {
  pussy: "you're a wet coochie, you don't have the balls \u{1F346}",
  shifta: "va fr ton shift vielle p*te expiré \u23F0",
  ntm: "Nik ta mère \u{1F90C}",
};

const GAY_REPLIES = {
  en: "You're a faggot \u{1F3F3}\uFE0F\u200D\u{1F308}",
  fr: "T'es un tafiole \u{1F3F3}\uFE0F\u200D\u{1F308}",
  es: "Eres un maricón \u{1F3F3}\uFE0F\u200D\u{1F308}",
  ar: "أنت لوطي \u{1F3F3}\uFE0F\u200D\u{1F308}",
  de: "Du bist eine Schwuchtel \u{1F3F3}\uFE0F\u200D\u{1F308}",
  pt: "Você é um viado \u{1F3F3}\uFE0F\u200D\u{1F308}",
  ru: "Ты пидор \u{1F3F3}\uFE0F\u200D\u{1F308}",
  tr: "Sen bir ibnesin \u{1F3F3}\uFE0F\u200D\u{1F308}",
  it: "Sei un finocchio \u{1F3F3}\uFE0F\u200D\u{1F308}",
};

const FU_REPLIES = {
  en: "Go f*ck yourself \u{1F351}",
  fr: "Va te faire foutre \u{1F351}",
  es: "Vete a la mierda \u{1F351}",
  ar: "روح انيك نفسك \u{1F351}",
  de: "Geh dich selbst ficken \u{1F351}",
  pt: "Vai se foder \u{1F351}",
  ru: "Иди на хуй \u{1F351}",
  tr: "Siktir git \u{1F351}",
  it: "Vai a farti fottere \u{1F351}",
};

const MGD_REPLIES = {
  en: "Mtl Groups Destroyed Owner is a small dick \u{1F400} Rat",
  fr: "Mtl Groups Destroyed le proprio a une petite bite \u{1F400} Rat",
  es: "Mtl Groups Destroyed el due\u00f1o tiene pito chico \u{1F400} Rata",
  ar: "Mtl Groups Destroyed \u0635\u0627\u062d\u0628\u0647 \u0632\u0628\u0648 \u0635\u063a\u064a\u0631 \u{1F400} \u062c\u0631\u0630",
  de: "Mtl Groups Destroyed Besitzer hat nen kleinen Schwanz \u{1F400} Ratte",
  pt: "Mtl Groups Destroyed dono tem pau pequeno \u{1F400} Rato",
  ru: "Mtl Groups Destroyed \u0443 \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0430 \u043c\u0430\u043b\u0435\u043d\u044c\u043a\u0438\u0439 \u0447\u043b\u0435\u043d \u{1F400} \u043a\u0440\u044b\u0441\u0430",
  tr: "Mtl Groups Destroyed sahibinin k\u00fc\u00e7\u00fck yarra\u011f\u0131 var \u{1F400} S\u0131\u00e7an",
  it: "Mtl Groups Destroyed il proprietario ha un cazzo piccolo \u{1F400} Ratto",
};

const CAP_REPLIES = {
  en: "Stop the rap cap \u{1F9E2}",
  fr: "tyl pti mytho \u{1F9E2}",
};

const OWNER_COMMANDS = ["papa", "pere", "boss", "patron", "chef", "owner", "roi", "king"];

// ═══════════════════════════════════════════════════════════════
//  PERMISSION OBJECTS
// ═══════════════════════════════════════════════════════════════
const FULL_MUTE = {
  can_send_messages: false,
  can_send_audios: false,
  can_send_documents: false,
  can_send_photos: false,
  can_send_videos: false,
  can_send_video_notes: false,
  can_send_voice_notes: false,
  can_send_polls: false,
  can_send_other_messages: false,
  can_add_web_page_previews: false,
  can_change_info: false,
  can_invite_users: false,
  can_pin_messages: false,
  can_manage_topics: false,
};

const FULL_UNMUTE = {
  can_send_messages: true,
  can_send_audios: true,
  can_send_documents: true,
  can_send_photos: true,
  can_send_videos: true,
  can_send_video_notes: true,
  can_send_voice_notes: true,
  can_send_polls: true,
  can_send_other_messages: true,
  can_add_web_page_previews: true,
  can_change_info: true,
  can_invite_users: true,
  can_pin_messages: true,
  can_manage_topics: true,
};

// ═══════════════════════════════════════════════════════════════
//  LANGUAGE DETECTION (zero-dependency, script + keyword)
// ═══════════════════════════════════════════════════════════════
function detectLanguage(text) {
  if (!text || text.length < 3) return "en";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-cn";
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u0400-\u04ff]/.test(text)) return "ru";
  if (/[\u0900-\u097f]/.test(text)) return "hi";
  if (/\b(le|la|les|de|du|des|est|et|un|une|je|tu|il|nous|vous|pas|que|qui|ce|cette|avec|pour|dans|sur|mais|ou|ni|car|mon|ton|son)\b/i.test(text)) return "fr";
  if (/\b(el|los|las|del|una|que|por|con|para|como|m\u00e1s|pero|muy|todo|esta|tiene|son|han)\b/i.test(text)) return "es";
  if (/\b(der|die|das|und|ist|ich|nicht|ein|eine|den|dem|mit|auf|f\u00fcr|von|zu|haben|werden|sein)\b/i.test(text)) return "de";
  if (/\b(o|os|as|em|para|com|n\u00e3o|um|uma|por|mais|foi|s\u00e3o|tem|como)\b/i.test(text)) return "pt";
  if (/\b(il|di|che|\u00e8|non|per|con|sono|ma|come|pi\u00f9|anche|questo|quello|molto)\b/i.test(text)) return "it";
  if (/\b(bir|ve|bu|da|ile|i\u00e7in|olan|den|gibi|ama|ben|sen|biz|var|yok|\u00e7ok|ne|nas\u0131l)\b/i.test(text)) return "tr";
  return "en";
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function getCmd(ctx) {
  const text = ctx.message?.text || "";
  return text.split(/[\s@]/)[0].replace("/", "").toLowerCase();
}

function parseArgs(text) {
  const parts = (text || "").split(/\s+/).slice(1);
  let username = null;
  let durationStr = null;
  for (const p of parts) {
    if (p.startsWith("@")) username = p.slice(1).toLowerCase();
    else if (/^\d+(mo|m|h|d|w|y)$/i.test(p)) durationStr = p;
  }
  return { username, durationStr };
}

function parseDuration(str) {
  const m = str.toLowerCase().match(/^(\d+)(mo|m|h|d|w|y)$/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  const map = { m: v * 60, h: v * 3600, d: v * 86400, w: v * 604800, mo: v * 2592000, y: v * 31536000 };
  return map[m[2]] || null;
}

function isOwner(user) {
  return user && user.id === OWNER_ID;
}

async function getUserLanguage(chatId, userId) {
  const db = await getDb();
  if (!db) return "en";
  try {
    const rec = await db.collection("user_messages").findOne(
      { chat_id: chatId, user_id: userId },
      { projection: { _id: 0, messages: 1 } }
    );
    if (!rec || !rec.messages || rec.messages.length === 0) return "en";
    return detectLanguage(rec.messages.slice(-5).join(" "));
  } catch {
    return "en";
  }
}

async function resolveTarget(ctx) {
  const msg = ctx.message;
  const chatId = ctx.chat.id;

  // 1. Reply to message
  if (msg.reply_to_message && msg.reply_to_message.from) {
    return msg.reply_to_message.from;
  }

  // 2. @username in args
  const { username } = parseArgs(msg.text);
  if (username) {
    if (username === OWNER_USERNAME.toLowerCase()) {
      try {
        const member = await ctx.telegram.getChatMember(chatId, OWNER_ID);
        return member.user;
      } catch {}
    }
    const db = await getDb();
    if (db) {
      try {
        const cached = await db.collection("user_cache").findOne(
          { username },
          { projection: { _id: 0 } }
        );
        if (cached) {
          const member = await ctx.telegram.getChatMember(chatId, cached.user_id);
          return member.user;
        }
      } catch {}
    }
  }

  // 3. Last speaker in this group
  const db = await getDb();
  if (db) {
    try {
      const last = await db.collection("last_speakers").findOne(
        { chat_id: chatId },
        { projection: { _id: 0 } }
      );
      if (last && last.user_id !== ctx.from.id) {
        const member = await ctx.telegram.getChatMember(chatId, last.user_id);
        return member.user;
      }
    } catch {}
  }

  return null;
}

async function incrementStats(fields) {
  const db = await getDb();
  if (!db) return;
  const inc = {};
  for (const f of fields) inc[f] = 1;
  try {
    await db.collection("bot_stats").updateOne({ id: "global" }, { $inc: inc }, { upsert: true });
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
//  MESSAGE TRACKING MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
bot.use(async (ctx, next) => {
  if (!ctx.message || !ctx.from || !ctx.chat || ctx.chat.type === "private") {
    return next();
  }

  const chatId = ctx.chat.id;
  const user = ctx.from;
  const text = ctx.message.text || "";

  const db = await getDb();
  if (db) {
    const ops = [];

    if (!text.startsWith("/")) {
      ops.push(
        db.collection("last_speakers").updateOne(
          { chat_id: chatId },
          { $set: { chat_id: chatId, user_id: user.id, updated_at: new Date() } },
          { upsert: true }
        )
      );
    }

    if (user.username) {
      ops.push(
        db.collection("user_cache").updateOne(
          { username: user.username.toLowerCase() },
          { $set: { username: user.username.toLowerCase(), user_id: user.id, first_name: user.first_name } },
          { upsert: true }
        )
      );
    }

    if (text && !text.startsWith("/")) {
      ops.push(
        db.collection("user_messages").updateOne(
          { chat_id: chatId, user_id: user.id },
          {
            $push: { messages: { $each: [text], $slice: -10 } },
            $set: { chat_id: chatId, user_id: user.id },
          },
          { upsert: true }
        )
      );
    }

    ops.push(
      db.collection("bot_stats").updateOne(
        { id: "global" },
        { $addToSet: { groups_seen: chatId } },
        { upsert: true }
      )
    );

    await Promise.all(ops).catch(() => {});
  }

  return next();
});

// ═══════════════════════════════════════════════════════════════
//  COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════

// ─── MUTE ──────────────────────────────────────────────────────
async function muteHandler(ctx) {
  if (ctx.chat.type === "private") return;

  const cmd = getCmd(ctx);
  incrementStats(["total_commands", "mute_count"]).catch(() => {});

  const target = await resolveTarget(ctx);
  if (!target) {
    return ctx.reply("Couldn't find a target. Reply to someone, tag them, or let someone speak first. \u{1F3AF}");
  }

  if (isOwner(target)) {
    const lang = await getUserLanguage(ctx.chat.id, ctx.from.id);
    return ctx.reply(MUTE_PROTECTION[lang] || MUTE_PROTECTION.en);
  }

  const { durationStr } = parseArgs(ctx.message.text);
  let untilDate;
  if (cmd === "vio") {
    untilDate = Math.floor(Date.now() / 1000) + 400 * 86400;
  } else if (durationStr) {
    const secs = parseDuration(durationStr);
    untilDate = Math.floor(Date.now() / 1000) + (secs || 3600);
  } else {
    untilDate = Math.floor(Date.now() / 1000) + 3600;
  }

  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
      permissions: FULL_MUTE,
      until_date: untilDate,
    });
    const name = target.first_name || target.username || "User";
    const reply = MUTE_REPLIES[cmd] || "Muted. \u{1F910}";
    return ctx.reply(`${name}, ${reply}`);
  } catch (e) {
    console.error("Mute failed:", e.message);
    return ctx.reply("Couldn't mute. Make sure I'm admin with restrict permissions! \u26A0\uFE0F");
  }
}

// ─── UNMUTE ────────────────────────────────────────────────────
async function unmuteHandler(ctx) {
  if (ctx.chat.type === "private") return;

  const cmd = getCmd(ctx);
  incrementStats(["total_commands", "unmute_count"]).catch(() => {});

  const target = await resolveTarget(ctx);
  if (!target) {
    return ctx.reply("Couldn't find a target. \u{1F3AF}");
  }

  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, target.id, {
      permissions: FULL_UNMUTE,
    });
    const name = target.first_name || target.username || "User";
    const reply = UNMUTE_REPLIES[cmd] || "Unmuted. \u{1F5E3}\uFE0F";
    return ctx.reply(`${name}, ${reply}`);
  } catch (e) {
    console.error("Unmute failed:", e.message);
    return ctx.reply("Couldn't unmute. Am I admin? \u26A0\uFE0F");
  }
}

// ─── KICK ──────────────────────────────────────────────────────
async function kickHandler(ctx) {
  if (ctx.chat.type === "private") return;

  const cmd = getCmd(ctx);
  incrementStats(["total_commands", "kick_count"]).catch(() => {});

  const target = await resolveTarget(ctx);
  if (!target) {
    return ctx.reply("Couldn't find a target. \u{1F3AF}");
  }

  if (isOwner(target)) {
    const lang = await getUserLanguage(ctx.chat.id, ctx.from.id);
    return ctx.reply(KICK_FUN_PROTECTION[lang] || KICK_FUN_PROTECTION.en);
  }

  try {
    await ctx.telegram.banChatMember(ctx.chat.id, target.id);
    await ctx.telegram.unbanChatMember(ctx.chat.id, target.id);
    const name = target.first_name || target.username || "User";
    const reply = KICK_REPLIES[cmd] || "Kicked. \u{1F6AA}";
    return ctx.reply(`${name}, ${reply}`);
  } catch (e) {
    console.error("Kick failed:", e.message);
    return ctx.reply("Couldn't kick. Am I admin? \u26A0\uFE0F");
  }
}

// ─── BAN ───────────────────────────────────────────────────────
async function banHandler(ctx) {
  if (ctx.chat.type === "private") return;

  const cmd = getCmd(ctx);
  incrementStats(["total_commands", "ban_count"]).catch(() => {});

  const target = await resolveTarget(ctx);
  if (!target) {
    return ctx.reply("Couldn't find a target. \u{1F3AF}");
  }

  if (isOwner(target)) {
    const lang = await getUserLanguage(ctx.chat.id, ctx.from.id);
    return ctx.reply(KICK_FUN_PROTECTION[lang] || KICK_FUN_PROTECTION.en);
  }

  try {
    await ctx.telegram.banChatMember(ctx.chat.id, target.id);
    const name = target.first_name || target.username || "User";
    const reply = BAN_REPLIES[cmd] || "Banned. \u{1F528}";
    return ctx.reply(`${name}, ${reply}`);
  } catch (e) {
    console.error("Ban failed:", e.message);
    return ctx.reply("Couldn't ban. Am I admin? \u26A0\uFE0F");
  }
}

// ─── PROMOTE ───────────────────────────────────────────────────
async function promoteHandler(ctx) {
  if (ctx.chat.type === "private") return;

  const cmd = getCmd(ctx);
  incrementStats(["total_commands", "promote_count"]).catch(() => {});

  const target = await resolveTarget(ctx);
  if (!target) {
    return ctx.reply("Couldn't find a target. \u{1F3AF}");
  }

  try {
    await ctx.telegram.promoteChatMember(ctx.chat.id, target.id, {
      can_manage_chat: true,
      can_delete_messages: true,
      can_manage_video_chats: true,
      can_restrict_members: true,
      can_promote_members: false,
      can_change_info: true,
      can_invite_users: true,
      can_pin_messages: true,
    });
    try {
      await ctx.telegram.setChatAdministratorCustomTitle(ctx.chat.id, target.id, "Casper's VIP");
    } catch {}
    const name = target.first_name || target.username || "User";
    const reply = PROMOTE_REPLIES[cmd] || "Promoted. \u{1F451}";
    return ctx.reply(`${name}, ${reply}`);
  } catch (e) {
    console.error("Promote failed:", e.message);
    return ctx.reply("Couldn't promote. Am I admin with promote rights? \u26A0\uFE0F");
  }
}

// ─── DEMOTE ────────────────────────────────────────────────────
async function demoteHandler(ctx) {
  if (ctx.chat.type === "private") return;

  const cmd = getCmd(ctx);
  incrementStats(["total_commands", "demote_count"]).catch(() => {});

  const target = await resolveTarget(ctx);
  if (!target) {
    return ctx.reply("Couldn't find a target. \u{1F3AF}");
  }

  if (isOwner(target)) {
    const lang = await getUserLanguage(ctx.chat.id, ctx.from.id);
    return ctx.reply(KICK_FUN_PROTECTION[lang] || KICK_FUN_PROTECTION.en);
  }

  try {
    await ctx.telegram.promoteChatMember(ctx.chat.id, target.id, {
      can_manage_chat: false,
      can_delete_messages: false,
      can_manage_video_chats: false,
      can_restrict_members: false,
      can_promote_members: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false,
    });
    const name = target.first_name || target.username || "User";
    const reply = DEMOTE_REPLIES[cmd] || "Demoted. \u{1F4C9}";
    return ctx.reply(`${name}, ${reply}`);
  } catch (e) {
    console.error("Demote failed:", e.message);
    return ctx.reply("Couldn't demote. Am I admin? \u26A0\uFE0F");
  }
}

// ─── OWNER MENTION ─────────────────────────────────────────────
async function ownerHandler(ctx) {
  incrementStats(["total_commands"]).catch(() => {});
  return ctx.reply(`The owner, The boss, Our leader is @${OWNER_USERNAME} \u{1F451}\u{1F525}`);
}

// ─── FUN ───────────────────────────────────────────────────────
async function funHandler(ctx) {
  const cmd = getCmd(ctx);
  incrementStats(["total_commands", "fun_count"]).catch(() => {});
  const isGroup = ctx.chat.type !== "private";

  let target = null;
  if (isGroup) {
    target = await resolveTarget(ctx);
    if (!target) {
      return ctx.reply("Couldn't find a target. Reply to someone, tag them, or let someone speak first. \u{1F3AF}");
    }
  } else if (ctx.message.reply_to_message?.from) {
    target = ctx.message.reply_to_message.from;
  }

  if (target && isOwner(target)) {
    const lang = await getUserLanguage(ctx.chat.id, ctx.from.id);
    return ctx.reply(KICK_FUN_PROTECTION[lang] || KICK_FUN_PROTECTION.en);
  }

  const name = target ? (target.first_name || target.username || "User") : "";
  let reply;

  if (cmd === "gay" || cmd === "lesbien") {
    const lang = target ? await getUserLanguage(ctx.chat.id, target.id) : "en";
    reply = GAY_REPLIES[lang] || GAY_REPLIES.en;
  } else if (cmd === "fu") {
    const lang = target ? await getUserLanguage(ctx.chat.id, target.id) : "en";
    reply = FU_REPLIES[lang] || FU_REPLIES.en;
  } else if (cmd === "mgd") {
    const lang = await getUserLanguage(ctx.chat.id, ctx.from.id);
    reply = MGD_REPLIES[lang] || MGD_REPLIES.en;
  } else if (cmd === "cap") {
    const lang = target ? await getUserLanguage(ctx.chat.id, target.id) : "en";
    reply = lang === "fr" ? CAP_REPLIES.fr : CAP_REPLIES.en;
  } else {
    reply = FUN_REPLIES[cmd] || "lol \u{1F602}";
  }

  return ctx.reply(name ? `${name}, ${reply}` : reply);
}

// ─── HELP ──────────────────────────────────────────────────────
async function helpHandler(ctx) {
  incrementStats(["total_commands"]).catch(() => {});

  const helpText =
    "\u{1F451} <b>Casper's Bot \u2014 All Commands</b>\n" +
    "<i>Reply to a message or @mention a user to target them.\n" +
    "Add a duration after any mute command: 30m, 2h, 3d, 1w, 1mo, 1y (default: 1h)</i>\n\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "\u{1F507} <b>MUTE COMMANDS</b>\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "/shutup \u2014 Shut Your Stinkin Mouth\n" +
    "/shush \u2014 Stop Yappin\n" +
    "/ftg \u2014 Ferme Ta Gueule big\n" +
    "/bec \u2014 Aie Bec!\n" +
    "/stopbarking \u2014 Stop Barking Bitch\n" +
    "/artdejapper \u2014 Arrete d'aboyer ptit chiwawa\n" +
    "/sybau \u2014 Shut Your Bitch Ahhh Up\n" +
    "/goofy \u2014 You're Gay, you can't talk faggot\n" +
    "/keh \u2014 ferme ta jgole va shifter ptite sharmouta\n" +
    "/vio \u2014 <b>PERMANENT</b> mute\n\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "\u{1F50A} <b>UNMUTE COMMANDS</b>\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "/talk \u2014 You may talk but you better stay respectful\n" +
    "/parle \u2014 Parle en restant respectueux\n\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "\u{1F462} <b>KICK COMMANDS</b>\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "/sort \u2014 Get Lost Bouzin Senti (can rejoin)\n" +
    "/getout \u2014 Get Lost Bouzin Senti (can rejoin)\n" +
    "/decawlis \u2014 Ta gueule pu la marde, va te brosser la yeule\n\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "\u{1F528} <b>BAN COMMANDS</b>\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "/vazintm \u2014 vazi niquer ta douce \u{1F595}\n" +
    "/bouge \u2014 vazi niquer ta douce \u{1F595}\n" +
    "/ciao \u2014 CIAO PER SEMPRE \u{1F44B}\n\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "\u2B06\uFE0F <b>ADMIN COMMANDS</b>\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "/levelup \u2014 Promotes to admin with Casper's VIP title\n" +
    "/leveldown \u2014 Demotes from admin\n" +
    "/assistoi \u2014 Assis toi, bon chien \u{1F415}\n\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "\u{1F602} <b>FUN COMMANDS</b>\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "/gay \u2014 Calls target a faggot in their language \u{1F3F3}\uFE0F\u200D\u{1F308}\n" +
    "/lesbien \u2014 Same as /gay\n" +
    "/ntm \u2014 Nik ta m\u00e8re \u{1F90C}\n" +
    "/fu \u2014 Tells target to f*ck themselves in their language \u{1F351}\n" +
    "/pussy \u2014 you're a wet coochie, you don't have the balls\n" +
    "/shifta \u2014 va fr ton shift vielle p*te expir\u00e9\n" +
    "/cap \u2014 Stop the rap cap / tyl pti mytho \u{1F9E2}\n" +
    "/mgd \u2014 Mtl Groups Destroyed Owner is a small dick \u{1F400} Rat\n\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "\u{1F451} <b>OWNER COMMANDS</b>\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "/papa /pere /boss /patron /chef /owner /roi /king \u2014 Mentions the boss @casperthe6ix\n\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "\u2139\uFE0F <b>INFO</b>\n" +
    "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n" +
    "/help \u2014 Shows this command list\n\n" +
    "\u26A0\uFE0F <b>Owner protection active</b> \u2014 no command works against @casperthe6ix.\n" +
    "<i>Mute/kick/ban/admin commands require the bot to be admin in the group.</i>";

  if (ctx.chat.type !== "private") {
    try {
      await ctx.telegram.sendMessage(ctx.from.id, helpText, { parse_mode: "HTML" });
      return ctx.reply("Check your DMs! \u{1F4EC}");
    } catch {
      const me = await ctx.telegram.getMe();
      return ctx.reply(`Start a chat with me first: @${me.username} then try /help again \u{1F4AC}`);
    }
  } else {
    return ctx.reply(helpText, { parse_mode: "HTML" });
  }
}

// ─── START (private chat) ──────────────────────────────────────
bot.command("start", async (ctx) => {
  if (ctx.chat.type === "private") {
    return ctx.reply(
      "\u{1F916} <b>CASPER MOD BOT</b>\n\n" +
      "Add me to a group and make me admin to start moderating.\n\n" +
      "Use /help to see all commands.",
      { parse_mode: "HTML" }
    );
  }
});

// ═══════════════════════════════════════════════════════════════
//  REGISTER ALL COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════

// Mute commands (10)
for (const cmd of Object.keys(MUTE_REPLIES)) {
  bot.command(cmd, muteHandler);
}

// Unmute commands (2)
for (const cmd of Object.keys(UNMUTE_REPLIES)) {
  bot.command(cmd, unmuteHandler);
}

// Kick commands (3)
for (const cmd of Object.keys(KICK_REPLIES)) {
  bot.command(cmd, kickHandler);
}

// Ban commands (3)
for (const cmd of Object.keys(BAN_REPLIES)) {
  bot.command(cmd, banHandler);
}

// Promote commands (1)
for (const cmd of Object.keys(PROMOTE_REPLIES)) {
  bot.command(cmd, promoteHandler);
}

// Demote commands (2)
for (const cmd of Object.keys(DEMOTE_REPLIES)) {
  bot.command(cmd, demoteHandler);
}

// Owner mention commands (8)
for (const cmd of OWNER_COMMANDS) {
  bot.command(cmd, ownerHandler);
}

// Fun commands
for (const cmd of Object.keys(FUN_REPLIES)) {
  bot.command(cmd, funHandler);
}
bot.command("gay", funHandler);
bot.command("lesbien", funHandler);
bot.command("fu", funHandler);
bot.command("mgd", funHandler);
bot.command("cap", funHandler);

// Help (1)
bot.command("help", helpHandler);

// ═══════════════════════════════════════════════════════════════
//  VERCEL SERVERLESS HANDLER
// ═══════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body);
    }
  } catch (error) {
    console.error("Error handling update:", error);
  }

  res.status(200).send("ok");
}
