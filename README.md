# mcp_center

Monorepo cho 3 MCP server độc lập. Mỗi group cài và cấu hình riêng.

| Group   | Package                    | Bin(s)                                            | Xác thực                 | Playwright |
|---------|----------------------------|---------------------------------------------------|--------------------------|------------|
| backlog | `@cuongph.dev/mcp-backlog` | `backlog-mcp`                                     | API Key                  | Không      |
| jira    | `@cuongph.dev/mcp-jira`    | `jira-mcp`                                        | HTTP Basic Auth          | Không      |
| chatops | `@cuongph.dev/mcp-chatops` | `chatops-mcp`, `chatops-auth-login/-check/-clear` | SSO session (login 1 lần)| Có         |

## Cài đặt

**Xem hướng dẫn đầy đủ: [`docs/INSTALL.md`](docs/INSTALL.md)** — biến môi trường, cấu hình MCP client, chạy từ source, publish, troubleshooting.

Nhanh (sau khi package đã publish):

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

> chatops cần login SSO trước: `npx -y playwright install chromium` rồi `chatops-auth-login` (xem INSTALL.md §4).

## Phát triển

```bash
pnpm install
pnpm -r build     # build 3 group ra dist/
pnpm -r test      # chạy toàn bộ unit test
```

Chi tiết cấu hình từng group xem README trong `packages/<group>/`.
