# Discord Server Cloning Tool

A powerful tool that clones everything from a Discord server including roles, channels, categories, messages, embeds, and attachments. Uses webhooks to send messages and discord.js-selfbot-v13 for authentication.

## Features

- ✅ Clone server roles with permissions, colors, and settings
- ✅ Clone categories and their structure
- ✅ Clone text channels with topics and settings
- ✅ Clone voice channels with bitrate and user limits
- ✅ Clone messages with proper author attribution
- ✅ Clone embeds from messages
- ✅ Clone images and attachments
- ✅ Use webhooks for message sending (maintains original usernames and avatars)
- ✅ Rate limit protection to avoid API restrictions

## Prerequisites

- Node.js v16.9.0 or higher
- A Discord user account (not a bot account)
- Access to both source and target servers
- Proper permissions in the target server (Administrator recommended)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/Tanmayop9/dc-a.git
cd dc-a
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Edit the `.env` file and add your configuration:
```env
USER_TOKEN=your_user_token_here
SOURCE_SERVER_ID=source_server_id_here
TARGET_SERVER_ID=target_server_id_here
```

## Configuration

### Getting Your User Token

**⚠️ WARNING:** Using user tokens violates Discord's Terms of Service. Use this tool at your own risk. Your account may be banned.

1. Open Discord in your browser
2. Press F12 to open Developer Tools
3. Go to the "Network" tab
4. Type `/api` in the filter box
5. Refresh the page (F5)
6. Look for any request and check the "Authorization" header
7. Copy the token value

### Getting Server IDs

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on a server icon
3. Click "Copy ID"

## Usage

Run the cloning tool:
```bash
npm start
```

The tool will:
1. Log in with your user token
2. Clone all roles from the source server
3. Clone all categories and channels
4. Clone messages from all text channels (up to 100 messages per channel by default)
5. Exit when complete

## How It Works

1. **Role Cloning**: Creates roles in the target server with the same names, colors, permissions, and settings
2. **Channel Cloning**: Creates categories first, then text and voice channels maintaining the hierarchy
3. **Message Cloning**: Uses webhooks to send messages, preserving the original author's username and avatar
4. **Embed & Attachment Handling**: Copies embeds and downloads/re-uploads attachments through webhooks

## Limitations

- Message history is limited to 100 messages per channel by default (can be modified in code)
- Rate limits apply - the tool includes delays to avoid hitting them
- Some Discord features may not be fully cloned (e.g., server boosts, custom emojis)
- User tokens are against Discord ToS - use at your own risk

## Customization

You can modify the message limit in `index.js`:

```javascript
// In the cloneAllMessages function, change the limit parameter
await cloneMessages(sourceChannel, targetChannel, 500); // Clone 500 messages instead of 100
```

## Security Notice

⚠️ **IMPORTANT SECURITY WARNINGS:**

1. **Never share your user token** - It provides full access to your Discord account
2. **Using selfbots violates Discord's Terms of Service** - Your account may be banned
3. **This tool is for educational purposes only**
4. **Always keep your `.env` file private** - Add it to `.gitignore`

## Troubleshooting

### Error: "Missing required configuration"
- Make sure your `.env` file exists and contains all required values

### Error: "Source server not found"
- Verify the SOURCE_SERVER_ID is correct
- Ensure you're a member of the source server

### Error: "Target server not found"
- Verify the TARGET_SERVER_ID is correct
- Ensure you're a member of the target server

### Rate limit errors
- The tool includes delays, but you may need to increase them for very large servers
- Modify the `delay(1000)` calls to use larger values (e.g., `delay(2000)`)

## License

ISC

## Disclaimer

This tool is provided for educational purposes only. The use of selfbots and user tokens violates Discord's Terms of Service. Use at your own risk. The authors are not responsible for any consequences of using this tool, including but not limited to account termination.
