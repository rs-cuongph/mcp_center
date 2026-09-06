# chatops-mcp

MCP server for **ChatOps** — an internal messaging platform (Mattermost-based). Read teams, channels, and messages; search posts; send messages and upload file attachments — all through the Model Context Protocol.

Authentication uses **SSO session cookies** captured via Playwright — no Personal Access Token required.

## Features

- 🔐 **SSO Authentication** — login once via browser; session persisted to disk
- 🔍 **Read teams & channels** — list, search, get details
- 💬 **Read & search posts** — channel posts, threads, pinned posts, full-text search
- 🧠 **Smart Search** — single-call composite search with human-readable params (no IDs needed)
- ✉️ **Send messages** — post to channels or reply to threads
- 📎 **File attachments** — upload files, search files, get file info
- 🔗 **Link discovery** — find posts containing shared URLs
- 😀 **Reactions & Emoji** — add reactions, browse custom emoji
- 👤 **User lookup** — search users by name/email, get user details

## Quick Start (End Users)

> No cloning or building required. Use `npx` directly.

### Step 1 — Install Playwright Chromium

Required once for the SSO browser login flow:

```bash
npx -y playwright install chromium
```

### Step 2 — Authenticate with ChatOps

You must provide your ChatOps URL when logging in. Replace the URL with your actual instance:

```bash
CHATOPS_URL=https://chatops.yourcompany.com npx -y -p @cuongph.dev/chatops-mcp@latest chatops-auth-login
```

A browser window will open. Complete your SSO login manually. The session is saved locally to `.chatops/session.json` (or `~/.chatops/chatops-mcp/session.json` for global npx usage).

Verify the session is active:

```bash
CHATOPS_URL=https://chatops.yourcompany.com npx -y -p @cuongph.dev/chatops-mcp@latest chatops-auth-check
```

### Step 3 — Add to your MCP client

No separate server process needed — the MCP client spawns and manages the process automatically via stdio.

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chatops": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/chatops-mcp"],
      "env": {
        "CHATOPS_URL": "https://chatops.yourcompany.com"
      }
    }
  }
}
```

#### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "chatops": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/chatops-mcp"],
      "env": {
        "CHATOPS_URL": "https://chatops.yourcompany.com"
      }
    }
  }
}
```

#### Gemini CLI

```bash
gemini mcp add chatops npx -y @cuongph.dev/chatops-mcp --env CHATOPS_URL=https://chatops.yourcompany.com
```

Or edit `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "chatops": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/chatops-mcp"],
      "env": {
        "CHATOPS_URL": "https://chatops.yourcompany.com"
      }
    }
  }
}
```

> **Tip:** You can omit the `env` block and place `CHATOPS_URL=https://chatops.yourcompany.com` in a `.env` file at your working directory instead. `dotenv` is loaded automatically at startup.

Restart your MCP client after saving the config.

### Session Management

| Command | Description |
|---------|-------------|
| `npx @cuongph.dev/chatops-mcp chatops-auth-login` | Launch SSO browser flow and save session |
| `npx @cuongph.dev/chatops-mcp chatops-auth-check` | Validate whether the stored session is alive |
| `npx @cuongph.dev/chatops-mcp chatops-auth-clear` | Remove the stored session file |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CHATOPS_URL` | ✅ | Base URL of your ChatOps instance (no trailing slash) |
| `CHATOPS_SESSION_FILE` | ❌ | Path to session file (auto-resolved by bootstrap) |
| `CHATOPS_VALIDATE_PATH` | ❌ | API path to validate session (default: `/api/v4/users/me`) |
| `PLAYWRIGHT_HEADLESS` | ❌ | `true\|false` — headless browser for login (default: `false`) |
| `PLAYWRIGHT_BROWSER` | ❌ | `chromium\|firefox\|webkit` (default: `chromium`) |
| `LOG_LEVEL` | ❌ | `debug\|info\|warn\|error` (default: `info`) |

## Available Tools (24)

### 🧠 Smart Search (Composite)

| Tool | Description |
|------|-------------|
| `chatops_smart_search` | **All-in-one search** — resolves team/channel/user by name, then searches posts. Accepts `teamName`, `channelName`, `userName`, `dateFrom`, `dateTo`, `keywords`. No IDs needed. |

> **Recommended**: Use `chatops_smart_search` as the default search tool when the user provides names instead of IDs. It replaces the 4-call workflow of list_teams → search_users → search_channels → search_posts.

### 👤 Users

| Tool | Description |
|------|-------------|
| `chatops_get_user` | Look up a user by ID or username |
| `chatops_search_users` | Search users by name, username, or email |

### 📋 Teams

| Tool | Description |
|------|-------------|
| `chatops_list_teams` | List all accessible teams |
| `chatops_search_teams` | Search teams by name |
| `chatops_get_team` | Get details for a specific team |

### 📢 Channels

| Tool | Description |
|------|-------------|
| `chatops_list_channels` | List public channels in a team |
| `chatops_search_channels` | Search channels in a team |
| `chatops_get_channel` | Get channel details (by ID or name) |
| `chatops_get_channel_posts` | Read messages in a channel (paginated) |

### 💬 Posts & Threads

| Tool | Description |
|------|-------------|
| `chatops_get_post` | Get a single post by ID |
| `chatops_get_thread` | Read a full message thread |
| `chatops_get_pinned_posts` | Get pinned posts in a channel |
| `chatops_search_posts` | Full-text search with Mattermost syntax (`in:`, `from:`, `before:`, `after:`) |

### ✉️ Messaging

| Tool | Description |
|------|-------------|
| `chatops_send_message` | Send a new message to a channel |
| `chatops_reply_to_thread` | Reply to an existing thread |
| `chatops_upload_file` | Upload a file (returns fileId) |
| `chatops_send_message_with_files` | Send message with file attachments |

### 😀 Reactions & Emoji

| Tool | Description |
|------|-------------|
| `chatops_get_reactions` | List emoji reactions on a post |
| `chatops_add_reaction` | Add an emoji reaction to a post |
| `chatops_get_emoji` | Look up custom emoji (by ID, name, or list all) |

### 🔍 Search & Discovery

| Tool | Description |
|------|-------------|
| `chatops_get_file_info` | Get metadata for a file attachment by ID |
| `chatops_search_files` | Search file attachments by name |
| `chatops_search_links` | Find posts containing shared URLs/links |

## Common Workflows

### Smart search (recommended — 1 call)

```
chatops_smart_search({
  teamName: "Engineering",
  channelName: "general",
  userName: "alice.smith@example.com",
  dateFrom: "2026-04-01",
  dateTo: "2026-04-30"
})
```

### Browse and read a channel (manual — 3+ calls)

```
1. chatops_list_teams              → get teamId
2. chatops_list_channels teamId    → get channelId
3. chatops_get_channel_posts channelId → read messages
4. chatops_get_thread postId       → dive into a thread
```

### Send a message with a file

```
1. chatops_upload_file channelId filePath  → get fileId
2. chatops_send_message_with_files channelId message [fileId]
```

## Architecture

```
src/
├── server.ts          # MCP server entry, tool registration (24 tools)
├── bootstrap.ts       # Path resolution & env detection (npm vs local dev)
├── config.ts          # Zod env validation
├── errors.ts          # Structured error types
├── types.ts           # Normalized domain types
├── utils.ts           # Shared helpers (createClient, errorContent)
├── user-resolver.ts   # Batch user ID → username resolution
├── auth/
│   ├── session-store.ts    # Read/write/clear session file
│   ├── session-manager.ts  # Cookie + CSRF extraction & session validation
│   └── playwright-auth.ts  # Interactive SSO login via Playwright
├── cli/
│   ├── auth-login.ts  # chatops-auth-login binary
│   ├── auth-check.ts  # chatops-auth-check binary
│   └── auth-clear.ts  # chatops-auth-clear binary
├── chatops/
│   ├── http-client.ts # HTTP client with session cookies + X-CSRF-Token
│   ├── endpoints.ts   # API v4 URL builders
│   └── mappers.ts     # Raw API → domain types
└── tools/             # One handler per tool (24 files)
    ├── smart-search.ts    # Composite: resolves names → IDs internally
    ├── search-posts.ts    # Low-level Mattermost search syntax
    ├── list-teams.ts
    └── ...
```

### Key Design Decisions

- **CSRF Protection**: Mattermost requires `X-CSRF-Token` header (from `MMCSRF` cookie) for all POST/PUT/DELETE requests. The `session-manager.ts` extracts this automatically.
- **Bootstrap**: `bootstrap.ts` detects npm install vs local dev and routes session files to `~/.chatops/chatops-mcp/` (prod) or `.chatops/` (dev).
- **Zero-Config**: Only `CHATOPS_URL` is required. All paths are auto-resolved.
- **Navigation Hints**: Every tool output includes `💡 Next:` suggestions to guide the LLM's subsequent actions.

## Development

```bash
git clone <repo>
cd chatops-mcp
npm install
cp .env.example .env   # fill in CHATOPS_URL

# Authenticate
npm run chatops-auth-login

npm run dev            # run with tsx (development)
npm test               # vitest unit tests
npx tsc --noEmit       # type check
npm run build          # compile to dist/
```

### Testing with MCP Inspector

[MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) lets you browse and call tools interactively in a browser UI.

> **Important**: The Inspector **spawns the server itself** — do not run `npm run dev` separately.

```bash
# From the project directory (recommended)
npx @modelcontextprotocol/inspector tsx src/server.ts

# Or using the compiled build
npm run build
npx @modelcontextprotocol/inspector node dist/server.js
```

Then open **http://localhost:5173** in your browser.

The Inspector will:
1. Launch `tsx src/server.ts` as a child process (stdio transport)
2. Load env vars from `.env` automatically (via bootstrap)
3. List all 24 tools — click any tool to fill inputs and execute it

> If you see session errors, run `npm run chatops-auth-check` first to ensure your session is still valid.

## License

MIT
