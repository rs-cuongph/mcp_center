# mcp_center — Installation & Configuration Guide

Three independent MCP servers in one monorepo. Each group is installed and configured on its own.

| Group   | npm package                  | Bin(s)                                              | Authentication                    | Needs Playwright? |
|---------|------------------------------|-----------------------------------------------------|-----------------------------------|-------------------|
| backlog | `@cuongph.dev/mcp-backlog`   | `backlog-mcp`                                       | API Key                           | No                |
| jira    | `@cuongph.dev/mcp-jira`      | `jira-mcp`                                          | HTTP Basic Auth (email + password)| No                |
| chatops | `@cuongph.dev/mcp-chatops`   | `chatops-mcp`, `chatops-auth-login/-check/-clear`   | SSO session cookie (login once)   | Yes (SSO login)   |

---

## 1. Prerequisites

- **Node.js >= 20** (`node -v`).
- **npx** (bundled with npm) to run published packages, or **pnpm** to run from source in the monorepo.
- **chatops** additionally needs Chromium for the one-time SSO login:
  ```bash
  npx -y playwright install chromium
  ```
  (backlog and jira do **not** require Playwright.)

> **Publish status:** if the three packages are not yet published to npm, `npx @cuongph.dev/mcp-*` will fail with "package not found". In that case use **Section 6 — Running from source**. After publishing (Section 7), use `npx` as shown below.

---

## 2. backlog — `@cuongph.dev/mcp-backlog`

### Environment variables

| Variable               | Required | Description                                                                 |
|------------------------|----------|-----------------------------------------------------------------------------|
| `BACKLOG_BASE_URL`     | ✅       | Backlog space URL, no trailing slash. e.g. `https://yourspace.backlog.com`  |
| `BACKLOG_API_KEY`      | ✅       | API key: *Account Settings > API > Register API key*                        |
| `ATTACHMENT_WORKSPACE` | ⬜       | Directory for downloaded/exported files. Use an absolute path when running via npx. Default `./downloads` |

### MCP client configuration (Claude Desktop / Cursor / …)

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/mcp-backlog"],
      "env": {
        "BACKLOG_BASE_URL": "https://yourspace.backlog.com",
        "BACKLOG_API_KEY": "your_api_key_here",
        "ATTACHMENT_WORKSPACE": "/Users/you/backlog-exports"
      }
    }
  }
}
```

No separate auth step — the API key in `env` is sufficient.

---

## 3. jira — `@cuongph.dev/mcp-jira`

Authentication is **HTTP Basic Auth via header only** (no Playwright, no SSO cookie, no auth CLI).

### Environment variables

| Variable                | Required | Description                                                                  |
|-------------------------|----------|------------------------------------------------------------------------------|
| `JIRA_BASE_URL`         | ✅       | Internal Jira 8 URL, no trailing slash. e.g. `https://jira.yourcompany.com`  |
| `JIRA_EMAIL`            | ✅       | Username/email for Basic Auth                                                |
| `JIRA_PASSWORD`         | ✅       | Password or token for Basic Auth                                             |
| `JIRA_VALIDATE_PATH`    | ⬜       | REST path used to validate credentials. Default `/rest/api/2/myself`         |
| `LOG_LEVEL`             | ⬜       | `debug` \| `info` \| `warn` \| `error` (default `info`)                      |
| `ATTACHMENT_WORKSPACE`  | ⬜       | Directory for downloaded attachments (default `./downloads`)                 |

> `JIRA_EMAIL` and `JIRA_PASSWORD` are **both required** — the server fails on startup if either is missing.

### MCP client configuration

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/mcp-jira"],
      "env": {
        "JIRA_BASE_URL": "https://jira.yourcompany.com",
        "JIRA_EMAIL": "you@yourcompany.com",
        "JIRA_PASSWORD": "your-password-or-token"
      }
    }
  }
}
```

---

## 4. chatops — `@cuongph.dev/mcp-chatops`

Authentication uses an **SSO session cookie** — log in once via a browser; the session is persisted to disk.

### Step 1 — Install Chromium (once)

```bash
npx -y playwright install chromium
```

### Step 2 — Log in via SSO (creates the session)

```bash
CHATOPS_URL=https://chatops.yourcompany.com \
  npx -y -p @cuongph.dev/mcp-chatops chatops-auth-login
```

A browser window opens — complete the SSO login manually. The session is saved to:
- Global npx usage: `~/.chatops/chatops-mcp/session.json`
- Running from source: `<repo>/packages/chatops/.chatops/session.json`

### Step 3 — Check / clear the session

```bash
CHATOPS_URL=https://chatops.yourcompany.com npx -y -p @cuongph.dev/mcp-chatops chatops-auth-check   # is the session alive?
CHATOPS_URL=https://chatops.yourcompany.com npx -y -p @cuongph.dev/mcp-chatops chatops-auth-clear   # remove the session
```

### Environment variables

| Variable      | Required | Description                                                |
|---------------|----------|------------------------------------------------------------|
| `CHATOPS_URL` | ✅       | ChatOps instance URL. e.g. `https://chatops.yourcompany.com` |
| `LOG_LEVEL`   | ⬜       | `debug` \| `info` \| `warn` \| `error` (default `info`)    |

### MCP client configuration

```json
{
  "mcpServers": {
    "chatops": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/mcp-chatops"],
      "env": {
        "CHATOPS_URL": "https://chatops.yourcompany.com"
      }
    }
  }
}
```

> The `chatops-mcp` server reads the session created in Step 2. When the session expires, run `chatops-auth-login` again.

---

## 5. Configuring all three groups at once

```json
{
  "mcpServers": {
    "backlog": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/mcp-backlog"],
      "env": { "BACKLOG_BASE_URL": "https://yourspace.backlog.com", "BACKLOG_API_KEY": "..." }
    },
    "jira": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/mcp-jira"],
      "env": { "JIRA_BASE_URL": "https://jira.yourcompany.com", "JIRA_EMAIL": "you@yourcompany.com", "JIRA_PASSWORD": "..." }
    },
    "chatops": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/mcp-chatops"],
      "env": { "CHATOPS_URL": "https://chatops.yourcompany.com" }
    }
  }
}
```

**Config file location by client:**
- Claude Desktop (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Desktop (Windows): `%APPDATA%\Claude\claude_desktop_config.json`
- Cursor: `~/.cursor/mcp.json` (or the MCP section in Settings)

Restart the MCP client after editing the config file.

---

## 6. Running from source (local, before publishing)

```bash
git clone https://github.com/rs-cuongph/mcp_center.git
cd mcp_center
pnpm install
pnpm -r build        # build all three groups into dist/
```

Each group produces a self-contained bundle at `packages/<group>/dist/`. Point the MCP client at the built file (absolute path) and pass env as in the sections above:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/abs/path/mcp_center/packages/jira/dist/server.js"],
      "env": { "JIRA_BASE_URL": "...", "JIRA_EMAIL": "...", "JIRA_PASSWORD": "..." }
    }
  }
}
```

chatops (from source): install Chromium, then log in:
```bash
npx -y playwright install chromium
CHATOPS_URL=https://chatops.yourcompany.com node packages/chatops/dist/cli/auth-login.js
```

Run in dev mode (tsx, no build needed):
```bash
JIRA_BASE_URL=... JIRA_EMAIL=... JIRA_PASSWORD=... pnpm --filter @cuongph.dev/mcp-jira dev
```

---

## 7. Publishing to npm (maintainers)

`core` and `auth-playwright` are `private` (never published); only the three group packages are published. Each group's `dist/` is self-contained (shared code is bundled at build time), so consumers install only the real runtime dependencies.

**Use `pnpm publish`** (not `npm publish`) so `workspace:*` specifications are rewritten to real versions. Each group declares `"publishConfig": { "access": "public" }`, so scoped packages publish publicly without extra flags.

```bash
pnpm run release   # pnpm -r build && pnpm -r publish
```

The published tarball for each group contains only `dist/`, `README.md`, `LICENSE`, and `package.json`. Bundled shared packages appear only in `devDependencies` (which consumers never install), so `npx`/`npm install` of a group pulls only its real runtime dependencies.

Deprecate the old package names (if previously published):
```bash
npm deprecate @cuongph.dev/backlog-mcp "Moved to @cuongph.dev/mcp-backlog"
npm deprecate @cuongph.dev/jira-mcp    "Moved to @cuongph.dev/mcp-jira"
npm deprecate @cuongph.dev/chatops-mcp "Moved to @cuongph.dev/mcp-chatops"
```

---

## 8. Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `npx: package not found @cuongph.dev/mcp-*` | Packages not published yet → use Section 6 (run from source). |
| jira: `AUTH_REQUIRED` on startup | Missing `JIRA_EMAIL`/`JIRA_PASSWORD` in `env`. Both are required. |
| jira: `SESSION_EXPIRED` / auth failed | Wrong email/password, or Jira does not allow Basic Auth on REST. Check `JIRA_VALIDATE_PATH`. |
| chatops: `chatops-auth-check` reports expired | Run `chatops-auth-login` again to create a fresh session. |
| chatops: login does not open a browser | Chromium not installed → `npx -y playwright install chromium`. |
| Server runs but client shows no tools | Wrong command/path in config; restart the MCP client; check the process's stderr log. |
| Attachments saved in the wrong place | Set `ATTACHMENT_WORKSPACE` to an absolute path. |

All three servers log to **stderr** (stdout is reserved for JSON-RPC) — read stderr to diagnose issues.
