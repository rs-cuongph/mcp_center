# mcp_center — Installation & Configuration Guide

Four independent MCP servers in one monorepo. Each group is installed and configured on its own.

| Group   | npm package                  | Bin(s)                                              | Authentication                    | Needs Playwright? |
|---------|------------------------------|-----------------------------------------------------|-----------------------------------|-------------------|
| backlog | `@cuongph.dev/mcp-backlog`   | `backlog-mcp`                                       | API Key                           | No                |
| jira    | `@cuongph.dev/mcp-jira`      | `jira-mcp`                                          | HTTP Basic Auth (email + password)| No                |
| gitlab  | `@cuongph.dev/mcp-gitlab`    | `gitlab-mcp`                                        | Personal Access Token (`PRIVATE-TOKEN` header) | No |
| chatops | `@cuongph.dev/mcp-chatops`   | `chatops-mcp`, `chatops-auth-login/-check/-clear`   | SSO session cookie (login once)   | Yes (SSO login)   |

---

## 1. Prerequisites

- **Node.js >= 20** (`node -v`).
- **npx** (bundled with npm) to run published packages, or **pnpm** to run from source in the monorepo.
- **chatops** additionally needs Chromium for the one-time SSO login:
  ```bash
  npx -y playwright install chromium
  ```
  (backlog, jira, and gitlab do **not** require Playwright.)

> **Publish status:** if the four packages are not yet published to npm, `npx @cuongph.dev/mcp-*` will fail with "package not found". In that case use **Section 7 — Running from source**. After publishing (Section 8), use `npx` as shown below.

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

## 4. gitlab — `@cuongph.dev/mcp-gitlab`

Authentication is a **GitLab Personal Access Token (PAT)** sent via the `PRIVATE-TOKEN` header (no Playwright, no SSO cookie).

### Environment variables

| Variable               | Required | Description                                                                                   |
|-------------------------|----------|-----------------------------------------------------------------------------------------------|
| `GITLAB_URL`            | ✅       | Self-hosted GitLab instance URL, no trailing slash. e.g. `https://gitlab.yourcompany.com`     |
| `GITLAB_TOKEN`          | ✅       | Personal Access Token. Scope `read_api` is enough for the read tools; scope `api` is required to use the write tools (`gitlab_create_issue`, `gitlab_add_issue_note`, `gitlab_add_merge_request_note`). |
| `GITLAB_VALIDATE_PATH`  | ⬜       | REST path used to validate the token in `gitlab_get_current_user`. Default `/api/v4/user`. Override for self-hosted setups behind a reverse proxy that remaps the API path. |
| `LOG_LEVEL`             | ⬜       | `debug` \| `info` \| `warn` \| `error` (default `info`)                                       |

> Bin: `gitlab-mcp`. Read tools (list/get projects, issues, merge requests, commits, files, branches, pipelines) work with a `read_api`-scoped token. The three write tools additionally require an `api`-scoped token — GitLab rejects write requests from a `read_api`-only token with `403 PERMISSION_DENIED`.

### MCP client configuration

```json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/mcp-gitlab"],
      "env": {
        "GITLAB_URL": "https://gitlab.yourcompany.com",
        "GITLAB_TOKEN": "glpat-your-personal-access-token"
      }
    }
  }
}
```

---

## 5. chatops — `@cuongph.dev/mcp-chatops`

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

## 6. Configuring all four groups at once

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
    "gitlab": {
      "command": "npx",
      "args": ["-y", "@cuongph.dev/mcp-gitlab"],
      "env": { "GITLAB_URL": "https://gitlab.yourcompany.com", "GITLAB_TOKEN": "..." }
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

## 7. Running from source (local, before publishing)

```bash
git clone https://github.com/rs-cuongph/mcp_center.git
cd mcp_center
pnpm install
pnpm -r build        # build all four groups into dist/
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
GITLAB_URL=... GITLAB_TOKEN=... pnpm --filter @cuongph.dev/mcp-gitlab dev
```

---

## 8. Publishing to npm (maintainers)

`core` and `auth-playwright` are `private` (never published); only the four group packages are published. Each group's `dist/` is self-contained (shared code is bundled at build time), so consumers install only the real runtime dependencies.

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

## 9. Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `npx: package not found @cuongph.dev/mcp-*` | Packages not published yet → use Section 7 (run from source). |
| jira: `AUTH_REQUIRED` on startup | Missing `JIRA_EMAIL`/`JIRA_PASSWORD` in `env`. Both are required. |
| jira: `SESSION_EXPIRED` / auth failed | Wrong email/password, or Jira does not allow Basic Auth on REST. Check `JIRA_VALIDATE_PATH`. |
| gitlab: `AUTH_REQUIRED` on startup / tool calls | Missing or invalid `GITLAB_TOKEN`. Check `GITLAB_VALIDATE_PATH` for self-hosted proxies that remap `/api/v4`. |
| gitlab: `PERMISSION_DENIED` on write tools | `GITLAB_TOKEN` scope is `read_api` only. Reissue the token with `api` scope for `gitlab_create_issue`/`gitlab_add_issue_note`/`gitlab_add_merge_request_note`. |
| chatops: `chatops-auth-check` reports expired | Run `chatops-auth-login` again to create a fresh session. |
| chatops: login does not open a browser | Chromium not installed → `npx -y playwright install chromium`. |
| Server runs but client shows no tools | Wrong command/path in config; restart the MCP client; check the process's stderr log. |
| Attachments saved in the wrong place | Set `ATTACHMENT_WORKSPACE` to an absolute path. |

All four servers log to **stderr** (stdout is reserved for JSON-RPC) — read stderr to diagnose issues.
