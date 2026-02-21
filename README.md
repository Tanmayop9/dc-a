# Discord Server Cloner ⚡ Ultra Edition

An advanced, interactive console tool that clones everything from a Discord server — roles, channels, categories, messages, embeds, and attachments — with a **Skip Channels** feature, parallel message processing, and a live progress display.

## Features

- ✅ **Interactive CLI** — prompts for every option at startup; no `.env` required
- ✅ **Wipe target server** — optionally delete all existing channels and/or roles before cloning
- ✅ **Skip Channels** — specify channel IDs to exclude from cloning (categories, text, voice)
- ✅ **Selective cloning** — choose to clone roles, channels, messages independently
- ✅ **Parallel message cloning** — configurable concurrency for faster throughput
- ✅ **Live progress bars** — visual feedback per channel during message cloning
- ✅ **Summary report** — final count of every cloned resource plus elapsed time
- ✅ Clone server roles with permissions, colors, and settings
- ✅ Clone categories and their structure
- ✅ Clone text channels with topics and settings
- ✅ Clone voice channels with bitrate and user limits
- ✅ Clone messages with proper author attribution (via webhooks)
- ✅ Clone embeds and images/attachments
- ✅ Tunable rate-limit delay to avoid API restrictions

## Prerequisites

- Node.js v20.18.0 or higher
- A Discord user account (not a bot account)
- Access to both source and target servers
- Administrator permissions in the target server (recommended)

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

> **No `.env` file needed** — every option is entered interactively when you run the tool.

## Usage

```bash
npm start
```

The tool launches an **interactive console wizard** that asks:

| Prompt | Description |
|---|---|
| User token | Your Discord user token |
| Source server ID | The server to clone **from** |
| Target server ID | The server to clone **into** |
| **Skip channel IDs** | Comma-separated IDs of channels to **skip** |
| **Delete ALL channels from target?** | Wipes every channel from the target server first (y/N) |
| **Delete ALL roles from target?** | Wipes every non-managed role from the target server first (y/N) |
| Clone roles? | Y/n |
| Clone channels? | Y/n |
| Clone messages? | Y/n |
| Messages per channel | How many messages to clone (default 100) |
| Delay between requests (ms) | Rate-limit buffer (default 600 ms) |
| Concurrent message channels | Parallel channels during message cloning (default 3) |

All prompts show the current `.env` / environment value as a default — just press **Enter** to accept it.

### Skip Channels example

When prompted for *"Skip channel IDs"*, paste a comma-separated list:

```
123456789012345678, 987654321098765432
```

Those channels will be silently skipped during cloning.

### Wipe target server

When prompted *"Delete ALL channels / roles from target server first?"*, answering **y** will:
- Delete every channel (text, voice, category) in the target server
- Delete every non-managed role in the target server

This gives you a clean slate before cloning.

## How It Works

1. **Target wipe (optional)** — deletes all existing channels and/or roles from the target server to give a clean slate
2. **Role Cloning** — creates roles in the target server with matching names, colours, permissions, and settings
3. **Channel Cloning** — creates categories first, then text and voice channels preserving the hierarchy; skipped IDs are ignored
4. **Message Cloning** — uses webhooks to send messages, preserving the original author's username and avatar; channels run in parallel up to the configured concurrency
5. **Embed & Attachment handling** — copies embeds and re-uploads attachments via webhooks

## Configuration Reference

All options are entered interactively at startup — no `.env` file needed.

| Option | Default | Description |
|---|---|---|
| User token | *(required)* | Discord user token |
| Source server ID | *(required)* | ID of the server to clone from |
| Target server ID | *(required)* | ID of the server to clone into |
| Skip channel IDs | *(empty)* | Comma-separated channel IDs to skip |
| Delete ALL channels? | `N` | Wipe all channels from target before cloning |
| Delete ALL roles? | `N` | Wipe all non-managed roles from target before cloning |
| Messages per channel | `100` | Max messages to clone per channel |
| Delay between requests (ms) | `600` | Milliseconds between API calls |
| Concurrent channels | `3` | Parallel channels for message cloning |

## Limitations

- Message history is capped at the Discord API limit of 100 per fetch (increase `MSG_LIMIT` for deeper history, but it still fetches at most 100 at a time)
- Rate limits apply — increase `RATE_MS` for very large servers if you hit 429 errors
- Some Discord features are not cloned: server boosts, custom emojis, stickers, threads
- User tokens violate Discord's Terms of Service — use at your own risk

## Security Notice

⚠️ **IMPORTANT SECURITY WARNINGS:**

1. **Never share your user token** — it provides full access to your Discord account
2. **Using selfbots violates Discord's Terms of Service** — your account may be banned
3. **This tool is for educational purposes only**
4. **Keep your `.env` file private** — it is already listed in `.gitignore`

## Troubleshooting

### "Token, source ID and target ID are required"
- Either enter them at the prompt or set them in your `.env` file

### "Source / Target server not found"
- Verify the server ID is correct and that you are a member of that server

### Rate limit / 429 errors
- Increase the delay: enter a higher value (e.g. `1500`) when prompted for *"Delay between requests"*

## License

ISC

## Disclaimer

This tool is provided for educational purposes only. The use of selfbots and user tokens violates Discord's Terms of Service. Use at your own risk. The authors are not responsible for any consequences of using this tool, including but not limited to account termination.
