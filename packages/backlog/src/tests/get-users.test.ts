import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleGetUsers } from "../tools/get-users.js";
import type { Config } from "../config.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../backlog/http-client.js", () => {
  const MockBacklogHttpClient = vi.fn();
  MockBacklogHttpClient.prototype.getProjectUsers = vi.fn();
  return { BacklogHttpClient: MockBacklogHttpClient };
});

import { BacklogHttpClient } from "../backlog/http-client.js";

const MOCK_CFG: Config = {
  BACKLOG_BASE_URL: "https://test.backlog.com",
  BACKLOG_API_KEY: "test-key",
  ATTACHMENT_WORKSPACE: "./downloads",
};

const MOCK_USERS = [
  {
    id: 101,
    userId: "nguyen.van.a",
    name: "Nguyễn Văn A",
    roleType: 2,
    roleName: "Normal User",
    mailAddress: "a@company.com",
    lastLoginTime: "2024-01-15T08:00:00Z",
  },
  {
    id: 102,
    userId: "john.doe",
    name: "John Doe",
    roleType: 1,
    roleName: "Administrator",
    mailAddress: "john@company.com",
    lastLoginTime: "2024-01-14T09:00:00Z",
  },
  {
    id: 103,
    userId: "tran.b",
    name: "Trần B",
    roleType: 3,
    roleName: "Reporter",
    mailAddress: null,
    lastLoginTime: null,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleGetUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all project members when no keyword is given", async () => {
    (BacklogHttpClient.prototype.getProjectUsers as ReturnType<typeof vi.fn>).mockImplementation(
      async () => MOCK_USERS
    );

    const result = await handleGetUsers({ projectIdOrKey: "MYPROJ" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("# Backlog Project Members");
    expect(result.content[0].text).toContain("MYPROJ");
    expect(result.content[0].text).toContain("Nguyễn Văn A");
    expect(result.content[0].text).toContain("John Doe");
    expect(result.content[0].text).toContain("Trần B");
    expect(BacklogHttpClient.prototype.getProjectUsers).toHaveBeenCalledWith("MYPROJ");
  });

  it("filters users by keyword (name match)", async () => {
    (BacklogHttpClient.prototype.getProjectUsers as ReturnType<typeof vi.fn>).mockImplementation(
      async () => MOCK_USERS
    );

    const result = await handleGetUsers({ projectIdOrKey: "MYPROJ", keyword: "nguyen" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Nguyễn Văn A");
    expect(result.content[0].text).not.toContain("John Doe");
    expect(result.content[0].text).toContain("keyword=\"nguyen\"");
  });

  it("filters users by keyword (userId match)", async () => {
    (BacklogHttpClient.prototype.getProjectUsers as ReturnType<typeof vi.fn>).mockImplementation(
      async () => MOCK_USERS
    );

    const result = await handleGetUsers({ projectIdOrKey: "MYPROJ", keyword: "john.doe" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("John Doe");
    expect(result.content[0].text).not.toContain("Nguyễn Văn A");
  });

  it("returns empty message when no users match keyword", async () => {
    (BacklogHttpClient.prototype.getProjectUsers as ReturnType<typeof vi.fn>).mockImplementation(
      async () => MOCK_USERS
    );

    const result = await handleGetUsers({ projectIdOrKey: "MYPROJ", keyword: "zzznomatch" }, MOCK_CFG);

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("_No users found matching your criteria._");
  });

  it("shows assigneeId hint in output", async () => {
    (BacklogHttpClient.prototype.getProjectUsers as ReturnType<typeof vi.fn>).mockImplementation(
      async () => MOCK_USERS
    );

    const result = await handleGetUsers({ projectIdOrKey: "MYPROJ" }, MOCK_CFG);

    expect(result.content[0].text).toContain("assigneeId");
  });

  it("returns isError=true on HTTP error", async () => {
    const { McpError } = await import("../errors.js");
    (BacklogHttpClient.prototype.getProjectUsers as ReturnType<typeof vi.fn>).mockImplementation(
      async () => {
        throw new McpError("BACKLOG_HTTP_ERROR", "Backlog HTTP 404");
      }
    );

    const result = await handleGetUsers({ projectIdOrKey: "BADPROJ" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("BACKLOG_HTTP_ERROR");
  });

  it("returns isError=true when projectIdOrKey is missing", async () => {
    const result = await handleGetUsers({}, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("returns isError=true when projectIdOrKey is empty string", async () => {
    const result = await handleGetUsers({ projectIdOrKey: "" }, MOCK_CFG);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });
});
