const { Client } = require('discord.js-selfbot-v13');
const readline = require('readline');

// ─── ANSI colour helpers ────────────────────────────────────────────────────
const c = {
    reset: '\x1b[0m',
    bold:  '\x1b[1m',
    dim:   '\x1b[2m',
    cyan:  '\x1b[36m',
    green: '\x1b[32m',
    yellow:'\x1b[33m',
    red:   '\x1b[31m',
    blue:  '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
};
const paint = (color, text) => `${color}${text}${c.reset}`;

// ─── Logger ─────────────────────────────────────────────────────────────────
const stats = { roles: 0, categories: 0, textChannels: 0, voiceChannels: 0, messages: 0, errors: 0 };

const log = {
    info:    (msg) => console.log(`${paint(c.cyan,   '[INFO]')}  ${msg}`),
    success: (msg) => console.log(`${paint(c.green,  '[OK]')}    ${msg}`),
    warn:    (msg) => console.log(`${paint(c.yellow, '[WARN]')}  ${msg}`),
    error:   (msg) => { stats.errors++; console.log(`${paint(c.red, '[ERR]')}   ${msg}`); },
    step:    (msg) => console.log(`\n${paint(c.bold + c.blue, '━━ ' + msg + ' ━━')}`),
    dim:     (msg) => console.log(`${paint(c.dim, msg)}`),
};

// ─── Utility ─────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Run tasks with limited concurrency */
async function pLimit(tasks, concurrency) {
    const results = [];
    let i = 0;
    async function worker() {
        while (i < tasks.length) {
            const idx = i++;
            results[idx] = await tasks[idx]();
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
    return results;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function progressBar(done, total, width = 30) {
    const pct = total === 0 ? 1 : done / total;
    const filled = Math.round(pct * width);
    const bar = paint(c.green, '█'.repeat(filled)) + paint(c.dim, '░'.repeat(width - filled));
    return `[${bar}] ${done}/${total}`;
}

// ─── Readline helpers ─────────────────────────────────────────────────────────
function createRl() {
    return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question, defaultValue = '') {
    const hint = defaultValue ? paint(c.dim, ` [${defaultValue}]`) : '';
    return new Promise(resolve => {
        rl.question(`${paint(c.cyan, '?')} ${question}${hint}: `, (answer) => {
            resolve(answer.trim() || defaultValue);
        });
    });
}

function askYN(rl, question, defaultYes = true) {
    const hint = defaultYes ? 'Y/n' : 'y/N';
    return new Promise(resolve => {
        rl.question(`${paint(c.cyan, '?')} ${question} ${paint(c.dim, `(${hint})`)} `, (answer) => {
            const a = answer.trim().toLowerCase();
            resolve(a === '' ? defaultYes : a === 'y' || a === 'yes');
        });
    });
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const clonedChannels = new Map();
const clonedRoles    = new Map();

// ─── Core clone functions ─────────────────────────────────────────────────────

async function cloneRoles(sourceGuild, targetGuild, rateMs) {
    log.step('Cloning Roles');
    const sourceRoles = [...sourceGuild.roles.cache.values()]
        .filter(r => r.name !== '@everyone')
        .sort((a, b) => a.position - b.position);

    let done = 0;
    process.stdout.write(`  ${progressBar(done, sourceRoles.length)}\r`);

    for (const role of sourceRoles) {
        try {
            const newRole = await targetGuild.roles.create({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions,
                mentionable: role.mentionable,
            });
            clonedRoles.set(role.id, newRole.id);
            stats.roles++;
            log.success(`Role: ${paint(c.magenta, role.name)}`);
            await delay(rateMs);
        } catch (err) {
            log.error(`Role "${role.name}": ${err.message}`);
        }
        done++;
        process.stdout.write(`  ${progressBar(done, sourceRoles.length)}\r`);
    }
    console.log();
    log.info(`Roles done — ${stats.roles} cloned, ${stats.errors} errors`);
}

async function cloneChannels(sourceGuild, targetGuild, skipIds, rateMs) {
    log.step('Cloning Categories & Channels');

    // Categories first
    const categories = [...sourceGuild.channels.cache.values()]
        .filter(ch => ch.type === 'GUILD_CATEGORY' && !skipIds.has(ch.id))
        .sort((a, b) => a.position - b.position);

    for (const cat of categories) {
        try {
            const newCat = await targetGuild.channels.create(cat.name, {
                type: 'GUILD_CATEGORY',
                position: cat.position,
            });
            clonedChannels.set(cat.id, newCat.id);
            stats.categories++;
            log.success(`Category: ${paint(c.yellow, cat.name)}`);
            await delay(rateMs);
        } catch (err) {
            log.error(`Category "${cat.name}": ${err.message}`);
        }
    }

    // Text channels
    const textChannels = [...sourceGuild.channels.cache.values()]
        .filter(ch => ch.type === 'GUILD_TEXT' && !skipIds.has(ch.id))
        .sort((a, b) => a.position - b.position);

    for (const ch of textChannels) {
        try {
            const opts = {
                type: 'GUILD_TEXT',
                topic: ch.topic,
                nsfw: ch.nsfw,
                position: ch.position,
                rateLimitPerUser: ch.rateLimitPerUser,
            };
            if (ch.parent) {
                const parentId = clonedChannels.get(ch.parent.id);
                if (parentId) opts.parent = parentId;
            }
            const newCh = await targetGuild.channels.create(ch.name, opts);
            clonedChannels.set(ch.id, newCh.id);
            stats.textChannels++;
            log.success(`Text: #${paint(c.cyan, ch.name)}`);
            await delay(rateMs);
        } catch (err) {
            log.error(`Text channel "${ch.name}": ${err.message}`);
        }
    }

    // Voice channels
    const voiceChannels = [...sourceGuild.channels.cache.values()]
        .filter(ch => ch.type === 'GUILD_VOICE' && !skipIds.has(ch.id))
        .sort((a, b) => a.position - b.position);

    for (const ch of voiceChannels) {
        try {
            const opts = {
                type: 'GUILD_VOICE',
                bitrate: ch.bitrate,
                userLimit: ch.userLimit,
                position: ch.position,
            };
            if (ch.parent) {
                const parentId = clonedChannels.get(ch.parent.id);
                if (parentId) opts.parent = parentId;
            }
            const newCh = await targetGuild.channels.create(ch.name, opts);
            clonedChannels.set(ch.id, newCh.id);
            stats.voiceChannels++;
            log.success(`Voice: 🔊 ${paint(c.cyan, ch.name)}`);
            await delay(rateMs);
        } catch (err) {
            log.error(`Voice channel "${ch.name}": ${err.message}`);
        }
    }

    log.info(`Channels done — ${stats.categories} categories, ${stats.textChannels} text, ${stats.voiceChannels} voice`);
}

async function cloneMessages(sourceChannel, targetChannel, limit, rateMs, webhookName) {
    try {
        const webhook = await targetChannel.createWebhook(webhookName, { reason: 'Message cloning' });
        let messages = await sourceChannel.messages.fetch({ limit });
        messages = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let done = 0;
        for (const msg of messages) {
            try {
                const opts = {
                    username: msg.author.username,
                };
                if (msg.content)            opts.content = msg.content;
                if (msg.embeds.length > 0)  opts.embeds  = msg.embeds.map(e => e.toJSON());
                if (msg.attachments.size > 0) {
                    opts.files = [...msg.attachments.values()].map(a => ({ attachment: a.url, name: a.name }));
                }
                if (opts.content || opts.embeds || opts.files) {
                    await webhook.send(opts);
                    stats.messages++;
                    await delay(rateMs);
                }
            } catch (err) {
                log.error(`Message in #${sourceChannel.name}: ${err.message}`);
            }
            done++;
            process.stdout.write(`  #${sourceChannel.name} ${progressBar(done, messages.length)}\r`);
        }
        console.log();
        await webhook.delete();
    } catch (err) {
        log.error(`cloneMessages #${sourceChannel.name}: ${err.message}`);
    }
}

async function cloneAllMessages(sourceGuild, targetGuild, skipIds, limit, concurrency, rateMs, webhookName) {
    log.step('Cloning Messages');
    const pairs = [];
    for (const [srcId, tgtId] of clonedChannels) {
        const src = sourceGuild.channels.cache.get(srcId);
        const tgt = targetGuild.channels.cache.get(tgtId);
        if (src && tgt && src.type === 'GUILD_TEXT' && !skipIds.has(srcId)) {
            pairs.push({ src, tgt });
        }
    }
    log.info(`Cloning messages from ${pairs.length} channels (concurrency: ${concurrency}, limit: ${limit})`);
    const tasks = pairs.map(({ src, tgt }) => () => cloneMessages(src, tgt, limit, rateMs, webhookName));
    await pLimit(tasks, concurrency);
    log.info(`Messages done — ${stats.messages} sent`);
}

// ─── Wipe target server ───────────────────────────────────────────────────────

async function deleteTargetChannels(targetGuild, rateMs) {
    log.step('Wiping Channels from Target Server');
    const channels = [...targetGuild.channels.cache.values()];
    let done = 0;
    process.stdout.write(`  ${progressBar(done, channels.length)}\r`);
    for (const ch of channels) {
        try {
            await ch.delete('Wiped before clone');
            log.warn(`Deleted channel: ${ch.name}`);
            await delay(rateMs);
        } catch (err) {
            log.error(`Delete channel "${ch.name}": ${err.message}`);
        }
        done++;
        process.stdout.write(`  ${progressBar(done, channels.length)}\r`);
    }
    console.log();
    log.info(`Channel wipe done — ${done} processed`);
}

async function deleteTargetRoles(targetGuild, rateMs) {
    log.step('Wiping Roles from Target Server');
    const roles = [...targetGuild.roles.cache.values()]
        .filter(r => r.name !== '@everyone' && !r.managed)
        .sort((a, b) => b.position - a.position); // highest first
    let done = 0;
    process.stdout.write(`  ${progressBar(done, roles.length)}\r`);
    for (const role of roles) {
        try {
            await role.delete('Wiped before clone');
            log.warn(`Deleted role: ${role.name}`);
            await delay(rateMs);
        } catch (err) {
            log.error(`Delete role "${role.name}": ${err.message}`);
        }
        done++;
        process.stdout.write(`  ${progressBar(done, roles.length)}\r`);
    }
    console.log();
    log.info(`Role wipe done — ${done} processed`);
}

// ─── Interactive configuration ────────────────────────────────────────────────
async function promptConfig() {
    const rl = createRl();

    console.clear();
    console.log(paint(c.bold + c.magenta,
        '╔══════════════════════════════════════════════╗\n' +
        '║    Discord Server Cloner  ⚡  Ultra Edition  ║\n' +
        '╚══════════════════════════════════════════════╝'
    ));
    console.log();

    const token    = await ask(rl, 'User token');
    const sourceId = await ask(rl, 'Source server ID');
    const targetId = await ask(rl, 'Target server ID');

    // Skip channel IDs
    const skipRaw = await ask(rl, 'Skip channel IDs (comma-separated, or leave blank)');
    const skipIds = new Set(skipRaw.split(',').map(s => s.trim()).filter(Boolean));

    // Wipe target first?
    console.log(paint(c.bold + c.red, '\n  ⚠  Target server wipe'));
    const doWipeChannels = await askYN(rl, '  Delete ALL channels from target server first?', false);
    const doWipeRoles    = await askYN(rl, '  Delete ALL roles from target server first?',    false);

    // What to clone
    console.log(paint(c.bold, '\n  What to clone?'));
    const doRoles    = await askYN(rl, '  Clone roles?',    true);
    const doChannels = await askYN(rl, '  Clone channels?', true);
    const doMessages = await askYN(rl, '  Clone messages?', true);

    // Performance options
    console.log(paint(c.bold, '\n  Performance options'));
    const webhookName = await ask(rl, '  Webhook name for message cloning', 'CloneBot');
    const msgLimit    = parseInt(await ask(rl, '  Messages per channel (default 100)'),             10) || 100;
    const rateMs      = parseInt(await ask(rl, '  Delay between requests ms (default 600)'),        10) || 600;
    const concurrency = parseInt(await ask(rl, '  Concurrent message channels (default 3)'),        10) || 3;

    rl.close();

    if (!token || !sourceId || !targetId) {
        console.error(paint(c.red, '\n[ERR] Token, source ID and target ID are required.\n'));
        process.exit(1);
    }

    console.log();
    log.info(`Skip list: ${skipIds.size > 0 ? [...skipIds].join(', ') : paint(c.dim, '(none)')}`);
    log.info(`Delay: ${rateMs}ms  |  Msg limit: ${msgLimit}  |  Concurrency: ${concurrency}`);

    return { token, sourceId, targetId, skipIds, doWipeChannels, doWipeRoles,
             doRoles, doChannels, doMessages, webhookName, msgLimit, rateMs, concurrency };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const cfg = await promptConfig();

    const client = new Client();

    client.on('error', (err) => log.error(`Client: ${err.message}`));

    client.once('ready', async () => {
        log.success(`Logged in as ${paint(c.bold, client.user.tag)}`);
        log.info(`Visible in ${client.guilds.cache.size} servers`);

        const sourceGuild = client.guilds.cache.get(cfg.sourceId);
        const targetGuild = client.guilds.cache.get(cfg.targetId);

        if (!sourceGuild) { log.error(`Source server not found: ${cfg.sourceId}`); process.exit(1); }
        if (!targetGuild) { log.error(`Target server not found: ${cfg.targetId}`); process.exit(1); }

        log.info(`Source: ${paint(c.bold, sourceGuild.name)}`);
        log.info(`Target: ${paint(c.bold, targetGuild.name)}`);

        const startTime = Date.now();

        try {
            if (cfg.doWipeChannels) await deleteTargetChannels(targetGuild, cfg.rateMs);
            if (cfg.doWipeRoles)    await deleteTargetRoles(targetGuild, cfg.rateMs);
            if (cfg.doRoles)        await cloneRoles(sourceGuild, targetGuild, cfg.rateMs);
            if (cfg.doChannels)     await cloneChannels(sourceGuild, targetGuild, cfg.skipIds, cfg.rateMs);
            if (cfg.doMessages)     await cloneAllMessages(sourceGuild, targetGuild, cfg.skipIds, cfg.msgLimit, cfg.concurrency, cfg.rateMs, cfg.webhookName);
        } catch (err) {
            log.error(`Fatal: ${err.message}`);
            console.error(err);
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n' + paint(c.bold + c.green,
            '╔══════════════════════════ SUMMARY ═══════════════════════════╗'
        ));
        console.log(paint(c.green, `  ✅ Roles        : ${stats.roles}`));
        console.log(paint(c.green, `  ✅ Categories   : ${stats.categories}`));
        console.log(paint(c.green, `  ✅ Text channels: ${stats.textChannels}`));
        console.log(paint(c.green, `  ✅ Voice channels: ${stats.voiceChannels}`));
        console.log(paint(c.green, `  ✅ Messages     : ${stats.messages}`));
        console.log(paint(stats.errors > 0 ? c.yellow : c.green,
            `  ${stats.errors > 0 ? '⚠️' : '✅'} Errors       : ${stats.errors}`));
        console.log(paint(c.cyan,  `  ⏱  Elapsed     : ${elapsed}s`));
        console.log(paint(c.bold + c.green,
            '╚══════════════════════════════════════════════════════════════╝\n'
        ));

        process.exit(0);
    });

    log.info('Connecting to Discord…');
    client.login(cfg.token).catch(err => {
        log.error(`Login failed: ${err.message}`);
        process.exit(1);
    });
}

main();
