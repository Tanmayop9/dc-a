require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');

const client = new Client();

// Configuration
const USER_TOKEN = process.env.USER_TOKEN;
const SOURCE_SERVER_ID = process.env.SOURCE_SERVER_ID;
const TARGET_SERVER_ID = process.env.TARGET_SERVER_ID;

// Storage for cloned data
const clonedChannels = new Map();
const clonedRoles = new Map();

// Utility function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Utility function to log with timestamp
const log = (message) => {
    console.log(`[${new Date().toISOString()}] ${message}`);
};

// Clone roles from source to target server
async function cloneRoles(sourceGuild, targetGuild) {
    log('Starting role cloning...');
    
    const sourceRoles = sourceGuild.roles.cache
        .sort((a, b) => a.position - b.position)
        .filter(role => role.name !== '@everyone');
    
    for (const [roleId, role] of sourceRoles) {
        try {
            const newRole = await targetGuild.roles.create({
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                permissions: role.permissions,
                mentionable: role.mentionable,
            });
            
            clonedRoles.set(roleId, newRole.id);
            log(`Cloned role: ${role.name}`);
            await delay(1000); // Rate limit protection
        } catch (error) {
            log(`Error cloning role ${role.name}: ${error.message}`);
        }
    }
    
    log('Role cloning completed!');
}

// Clone channels and categories
async function cloneChannels(sourceGuild, targetGuild) {
    log('Starting channel cloning...');
    
    // First, clone categories
    const categories = sourceGuild.channels.cache
        .filter(ch => ch.type === 'GUILD_CATEGORY')
        .sort((a, b) => a.position - b.position);
    
    for (const [categoryId, category] of categories) {
        try {
            const newCategory = await targetGuild.channels.create(category.name, {
                type: 'GUILD_CATEGORY',
                position: category.position,
            });
            
            clonedChannels.set(categoryId, newCategory.id);
            log(`Cloned category: ${category.name}`);
            await delay(1000);
        } catch (error) {
            log(`Error cloning category ${category.name}: ${error.message}`);
        }
    }
    
    // Then, clone text channels
    const textChannels = sourceGuild.channels.cache
        .filter(ch => ch.type === 'GUILD_TEXT')
        .sort((a, b) => a.position - b.position);
    
    for (const [channelId, channel] of textChannels) {
        try {
            const options = {
                type: 'GUILD_TEXT',
                topic: channel.topic,
                nsfw: channel.nsfw,
                position: channel.position,
                rateLimitPerUser: channel.rateLimitPerUser,
            };
            
            if (channel.parent) {
                const newParentId = clonedChannels.get(channel.parent.id);
                if (newParentId) {
                    options.parent = newParentId;
                }
            }
            
            const newChannel = await targetGuild.channels.create(channel.name, options);
            clonedChannels.set(channelId, newChannel.id);
            log(`Cloned text channel: ${channel.name}`);
            await delay(1000);
        } catch (error) {
            log(`Error cloning text channel ${channel.name}: ${error.message}`);
        }
    }
    
    // Clone voice channels
    const voiceChannels = sourceGuild.channels.cache
        .filter(ch => ch.type === 'GUILD_VOICE')
        .sort((a, b) => a.position - b.position);
    
    for (const [channelId, channel] of voiceChannels) {
        try {
            const options = {
                type: 'GUILD_VOICE',
                bitrate: channel.bitrate,
                userLimit: channel.userLimit,
                position: channel.position,
            };
            
            if (channel.parent) {
                const newParentId = clonedChannels.get(channel.parent.id);
                if (newParentId) {
                    options.parent = newParentId;
                }
            }
            
            const newChannel = await targetGuild.channels.create(channel.name, options);
            clonedChannels.set(channelId, newChannel.id);
            log(`Cloned voice channel: ${channel.name}`);
            await delay(1000);
        } catch (error) {
            log(`Error cloning voice channel ${channel.name}: ${error.message}`);
        }
    }
    
    log('Channel cloning completed!');
}

// Clone messages from a channel using webhooks
async function cloneMessages(sourceChannel, targetChannel, limit = 100) {
    try {
        log(`Starting message cloning for channel: ${sourceChannel.name}`);
        
        // Create webhook in target channel
        const webhook = await targetChannel.createWebhook('Clone Bot', {
            reason: 'Message cloning',
        });
        
        // Fetch messages
        let messages = await sourceChannel.messages.fetch({ limit });
        messages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        
        for (const [messageId, message] of messages) {
            try {
                const webhookOptions = {
                    username: message.author.username,
                    avatarURL: message.author.displayAvatarURL(),
                };
                
                // Handle regular content
                if (message.content) {
                    webhookOptions.content = message.content;
                }
                
                // Handle embeds
                if (message.embeds.length > 0) {
                    webhookOptions.embeds = message.embeds.map(embed => embed.toJSON());
                }
                
                // Handle attachments
                if (message.attachments.size > 0) {
                    webhookOptions.files = message.attachments.map(attachment => ({
                        attachment: attachment.url,
                        name: attachment.name,
                    }));
                }
                
                // Send message via webhook
                if (webhookOptions.content || webhookOptions.embeds || webhookOptions.files) {
                    await webhook.send(webhookOptions);
                    await delay(1000); // Rate limit protection
                }
            } catch (error) {
                log(`Error cloning message ${messageId}: ${error.message}`);
            }
        }
        
        // Clean up webhook
        await webhook.delete();
        log(`Message cloning completed for channel: ${sourceChannel.name}`);
    } catch (error) {
        log(`Error in cloneMessages: ${error.message}`);
    }
}

// Clone all messages from all text channels
async function cloneAllMessages(sourceGuild, targetGuild) {
    log('Starting message cloning for all channels...');
    
    const sourceTextChannels = sourceGuild.channels.cache.filter(ch => ch.type === 'GUILD_TEXT');
    
    for (const [channelId, sourceChannel] of sourceTextChannels) {
        const targetChannelId = clonedChannels.get(channelId);
        if (targetChannelId) {
            const targetChannel = targetGuild.channels.cache.get(targetChannelId);
            if (targetChannel) {
                await cloneMessages(sourceChannel, targetChannel);
            }
        }
    }
    
    log('All message cloning completed!');
}

// Main cloning function
async function cloneServer() {
    try {
        log('Starting server cloning process...');
        
        // Validate configuration
        if (!USER_TOKEN || !SOURCE_SERVER_ID || !TARGET_SERVER_ID) {
            throw new Error('Missing required configuration. Please check your .env file.');
        }
        
        // Get guilds
        const sourceGuild = client.guilds.cache.get(SOURCE_SERVER_ID);
        const targetGuild = client.guilds.cache.get(TARGET_SERVER_ID);
        
        if (!sourceGuild) {
            throw new Error(`Source server not found. ID: ${SOURCE_SERVER_ID}`);
        }
        
        if (!targetGuild) {
            throw new Error(`Target server not found. ID: ${TARGET_SERVER_ID}`);
        }
        
        log(`Source server: ${sourceGuild.name}`);
        log(`Target server: ${targetGuild.name}`);
        
        // Step 1: Clone roles
        await cloneRoles(sourceGuild, targetGuild);
        
        // Step 2: Clone channels and categories
        await cloneChannels(sourceGuild, targetGuild);
        
        // Step 3: Clone messages
        await cloneAllMessages(sourceGuild, targetGuild);
        
        log('Server cloning completed successfully!');
        
    } catch (error) {
        log(`Error in cloneServer: ${error.message}`);
        console.error(error);
    }
}

// Bot ready event
client.on('ready', async () => {
    log(`Logged in as ${client.user.tag}`);
    log(`Bot is ready in ${client.guilds.cache.size} servers`);
    
    // Start cloning process
    await cloneServer();
    
    // Exit after completion
    process.exit(0);
});

// Error handling
client.on('error', (error) => {
    log(`Client error: ${error.message}`);
    console.error(error);
});

// Login
log('Logging in...');
client.login(USER_TOKEN).catch(error => {
    log(`Login failed: ${error.message}`);
    console.error(error);
    process.exit(1);
});
