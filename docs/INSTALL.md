# mcp_center — Hướng dẫn cài đặt & cấu hình

Ba MCP server độc lập trong một monorepo. Mỗi group cài và cấu hình riêng.

| Group   | Package npm                  | Bin(s)                                              | Cách xác thực                     | Cần Playwright? |
|---------|------------------------------|-----------------------------------------------------|-----------------------------------|-----------------|
| backlog | `@cuongph.dev/mcp-backlog`   | `backlog-mcp`                                       | API Key                           | Không           |
| jira    | `@cuongph.dev/mcp-jira`      | `jira-mcp`                                          | HTTP Basic Auth (email + password)| Không           |
| chatops | `@cuongph.dev/mcp-chatops`   | `chatops-mcp`, `chatops-auth-login/-check/-clear`   | SSO session cookie (login 1 lần)  | Có (login SSO)  |

---

## 1. Yêu cầu môi trường

- **Node.js >= 20** (`node -v`).
- **npx** (đi kèm npm) để chạy package đã publish; hoặc **pnpm** để chạy từ source trong monorepo.
- **chatops**: cần Chromium cho lần login SSO:
  ```bash
  npx -y playwright install chromium
  ```
  (backlog và jira **không** cần Playwright.)

> **Tình trạng publish:** nếu 3 package chưa được publish lên npm, lệnh `npx @cuongph.dev/mcp-*` sẽ báo không tìm thấy. Khi đó dùng **Mục 6 — Chạy từ source (local)**. Sau khi publish (xem Mục 7) thì dùng `npx` như dưới.

---

## 2. backlog — `@cuongph.dev/mcp-backlog`

### Biến môi trường

| Biến                   | Bắt buộc | Mô tả                                                                 |
|------------------------|----------|-----------------------------------------------------------------------|
| `BACKLOG_BASE_URL`     | ✅       | URL space Backlog, không dấu `/` cuối. VD `https://yourspace.backlog.com` |
| `BACKLOG_API_KEY`      | ✅       | API key: *Account Settings > API > Register API key*                  |
| `ATTACHMENT_WORKSPACE` | ⬜       | Thư mục lưu file tải/export. Nên dùng đường dẫn tuyệt đối khi chạy qua npx. Mặc định `./downloads` |

### Cấu hình MCP client (Claude Desktop / Cursor …)

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

Không có bước auth riêng — API key trong `env` là đủ.

---

## 3. jira — `@cuongph.dev/mcp-jira`

Xác thực **chỉ qua HTTP Basic Auth header** (không Playwright, không SSO cookie, không CLI auth).

### Biến môi trường

| Biến                    | Bắt buộc | Mô tả                                                                        |
|-------------------------|----------|------------------------------------------------------------------------------|
| `JIRA_BASE_URL`         | ✅       | URL Jira 8 nội bộ, không dấu `/` cuối. VD `https://jira.yourcompany.com`      |
| `JIRA_EMAIL`            | ✅       | Username/email cho Basic Auth                                                |
| `JIRA_PASSWORD`         | ✅       | Mật khẩu hoặc token cho Basic Auth                                           |
| `JIRA_VALIDATE_PATH`    | ⬜       | Path REST để validate. Mặc định `/rest/api/2/myself`                          |
| `LOG_LEVEL`             | ⬜       | `debug` \| `info` \| `warn` \| `error` (mặc định `info`)                      |
| `GITLAB_TOKEN`          | ⬜       | Chỉ cần cho tool `jira_sync_gitlab_review_defects` (scope `read_api`/`api`)   |
| `GITLAB_PROJECTS_JSON`  | ⬜       | Map project GitLab dạng JSON inline (xem `.env.example`)                      |
| `GITLAB_PROJECTS_FILE`  | ⬜       | Đường dẫn tuyệt đối tới file map GitLab (thay cho JSON inline)                |
| `GITLAB_DEDUP_FILE`     | ⬜       | Đường dẫn store chống trùng note đã sync                                      |
| `ATTACHMENT_WORKSPACE`  | ⬜       | Thư mục lưu attachment tải về (mặc định `./downloads`)                        |

> `JIRA_EMAIL` và `JIRA_PASSWORD` **bắt buộc đi cùng nhau** — thiếu một trong hai sẽ báo lỗi cấu hình khi khởi động.

### Cấu hình MCP client

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

Thêm `GITLAB_*` vào `env` nếu dùng tool đồng bộ GitLab review defects.

---

## 4. chatops — `@cuongph.dev/mcp-chatops`

Xác thực qua **SSO session cookie** — đăng nhập một lần bằng trình duyệt, session lưu ra đĩa.

### Bước 1 — Cài Chromium (một lần)

```bash
npx -y playwright install chromium
```

### Bước 2 — Đăng nhập SSO (tạo session)

```bash
CHATOPS_URL=https://chatops.yourcompany.com \
  npx -y -p @cuongph.dev/mcp-chatops chatops-auth-login
```

Trình duyệt mở ra → hoàn tất SSO thủ công. Session lưu tại:
- Chạy qua npx (global): `~/.chatops/chatops-mcp/session.json`
- Chạy từ source: `<repo>/packages/chatops/.chatops/session.json`

### Bước 3 — Kiểm tra / xoá session

```bash
CHATOPS_URL=https://chatops.yourcompany.com npx -y -p @cuongph.dev/mcp-chatops chatops-auth-check   # kiểm tra session còn sống
CHATOPS_URL=https://chatops.yourcompany.com npx -y -p @cuongph.dev/mcp-chatops chatops-auth-clear   # xoá session
```

### Biến môi trường

| Biến          | Bắt buộc | Mô tả                                                    |
|---------------|----------|----------------------------------------------------------|
| `CHATOPS_URL` | ✅       | URL instance ChatOps. VD `https://chatops.yourcompany.com` |
| `LOG_LEVEL`   | ⬜       | `debug` \| `info` \| `warn` \| `error` (mặc định `info`)  |

### Cấu hình MCP client

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

> Server `chatops-mcp` đọc session đã tạo ở Bước 2. Session hết hạn → chạy lại `chatops-auth-login`.

---

## 5. Cấu hình cả 3 group cùng lúc

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

**Vị trí file cấu hình theo client:**
- Claude Desktop (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Desktop (Windows): `%APPDATA%\Claude\claude_desktop_config.json`
- Cursor: `~/.cursor/mcp.json` (hoặc mục MCP trong Settings)

Sau khi sửa file, khởi động lại MCP client.

---

## 6. Chạy từ source (local, khi chưa publish)

```bash
git clone https://github.com/rs-cuongph/mcp_center.git
cd mcp_center
pnpm install
pnpm -r build        # build cả 3 group ra dist/
```

Mỗi group sinh bundle self-contained tại `packages/<group>/dist/`. Trỏ MCP client tới file đã build (đường dẫn tuyệt đối), truyền env như các mục trên:

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

chatops (source): cài Chromium rồi login:
```bash
npx -y playwright install chromium
CHATOPS_URL=https://chatops.yourcompany.com pnpm --filter @cuongph.dev/mcp-chatops exec node dist/cli/auth-login.js
```

Chạy dev (tsx, không cần build):
```bash
JIRA_BASE_URL=... JIRA_EMAIL=... JIRA_PASSWORD=... pnpm --filter @cuongph.dev/mcp-jira dev
```

---

## 7. Publish lên npm (dành cho maintainer)

`core` và `auth-playwright` là `private` (không publish); chỉ 3 group được publish. **Phải dùng `pnpm publish`** (không phải `npm publish`) để rewrite `workspace:*`.

```bash
pnpm -r build
pnpm -r publish --access public
```

Deprecate package tên cũ (nếu có):
```bash
npm deprecate @cuongph.dev/backlog-mcp "Moved to @cuongph.dev/mcp-backlog"
npm deprecate @cuongph.dev/jira-mcp    "Moved to @cuongph.dev/mcp-jira"
npm deprecate @cuongph.dev/chatops-mcp "Moved to @cuongph.dev/mcp-chatops"
```

---

## 8. Troubleshooting

| Triệu chứng | Nguyên nhân & cách xử lý |
|---|---|
| `npx: package not found @cuongph.dev/mcp-*` | Package chưa publish → dùng Mục 6 (chạy từ source). |
| jira: lỗi `AUTH_REQUIRED` khi khởi động | Thiếu `JIRA_EMAIL`/`JIRA_PASSWORD` trong `env`. Phải khai cả hai. |
| jira: lỗi `SESSION_EXPIRED` / auth failed | Sai email/password, hoặc Jira không cho Basic Auth trên REST. Kiểm tra `JIRA_VALIDATE_PATH`. |
| chatops: `chatops-auth-check` báo session hết hạn | Chạy lại `chatops-auth-login` để tạo session mới. |
| chatops: login không mở được trình duyệt | Chưa cài Chromium → `npx -y playwright install chromium`. |
| Server chạy nhưng client không thấy tool | Sai đường dẫn/command trong config; khởi động lại MCP client; kiểm tra log stderr của process. |
| File attachment lưu sai chỗ | Đặt `ATTACHMENT_WORKSPACE` là đường dẫn tuyệt đối. |

Log runtime của cả 3 server ghi ra **stderr** (stdout dành cho JSON-RPC) — xem stderr để chẩn đoán.
