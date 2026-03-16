/**
 * Casper Mod Bot - Code Validation Tests
 * Tests all command registrations, reply texts, and configurations
 * Run with: node tests/bot_validation.test.js
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read bot.js source code for analysis
const botJsPath = path.join(__dirname, '..', 'api', 'bot.js');
const botJsContent = fs.readFileSync(botJsPath, 'utf-8');

let passed = 0;
let failed = 0;

function test(name, assertion) {
  try {
    if (assertion()) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${name} - ${e.message}`);
    failed++;
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  CASPER MOD BOT - CODE VALIDATION TESTS');
console.log('═══════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════
//  FILE STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════
console.log('▸ FILE STRUCTURE\n');

test('api/bot.js exists', () => fs.existsSync(path.join(__dirname, '..', 'api', 'bot.js')));
test('api/set-webhook.js exists', () => fs.existsSync(path.join(__dirname, '..', 'api', 'set-webhook.js')));
test('package.json exists', () => fs.existsSync(path.join(__dirname, '..', 'package.json')));
test('vercel.json exists', () => fs.existsSync(path.join(__dirname, '..', 'vercel.json')));
test('README.md exists', () => fs.existsSync(path.join(__dirname, '..', 'README.md')));

// ═══════════════════════════════════════════════════════════════
//  PACKAGE.JSON VALIDATION
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ PACKAGE.JSON VALIDATION\n');

const pkgJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

test('package.json has type: module (ESM)', () => pkgJson.type === 'module');
test('package.json has telegraf dependency', () => !!pkgJson.dependencies?.telegraf);
test('package.json has mongodb dependency', () => !!pkgJson.dependencies?.mongodb);

// ═══════════════════════════════════════════════════════════════
//  VERCEL.JSON VALIDATION
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ VERCEL.JSON VALIDATION\n');

const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf-8'));

test('vercel.json has maxDuration: 10 for api/bot.js', () => 
  vercelJson.functions?.['api/bot.js']?.maxDuration === 10);

// ═══════════════════════════════════════════════════════════════
//  ESM MODULE FORMAT
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ ESM MODULE FORMAT\n');

test('bot.js uses import statements', () => /^import .+ from/m.test(botJsContent));
test('bot.js uses export default', () => /export default/m.test(botJsContent));
test('bot.js does NOT use require()', () => !/\brequire\s*\(/m.test(botJsContent));
test('bot.js does NOT use module.exports', () => !/module\.exports/m.test(botJsContent));

// ═══════════════════════════════════════════════════════════════
//  WEBHOOK-ONLY ARCHITECTURE
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ WEBHOOK-ONLY ARCHITECTURE\n');

test('bot.js does NOT use bot.launch() (no polling)', () => !/bot\.launch\s*\(/m.test(botJsContent));
test('bot.js does NOT use startPolling', () => !/startPolling/m.test(botJsContent));
test('bot.js default export handles POST with bot.handleUpdate', () => 
  /export default async function.*\{[\s\S]*if\s*\(\s*req\.method\s*===\s*["']POST["']\s*\)[\s\S]*bot\.handleUpdate\s*\(/m.test(botJsContent));

// ═══════════════════════════════════════════════════════════════
//  OWNER CONFIGURATION
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ OWNER CONFIGURATION\n');

test('OWNER_ID = 7109454163', () => /const OWNER_ID\s*=\s*7109454163/m.test(botJsContent));
test('OWNER_USERNAME = casperthe6ix', () => /const OWNER_USERNAME\s*=\s*["']casperthe6ix["']/m.test(botJsContent));
test('isOwner() checks target.id === OWNER_ID', () => /function isOwner.*\{[\s\S]*user\.id\s*===\s*OWNER_ID/m.test(botJsContent));

// ═══════════════════════════════════════════════════════════════
//  MUTE COMMANDS (10)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ MUTE COMMANDS (10)\n');

const EXPECTED_MUTE_COMMANDS = {
  shutup: 'Shut Your Stinkin Mouth',
  shush: 'Stop Yappin',
  ftg: 'Ferme Ta Gueule big',
  bec: 'Aie Bec!',
  stopbarking: 'Stop Barking Bitch',
  artdejapper: "Arrete d'aboyer ptit chiwawa",
  sybau: 'Shut Your Bitch Ahhh Up',
  goofy: "You're Gay, you can't talk faggot",
  keh: 'ferme ta jgole va shifter ptite sharmouta',
  vio: "t un enfant de viole, ta pas le droit de parler",
};

for (const [cmd, reply] of Object.entries(EXPECTED_MUTE_COMMANDS)) {
  // Escape special regex characters in reply
  const escapedReply = reply.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  test(`mute command '${cmd}' has correct reply`, () => {
    const regex = new RegExp(`${cmd}:\\s*["']${escapedReply}`, 'i');
    return regex.test(botJsContent);
  });
}

test('10 mute commands registered in MUTE_REPLIES', () => {
  // Verify each command exists in MUTE_REPLIES
  const cmds = ['shutup', 'shush', 'ftg', 'bec', 'stopbarking', 'artdejapper', 'sybau', 'goofy', 'keh', 'vio'];
  return cmds.every(cmd => new RegExp(`MUTE_REPLIES\\s*=\\s*\\{[\\s\\S]*?${cmd}:`).test(botJsContent));
});

// ═══════════════════════════════════════════════════════════════
//  UNMUTE COMMANDS (2)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ UNMUTE COMMANDS (2)\n');

const EXPECTED_UNMUTE_COMMANDS = {
  talk: 'You may talk but you better stay respectful',
  parle: 'Parle en restant respectueux',
};

for (const [cmd, reply] of Object.entries(EXPECTED_UNMUTE_COMMANDS)) {
  const escapedReply = reply.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  test(`unmute command '${cmd}' has correct reply`, () => {
    const regex = new RegExp(`${cmd}:\\s*["']${escapedReply}`, 'i');
    return regex.test(botJsContent);
  });
}

// ═══════════════════════════════════════════════════════════════
//  KICK COMMANDS (3)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ KICK COMMANDS (3)\n');

const EXPECTED_KICK_COMMANDS = {
  sort: 'Get Lost Bouzin Senti',
  getout: 'Get Lost Bouzin Senti',
  decawlis: 'Ta gueule pu la marde, va te brosser la yeule',
};

for (const [cmd, reply] of Object.entries(EXPECTED_KICK_COMMANDS)) {
  const escapedReply = reply.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  test(`kick command '${cmd}' has correct reply`, () => {
    const regex = new RegExp(`${cmd}:\\s*["']${escapedReply}`, 'i');
    return regex.test(botJsContent);
  });
}

// ═══════════════════════════════════════════════════════════════
//  BAN COMMANDS (3)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ BAN COMMANDS (3)\n');

const EXPECTED_BAN_COMMANDS = {
  vazintm: 'vazi niquer ta douce',
  bouge: 'vazi niquer ta douce',
  ciao: 'CIAO PER SEMPRE',
};

for (const [cmd, reply] of Object.entries(EXPECTED_BAN_COMMANDS)) {
  const escapedReply = reply.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  test(`ban command '${cmd}' has correct reply`, () => {
    const regex = new RegExp(`${cmd}:\\s*["']${escapedReply}`, 'i');
    return regex.test(botJsContent);
  });
}

// ═══════════════════════════════════════════════════════════════
//  PROMOTE COMMAND (1)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ PROMOTE COMMAND (1)\n');

test('levelup command has correct reply', () => 
  /levelup:\s*["']You are now Casper['']s VIP member, Protection Added/i.test(botJsContent));

// ═══════════════════════════════════════════════════════════════
//  DEMOTE COMMANDS (2)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ DEMOTE COMMANDS (2)\n');

test('assistoi command has correct reply', () => 
  /assistoi:\s*["']Assis toi, bon chien/i.test(botJsContent));

test('leveldown command has correct reply', () => 
  /leveldown:\s*["']You are no longer Casper['']s VIP member/i.test(botJsContent));

// ═══════════════════════════════════════════════════════════════
//  FUN COMMANDS
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ FUN COMMANDS\n');

test('pussy command in FUN_REPLIES', () => 
  /pussy:\s*["']you['']re a wet coochie, you don['']t have the balls/i.test(botJsContent));

test('shifta command in FUN_REPLIES', () => 
  /shifta:\s*["']va fr ton shift vielle p\*te expir/i.test(botJsContent));

test('ntm command in FUN_REPLIES', () => 
  /ntm:\s*["']Nik ta m/i.test(botJsContent));

test('gay command registered', () => /bot\.command\s*\(\s*["']gay["']/m.test(botJsContent));
test('lesbien command registered', () => /bot\.command\s*\(\s*["']lesbien["']/m.test(botJsContent));
test('fu command registered', () => /bot\.command\s*\(\s*["']fu["']/m.test(botJsContent));
test('mgd command registered', () => /bot\.command\s*\(\s*["']mgd["']/m.test(botJsContent));
test('cap command registered', () => /bot\.command\s*\(\s*["']cap["']/m.test(botJsContent));

// ═══════════════════════════════════════════════════════════════
//  OWNER MENTION COMMANDS (8)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ OWNER MENTION COMMANDS (8)\n');

const EXPECTED_OWNER_COMMANDS = ['papa', 'pere', 'boss', 'patron', 'chef', 'owner', 'roi', 'king'];

test('8 owner commands defined in OWNER_COMMANDS array', () => {
  const match = botJsContent.match(/const OWNER_COMMANDS\s*=\s*\[([^\]]+)\]/);
  if (!match) return false;
  const commands = match[1].match(/["'](\w+)["']/g)?.map(c => c.replace(/["']/g, ''));
  return commands?.length === 8 && EXPECTED_OWNER_COMMANDS.every(c => commands.includes(c));
});

// ═══════════════════════════════════════════════════════════════
//  OWNER PROTECTION (13 languages)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ OWNER PROTECTION (13 languages)\n');

const EXPECTED_LANGUAGES = ['en', 'fr', 'es', 'ar', 'de', 'pt', 'ru', 'tr', 'it', 'zh-cn', 'ja', 'ko', 'hi'];

test('MUTE_PROTECTION has 13 language entries', () => {
  const match = botJsContent.match(/const MUTE_PROTECTION\s*=\s*\{([^;]+)\};/s);
  if (!match) return false;
  const langMatches = match[1].match(/(en|fr|es|ar|de|pt|ru|tr|it|"zh-cn"|ja|ko|hi):/g);
  return langMatches?.length === 13;
});

test('KICK_FUN_PROTECTION has 13 language entries', () => {
  const match = botJsContent.match(/const KICK_FUN_PROTECTION\s*=\s*\{([^;]+)\};/s);
  if (!match) return false;
  const langMatches = match[1].match(/(en|fr|es|ar|de|pt|ru|tr|it|"zh-cn"|ja|ko|hi):/g);
  return langMatches?.length === 13;
});

// ═══════════════════════════════════════════════════════════════
//  MUTE DURATION TESTS
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ MUTE DURATION\n');

test('/vio uses 400 * 86400 seconds (permanent mute)', () => 
  /if\s*\(\s*cmd\s*===\s*["']vio["']\s*\)[\s\S]*?400\s*\*\s*86400/m.test(botJsContent));

test('default mute duration is 3600 seconds (1 hour)', () => 
  /untilDate\s*=\s*Math\.floor\(Date\.now\(\)\s*\/\s*1000\)\s*\+\s*3600/m.test(botJsContent));

test('parseDuration supports: m, h, d, w, mo, y', () => {
  // Check the map in parseDuration has all time units
  const match = botJsContent.match(/function parseDuration.*?const map\s*=\s*\{([^}]+)\}/s);
  if (!match) return false;
  return /\bm:/.test(match[1]) && /\bh:/.test(match[1]) && /\bd:/.test(match[1]) && 
         /\bw:/.test(match[1]) && /\bmo:/.test(match[1]) && /\by:/.test(match[1]);
});

// ═══════════════════════════════════════════════════════════════
//  PERMISSION OBJECTS
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ PERMISSION OBJECTS\n');

const EXPECTED_PERMISSIONS = [
  'can_send_messages',
  'can_send_audios',
  'can_send_documents',
  'can_send_photos',
  'can_send_videos',
  'can_send_video_notes',
  'can_send_voice_notes',
  'can_send_polls',
  'can_send_other_messages',
  'can_add_web_page_previews',
  'can_change_info',
  'can_invite_users',
  'can_pin_messages',
  'can_manage_topics',
];

test('FULL_MUTE has all 14 permission fields set to false', () => {
  const match = botJsContent.match(/const FULL_MUTE\s*=\s*\{([^}]+)\}/s);
  if (!match) return false;
  const hasAllFields = EXPECTED_PERMISSIONS.every(p => 
    new RegExp(`${p}:\\s*false`).test(match[1])
  );
  return hasAllFields;
});

test('FULL_UNMUTE has all 14 permission fields set to true', () => {
  const match = botJsContent.match(/const FULL_UNMUTE\s*=\s*\{([^}]+)\}/s);
  if (!match) return false;
  const hasAllFields = EXPECTED_PERMISSIONS.every(p => 
    new RegExp(`${p}:\\s*true`).test(match[1])
  );
  return hasAllFields;
});

// ═══════════════════════════════════════════════════════════════
//  LANGUAGE DETECTION
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ LANGUAGE DETECTION\n');

test('detectLanguage covers 13 languages via regex patterns', () => {
  const match = botJsContent.match(/function detectLanguage[\s\S]*?return "en";\s*\}/m);
  if (!match) return false;
  const detectionCode = match[0];
  // Check all language return statements
  return /return "ar"/.test(detectionCode) &&
         /return "zh-cn"/.test(detectionCode) &&
         /return "ja"/.test(detectionCode) &&
         /return "ko"/.test(detectionCode) &&
         /return "ru"/.test(detectionCode) &&
         /return "hi"/.test(detectionCode) &&
         /return "fr"/.test(detectionCode) &&
         /return "es"/.test(detectionCode) &&
         /return "de"/.test(detectionCode) &&
         /return "pt"/.test(detectionCode) &&
         /return "it"/.test(detectionCode) &&
         /return "tr"/.test(detectionCode) &&
         /return "en"/.test(detectionCode);
});

// ═══════════════════════════════════════════════════════════════
//  HELP HANDLER
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ HELP HANDLER\n');

test('/help sends DM in groups', () => 
  /if\s*\(\s*ctx\.chat\.type\s*!==\s*["']private["']\s*\)[\s\S]*?sendMessage\s*\(\s*ctx\.from\.id/m.test(botJsContent));

test('/help sends inline in private', () => 
  /else\s*\{[\s\S]*?return ctx\.reply\s*\(\s*helpText/m.test(botJsContent));

test('/help text contains MUTE COMMANDS', () => 
  /helpText[\s\S]*MUTE COMMANDS/m.test(botJsContent));

test('/help text contains UNMUTE COMMANDS', () => 
  /helpText[\s\S]*UNMUTE COMMANDS/m.test(botJsContent));

test('/help text contains KICK COMMANDS', () => 
  /helpText[\s\S]*KICK COMMANDS/m.test(botJsContent));

test('/help text contains BAN COMMANDS', () => 
  /helpText[\s\S]*BAN COMMANDS/m.test(botJsContent));

test('/help text contains ADMIN COMMANDS', () => 
  /helpText[\s\S]*ADMIN COMMANDS/m.test(botJsContent));

test('/help text contains FUN COMMANDS', () => 
  /helpText[\s\S]*FUN COMMANDS/m.test(botJsContent));

test('/help text contains OWNER COMMANDS', () => 
  /helpText[\s\S]*OWNER COMMANDS/m.test(botJsContent));

// ═══════════════════════════════════════════════════════════════
//  TRANSLATION REPLIES
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ TRANSLATION REPLIES\n');

test('GAY_REPLIES has translations (en, fr, es, ar, de, pt, ru, tr, it)', () => {
  // Match GAY_REPLIES block up until the next const
  const match = botJsContent.match(/const GAY_REPLIES\s*=\s*\{[\s\S]*?\n\};/);
  if (!match) return false;
  const block = match[0];
  return /\ben:/.test(block) && /\bfr:/.test(block) && /\bes:/.test(block) &&
         /\bar:/.test(block) && /\bde:/.test(block) && /\bpt:/.test(block) &&
         /\bru:/.test(block) && /\btr:/.test(block) && /\bit:/.test(block);
});

test('FU_REPLIES has translations (en, fr, es, ar, de, pt, ru, tr, it)', () => {
  const match = botJsContent.match(/const FU_REPLIES\s*=\s*\{[\s\S]*?\n\};/);
  if (!match) return false;
  const block = match[0];
  return /\ben:/.test(block) && /\bfr:/.test(block) && /\bes:/.test(block) &&
         /\bar:/.test(block) && /\bde:/.test(block) && /\bpt:/.test(block) &&
         /\bru:/.test(block) && /\btr:/.test(block) && /\bit:/.test(block);
});

test('MGD_REPLIES has translations (en, fr, es, ar, de, pt, ru, tr, it)', () => {
  const match = botJsContent.match(/const MGD_REPLIES\s*=\s*\{[\s\S]*?\n\};/);
  if (!match) return false;
  const block = match[0];
  return /\ben:/.test(block) && /\bfr:/.test(block) && /\bes:/.test(block) &&
         /\bar:/.test(block) && /\bde:/.test(block) && /\bpt:/.test(block) &&
         /\bru:/.test(block) && /\btr:/.test(block) && /\bit:/.test(block);
});

test('CAP_REPLIES has translations (en, fr)', () => {
  const match = botJsContent.match(/const CAP_REPLIES\s*=\s*\{[\s\S]*?\n\};/);
  if (!match) return false;
  const block = match[0];
  return /\ben:/.test(block) && /\bfr:/.test(block);
});

// ═══════════════════════════════════════════════════════════════
//  SET-WEBHOOK.JS VALIDATION
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ SET-WEBHOOK.JS VALIDATION\n');

const setWebhookPath = path.join(__dirname, '..', 'api', 'set-webhook.js');
const setWebhookContent = fs.readFileSync(setWebhookPath, 'utf-8');

test('set-webhook.js exports default handler', () => 
  /export default async function/m.test(setWebhookContent));

test('set-webhook.js calls Telegram setWebhook API', () => 
  /api\.telegram\.org\/bot.*\/setWebhook/m.test(setWebhookContent));

// ═══════════════════════════════════════════════════════════════
//  MONGODB OPTIONAL (GRACEFUL DEGRADATION)
// ═══════════════════════════════════════════════════════════════
console.log('\n▸ MONGODB OPTIONAL (GRACEFUL DEGRADATION)\n');

test('getDb returns null if MONGO_URL not set (no crash)', () => 
  /if\s*\(\s*!process\.env\.MONGO_URL\s*\)\s*return\s*null/m.test(botJsContent));

test('MongoDB errors are caught and logged', () => 
  /catch\s*\(\s*e\s*\)[\s\S]*?MongoDB connection failed/m.test(botJsContent));

// ═══════════════════════════════════════════════════════════════
//  RESULTS
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`  SUCCESS RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Output JSON results for CI/CD
const results = {
  passed,
  failed,
  total: passed + failed,
  success_rate: `${((passed / (passed + failed)) * 100).toFixed(1)}%`,
};

fs.writeFileSync(
  path.join(__dirname, '..', '..', 'test_reports', 'bot_validation_results.json'),
  JSON.stringify(results, null, 2)
);

process.exit(failed > 0 ? 1 : 0);
