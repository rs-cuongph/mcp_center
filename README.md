# mcp_center

Monorepo cho 3 MCP server. Mỗi group install riêng:

| Group   | Package                      | Chạy (MCP client)                     |
|---------|------------------------------|---------------------------------------|
| backlog | @cuongph.dev/mcp-backlog     | npx -y @cuongph.dev/mcp-backlog       |
| jira    | @cuongph.dev/mcp-jira        | npx -y @cuongph.dev/mcp-jira          |
| chatops | @cuongph.dev/mcp-chatops     | npx -y @cuongph.dev/mcp-chatops       |

Dev: `pnpm install`, `pnpm -r build`, `pnpm -r test`.
Chi tiết cấu hình từng group xem README trong `packages/<group>/`.
