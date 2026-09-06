import { describe, it, expect } from "vitest";
import { mapTeam, mapChannel, mapPost, mapPostList } from "../chatops/mappers.js";
import type {
  ChatOpsRawTeam,
  ChatOpsRawChannel,
  ChatOpsRawPost,
  ChatOpsRawPostList,
} from "../types/chatops-api.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const rawTeam: ChatOpsRawTeam = {
  id: "team1",
  display_name: "My Team",
  name: "my-team",
  description: "A test team",
  type: "O",
  create_at: 1700000000000,
  update_at: 1700000001000,
  delete_at: 0,
  allow_open_invite: true,
};

const rawChannel: ChatOpsRawChannel = {
  id: "ch1",
  team_id: "team1",
  type: "O",
  display_name: "General",
  name: "general",
  header: "Team channel",
  purpose: "General discussion",
  total_msg_count: 42,
  create_at: 1700000000000,
  update_at: 1700000001000,
  delete_at: 0,
  last_post_at: 1700000002000,
};

const rawPost: ChatOpsRawPost = {
  id: "post1",
  channel_id: "ch1",
  user_id: "user1",
  root_id: "",
  message: "Hello world",
  type: "",
  create_at: 1700000000000,
  update_at: 1700000001000,
  delete_at: 0,
  file_ids: [],
};

const rawPostList: ChatOpsRawPostList = {
  order: ["post1"],
  posts: {
    post1: rawPost,
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("mapTeam", () => {
  it("maps open team correctly", () => {
    const t = mapTeam(rawTeam);
    expect(t.id).toBe("team1");
    expect(t.displayName).toBe("My Team");
    expect(t.name).toBe("my-team");
    expect(t.type).toBe("open");
    expect(t.allowOpenInvite).toBe(true);
    expect(t.createdAt).toMatch(/^\d{4}-/); // ISO 8601
  });

  it("maps invite-only team", () => {
    const t = mapTeam({ ...rawTeam, type: "I" });
    expect(t.type).toBe("invite-only");
  });
});

describe("mapChannel", () => {
  it("maps public channel correctly", () => {
    const c = mapChannel(rawChannel);
    expect(c.id).toBe("ch1");
    expect(c.teamId).toBe("team1");
    expect(c.type).toBe("public");
    expect(c.displayName).toBe("General");
    expect(c.totalMsgCount).toBe(42);
    expect(c.lastPostAt).toMatch(/^\d{4}-/);
  });

  it("maps private channel type", () => {
    const c = mapChannel({ ...rawChannel, type: "P" });
    expect(c.type).toBe("private");
  });

  it("maps direct message type", () => {
    const c = mapChannel({ ...rawChannel, type: "D" });
    expect(c.type).toBe("direct");
  });
});

describe("mapPost", () => {
  it("maps top-level post correctly", () => {
    const p = mapPost(rawPost);
    expect(p.id).toBe("post1");
    expect(p.channelId).toBe("ch1");
    expect(p.userId).toBe("user1");
    expect(p.rootId).toBeNull();      // "" → null
    expect(p.message).toBe("Hello world");
    expect(p.fileIds).toEqual([]);
    expect(p.files).toEqual([]);
  });

  it("maps reply post (rootId set)", () => {
    const p = mapPost({ ...rawPost, root_id: "post0" });
    expect(p.rootId).toBe("post0");
  });
});

describe("mapPostList", () => {
  it("maps post list in order", () => {
    const list = mapPostList(rawPostList);
    expect(list.order).toEqual(["post1"]);
    expect(list.posts).toHaveLength(1);
    expect(list.posts[0].id).toBe("post1");
    expect(list.totalCount).toBe(1);
  });

  it("filters deleted posts", () => {
    const deletedList: ChatOpsRawPostList = {
      order: ["post1"],
      posts: { post1: { ...rawPost, delete_at: 1700000999000 } },
    };
    const list = mapPostList(deletedList);
    expect(list.posts).toHaveLength(0);
  });
});
