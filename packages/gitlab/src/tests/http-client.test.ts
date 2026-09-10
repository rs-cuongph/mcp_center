import { describe, it, expect, vi, beforeEach } from "vitest";
import { encodeProjectId } from "../gitlab/endpoints.js";
import type { GitlabRawFile } from "../types/gitlab-api.js";

// ---------------------------------------------------------------------------
// Mocks — stub `createHttpClient` so `GitlabHttpClient` never touches real
// axios/network; capture the args it was constructed with and control the
// mocked `get` responses per test.
// ---------------------------------------------------------------------------
const { mockGet, mockCreateHttpClient } = vi.hoisted(() => {
  const get = vi.fn();
  return { mockGet: get, mockCreateHttpClient: vi.fn(() => ({ get })) };
});

vi.mock("@cuongph.dev/mcp-core", async () => {
  const actual = await vi.importActual<typeof import("@cuongph.dev/mcp-core")>("@cuongph.dev/mcp-core");
  return { ...actual, createHttpClient: mockCreateHttpClient };
});

import { GitlabHttpClient } from "../gitlab/http-client.js";

const BASE_URL = "https://devops.runsystem.info";
const TOKEN = "test-token";

function rawFile(overrides: Partial<GitlabRawFile>): GitlabRawFile {
  return {
    file_name: "file.bin",
    file_path: "src/file.bin",
    size: 3,
    encoding: "base64",
    content: "",
    content_sha256: "sha",
    ref: "main",
    blob_id: "blob",
    commit_id: "commit",
    last_commit_id: "commit",
    ...overrides,
  };
}

describe("GitlabHttpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("configures the underlying HTTP client with the PRIVATE-TOKEN header and /api/v4 base URL", () => {
    new GitlabHttpClient(BASE_URL, TOKEN);

    expect(mockCreateHttpClient).toHaveBeenCalledWith({
      baseURL: `${BASE_URL}/api/v4`,
      headers: { "PRIVATE-TOKEN": TOKEN, Accept: "application/json" },
    });
  });

  it("strips a trailing slash from the instance URL before building the base URL", () => {
    new GitlabHttpClient(`${BASE_URL}/`, TOKEN);

    expect(mockCreateHttpClient).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: `${BASE_URL}/api/v4` })
    );
  });

  it("maps a 401 response to AUTH_REQUIRED", async () => {
    mockGet.mockResolvedValue({ status: 401, data: {} });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(client.getCurrentUser("/api/v4/user")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("maps a 403 response to PERMISSION_DENIED", async () => {
    mockGet.mockResolvedValue({ status: 403, data: {} });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(client.getCurrentUser("/api/v4/user")).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("maps a 500 response to GITLAB_HTTP_ERROR", async () => {
    mockGet.mockResolvedValue({ status: 500, data: { message: "internal error" } });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    await expect(client.getCurrentUser("/api/v4/user")).rejects.toMatchObject({ code: "GITLAB_HTTP_ERROR" });
  });

  it("encodeProjectId keeps numeric ids unchanged", () => {
    expect(encodeProjectId("42")).toBe("42");
  });

  it("encodeProjectId percent-encodes a group/project path", () => {
    expect(encodeProjectId("group/app")).toBe("group%2Fapp");
  });

  it("getFile decodes a small text file", async () => {
    const content = Buffer.from("export const x = 1;", "utf-8").toString("base64");
    mockGet.mockResolvedValue({
      status: 200,
      data: rawFile({ file_path: "src/index.ts", size: 20, content, encoding: "base64" }),
    });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const file = await client.getFile("42", "src/index.ts", "main");

    expect(file.binary).toBe(false);
    expect(file.content).toBe("export const x = 1;");
  });

  it("getFile reports metadata only, with no base64 in the result, for bytes containing a NUL", async () => {
    const bytes = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    mockGet.mockResolvedValue({
      status: 200,
      data: rawFile({ file_path: "assets/logo.bin", size: bytes.length, content: bytes.toString("base64") }),
    });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const file = await client.getFile("42", "assets/logo.bin", "main");

    expect(file.binary).toBe(true);
    expect(file.content).toBeNull();
    expect(JSON.stringify(file).toLowerCase()).not.toContain("base64");
  });

  it("getFile reports metadata only for binary bytes with no NUL byte (invalid UTF-8 stream)", async () => {
    const bytes = Buffer.from([0xff, 0xfe, 0xfd]);
    mockGet.mockResolvedValue({
      status: 200,
      data: rawFile({ file_path: "assets/image.dat", size: bytes.length, content: bytes.toString("base64") }),
    });
    const client = new GitlabHttpClient(BASE_URL, TOKEN);

    const file = await client.getFile("42", "assets/image.dat", "main");

    expect(file.binary).toBe(true);
    expect(file.content).toBeNull();
    expect(JSON.stringify(file).toLowerCase()).not.toContain("base64");
  });
});
