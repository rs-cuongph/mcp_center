import { describe, it, expect } from "vitest";
import {
  teamsUrl,
  teamUrl,
  searchTeamsUrl,
  teamChannelsUrl,
  searchChannelsUrl,
  channelUrl,
  channelByNameUrl,
  channelPostsUrl,
  postThreadUrl,
  pinnedPostsUrl,
  postsUrl,
  filesUrl,
} from "../chatops/endpoints.js";

const BASE = "https://chatops.example.com";

describe("endpoints", () => {
  it("teamsUrl", () => {
    expect(teamsUrl(BASE)).toBe("https://chatops.example.com/api/v4/users/me/teams");
  });

  it("teamsUrl strips trailing slash", () => {
    expect(teamsUrl(`${BASE}/`)).toBe("https://chatops.example.com/api/v4/users/me/teams");
  });

  it("teamUrl", () => {
    expect(teamUrl(BASE, "abc123")).toBe(`${BASE}/api/v4/teams/abc123`);
  });

  it("searchTeamsUrl", () => {
    expect(searchTeamsUrl(BASE)).toBe(`${BASE}/api/v4/teams/search`);
  });

  it("teamChannelsUrl", () => {
    expect(teamChannelsUrl(BASE, "team1")).toBe(`${BASE}/api/v4/teams/team1/channels`);
  });

  it("searchChannelsUrl", () => {
    expect(searchChannelsUrl(BASE, "team1")).toBe(`${BASE}/api/v4/teams/team1/channels/search`);
  });

  it("channelUrl", () => {
    expect(channelUrl(BASE, "ch1")).toBe(`${BASE}/api/v4/channels/ch1`);
  });

  it("channelByNameUrl", () => {
    expect(channelByNameUrl(BASE, "team1", "general")).toBe(
      `${BASE}/api/v4/teams/team1/channels/name/general`
    );
  });

  it("channelPostsUrl", () => {
    expect(channelPostsUrl(BASE, "ch1")).toBe(`${BASE}/api/v4/channels/ch1/posts`);
  });

  it("postThreadUrl", () => {
    expect(postThreadUrl(BASE, "post1")).toBe(`${BASE}/api/v4/posts/post1/thread`);
  });

  it("pinnedPostsUrl", () => {
    expect(pinnedPostsUrl(BASE, "ch1")).toBe(`${BASE}/api/v4/channels/ch1/pinned`);
  });

  it("postsUrl", () => {
    expect(postsUrl(BASE)).toBe(`${BASE}/api/v4/posts`);
  });

  it("filesUrl", () => {
    expect(filesUrl(BASE)).toBe(`${BASE}/api/v4/files`);
  });
});
