# mcp_center

Monorepo of three independent MCP servers. Each group is installed and configured separately.

| Group   | Package                    | Bin(s)                                            | Auth                      | Playwright |
|---------|----------------------------|---------------------------------------------------|---------------------------|------------|
| backlog | `@cuongph.dev/mcp-backlog` | `backlog-mcp`                                     | API Key                   | No         |
| jira    | `@cuongph.dev/mcp-jira`    | `jira-mcp`                                        | HTTP Basic Auth           | No         |
| chatops | `@cuongph.dev/mcp-chatops` | `chatops-mcp`, `chatops-auth-login/-check/-clear` | SSO session (login once)  | Yes        |

## Installation

**Full guide: [`docs/INSTALL.md`](docs/INSTALL.md)** — environment variables, MCP client configuration, running from source, publishing, and troubleshooting.

Quick start (once the packages are published):

```jsonc
// claude_desktop_config.json / mcp.json
{
  "mcpServers": {
    "backlog": { "command": "npx", "args": ["-y", "@cuongph.dev/mcp-backlog"], "env": { "BACKLOG_BASE_URL": "...", "BACKLOG_API_KEY": "..." } },
    "jira":    { "command": "npx", "args": ["-y", "@cuongph.dev/mcp-jira"],    "env": { "JIRA_BASE_URL": "...", "JIRA_EMAIL": "...", "JIRA_PASSWORD": "..." } },
    "chatops": { "command": "npx", "args": ["-y", "@cuongph.dev/mcp-chatops"], "env": { "CHATOPS_URL": "..." } }
  }
}
```

> chatops requires a one-time SSO login first: `npx -y playwright install chromium`, then `chatops-auth-login` (see INSTALL.md §4).

## Architecture

- **pnpm workspaces.** Two private, unpublished packages hold shared code:
  - `@cuongph.dev/mcp-core` — MCP stdio server helper, config/env parsing, bootstrap, HTTP client, error types.
  - `@cuongph.dev/mcp-auth-playwright` — SSO session/browser/CLI auth (used by chatops only).
- Each group bundles its shared dependencies into `dist/` at build time via `tsup` (esbuild), so every published package is self-contained.
- backlog depends only on `core` (no Playwright). chatops depends on `core` + `auth-playwright`. jira depends only on `core` (Basic Auth, no Playwright).

## Development

```bash
pnpm install
pnpm -r build     # build all three groups into dist/
pnpm -r test      # run all unit tests
pnpm -r typecheck # tsc --noEmit across the workspace
```

Run a single group in dev (tsx, no build):

```bash
JIRA_BASE_URL=... JIRA_EMAIL=... JIRA_PASSWORD=... pnpm --filter @cuongph.dev/mcp-jira dev
```

## Publishing

`core` and `auth-playwright` are `private` and never published. Only the three group packages are published. **Use `pnpm publish`** (not `npm publish`) so `workspace:*` specs are rewritten:

```bash
pnpm run release   # pnpm -r build && pnpm -r publish
```

See [`docs/INSTALL.md`](docs/INSTALL.md) §7 for details.

Per-group configuration is documented in each `packages/<group>/README.md`.
