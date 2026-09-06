// ---------------------------------------------------------------------------
// chatops-mcp — MCP server entry point
// ---------------------------------------------------------------------------
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runStdioServer } from "@cuongph.dev/mcp-core";
import pkg from "../package.json" with { type: "json" };
import { z } from "zod";
import { config } from "./config.js";

// Tool handlers
import { handleListTeams } from "./tools/list-teams.js";
import { handleSearchTeams } from "./tools/search-teams.js";
import { handleGetTeam } from "./tools/get-team.js";
import { handleListChannels } from "./tools/list-channels.js";
import { handleSearchChannels } from "./tools/search-channels.js";
import { handleGetChannel } from "./tools/get-channel.js";
import { handleGetChannelPosts } from "./tools/get-channel-posts.js";
import { handleGetThread } from "./tools/get-thread.js";
import { handleGetPinnedPosts } from "./tools/get-pinned-posts.js";
import { handleSendMessage } from "./tools/send-message.js";
import { handleReplyToThread } from "./tools/reply-to-thread.js";
import { handleUploadFile } from "./tools/upload-file.js";
import { handleSendMessageWithFiles } from "./tools/send-message-with-files.js";
import { handleGetReactions } from "./tools/get-reactions.js";
import { handleAddReaction } from "./tools/add-reaction.js";
import { handleGetEmoji } from "./tools/get-emoji.js";
import { handleSearchPosts } from "./tools/search-posts.js";
import { handleGetFileInfo } from "./tools/get-file-info.js";
import { handleSearchFiles } from "./tools/search-files.js";
import { handleSearchLinks } from "./tools/search-links.js";
import { handleGetUser } from "./tools/get-user.js";
import { handleSearchUsers } from "./tools/search-users.js";
import { handleGetPost } from "./tools/get-post.js";
import { handleSmartSearch } from "./tools/smart-search.js";

// ---------------------------------------------------------------------------
// MCP server factory
// ---------------------------------------------------------------------------

function registerTools(server: McpServer): void {

  // ── Users ────────────────────────────────────────────────────────────────

  server.tool(
    "chatops_get_user",
    `Look up a ChatOps user by ID or username.

Returns: username, display name, email, position, roles, and join date.
Use this to resolve a userId from post output into a human-readable name.`,
    {
      userId: z.string().optional()
        .describe("User ID (preferred lookup)."),
      username: z.string().optional()
        .describe("Username handle (without @) — used when userId is not provided."),
    },
    async (input) => handleGetUser(input, config)
  );

  server.tool(
    "chatops_search_users",
    "Search ChatOps users by name, username, or email. Returns matching users with display name, role, and position.",
    {
      term: z.string().min(1).describe("Search term to match against username, name, or email."),
      page: z.number().int().min(0).optional().default(0).describe("0-based page (default 0)."),
      perPage: z.number().int().min(1).max(60).optional().default(20).describe("Results per page (default 20)."),
    },
    async (input) => handleSearchUsers(input, config)
  );

  // ── Posts ────────────────────────────────────────────────────────────────

  server.tool(
    "chatops_get_post",
    `Get a single ChatOps post by its ID.

Returns the full message, resolved author, channel, timestamps, file attachments, and thread info.
Useful for inspecting a specific post referenced by search results, reactions, or file info.`,
    {
      postId: z.string().min(1).describe("ChatOps post ID."),
    },
    async (input) => handleGetPost(input, config)
  );

  // ── Teams ────────────────────────────────────────────────────────────────

  server.tool(
    "chatops_list_teams",
    "List all ChatOps teams the authenticated user is a member of. Returns team ID, display name, slug, type, and description.",
    {},
    async (input) => handleListTeams(input, config)
  );

  server.tool(
    "chatops_search_teams",
    "Search ChatOps teams by name/display name. Returns matching teams with ID, name, and type.",
    {
      term: z.string().min(1).describe("Search term to match against team names."),
    },
    async (input) => handleSearchTeams(input, config)
  );

  server.tool(
    "chatops_get_team",
    "Get detailed information about a single ChatOps team by its ID.",
    {
      teamId: z.string().min(1).describe("ChatOps team ID."),
    },
    async (input) => handleGetTeam(input, config)
  );

  // ── Channels ─────────────────────────────────────────────────────────────

  server.tool(
    "chatops_list_channels",
    "List public channels in a ChatOps team. Returns channel ID, name, type, message count, and purpose.",
    {
      teamId: z.string().min(1).describe("ChatOps team ID to list channels for."),
      page: z.number().int().min(0).optional().default(0)
        .describe("0-based page number (default 0)."),
      perPage: z.number().int().min(1).max(200).optional().default(60)
        .describe("Number of channels per page (1–200, default 60)."),
    },
    async (input) => handleListChannels(input, config)
  );

  server.tool(
    "chatops_search_channels",
    "Search channels in a ChatOps team by name or display name.",
    {
      teamId: z.string().min(1).describe("ChatOps team ID to search within."),
      term: z.string().min(1).describe("Search term to match against channel names."),
    },
    async (input) => handleSearchChannels(input, config)
  );

  server.tool(
    "chatops_get_channel",
    `Get detailed information about a single ChatOps channel.

Lookup modes:
- By channelId (preferred): provide channelId only.
- By name: provide both teamId and channelName (the URL slug).`,
    {
      channelId: z.string().optional()
        .describe("ChatOps channel ID (preferred lookup)."),
      teamId: z.string().optional()
        .describe("Team ID — required when looking up by channelName."),
      channelName: z.string().optional()
        .describe("Channel slug/name — used only when channelId is not provided."),
    },
    async (input) => handleGetChannel(input, config)
  );

  server.tool(
    "chatops_get_channel_posts",
    `Retrieve posts from a ChatOps channel, ordered newest-first.

Use page/perPage for pagination. Each post includes author, timestamp, message text, and attachment info.`,
    {
      channelId: z.string().min(1).describe("ChatOps channel ID."),
      page: z.number().int().min(0).optional().default(0)
        .describe("0-based page number (default 0)."),
      perPage: z.number().int().min(1).max(200).optional().default(30)
        .describe("Number of posts per page (1–200, default 30)."),
    },
    async (input) => handleGetChannelPosts(input, config)
  );

  // ── Threads & Pinned ─────────────────────────────────────────────────────

  server.tool(
    "chatops_get_thread",
    "Get all posts in a thread rooted at a given post ID. Returns the root post and all replies in order.",
    {
      postId: z.string().min(1).describe("ID of the root post of the thread."),
    },
    async (input) => handleGetThread(input, config)
  );

  server.tool(
    "chatops_get_pinned_posts",
    "Get all pinned posts in a ChatOps channel.",
    {
      channelId: z.string().min(1).describe("ChatOps channel ID."),
    },
    async (input) => handleGetPinnedPosts(input, config)
  );

  // ── Write ────────────────────────────────────────────────────────────────

  server.tool(
    "chatops_send_message",
    "Send a new message to a ChatOps channel. Returns the created post ID and timestamp.",
    {
      channelId: z.string().min(1).describe("ChatOps channel ID to post into."),
      message: z.string().min(1).describe("Message text to send. Supports Markdown."),
    },
    async (input) => handleSendMessage(input, config)
  );

  server.tool(
    "chatops_reply_to_thread",
    "Reply to an existing post/thread in ChatOps. The reply is linked to the root post.",
    {
      rootPostId: z.string().min(1).describe("ID of the root post to reply to."),
      channelId: z.string().min(1).describe("Channel ID where the thread exists."),
      message: z.string().min(1).describe("Reply message text. Supports Markdown."),
    },
    async (input) => handleReplyToThread(input, config)
  );

  server.tool(
    "chatops_upload_file",
    `Upload a local file to ChatOps and return the file ID.

The file ID can then be passed to chatops_send_message_with_files to attach it to a message.
The file must be accessible from the local filesystem.`,
    {
      channelId: z.string().min(1).describe("Channel ID where the file will be attached."),
      filePath: z.string().min(1).describe("Absolute or relative path to the local file to upload."),
    },
    async (input) => handleUploadFile(input, config)
  );

  server.tool(
    "chatops_send_message_with_files",
    `Send a message with one or more pre-uploaded file attachments.

Workflow:
1. Call chatops_upload_file for each file → get fileId(s)
2. Call this tool with the fileIds to post message + attachments together.`,
    {
      channelId: z.string().min(1).describe("ChatOps channel ID to post into."),
      message: z.string().describe("Message text (can be empty string if files speak for themselves)."),
      fileIds: z.array(z.string().min(1)).min(1).max(10)
        .describe("List of pre-uploaded file IDs (1–10). Get these from chatops_upload_file."),
      rootPostId: z.string().optional()
        .describe("Optional: reply to this post ID (creates a thread reply with attachments)."),
    },
    async (input) => handleSendMessageWithFiles(input, config)
  );

  // ── Reactions ────────────────────────────────────────────────────────────

  server.tool(
    "chatops_get_reactions",
    "List all emoji reactions on a ChatOps post. Returns a grouped summary by emoji and a full detail table with user IDs and timestamps.",
    {
      postId: z.string().min(1).describe("ChatOps post ID to fetch reactions for."),
    },
    async (input) => handleGetReactions(input, config)
  );

  server.tool(
    "chatops_add_reaction",
    `Add an emoji reaction to a ChatOps post on behalf of the authenticated user.

The emoji name must be a standard Mattermost/ChatOps emoji slug (e.g. "thumbsup", "heart", "tada").
Do not include colons — use "thumbsup" not ":thumbsup:".`,
    {
      postId: z.string().min(1).describe("ChatOps post ID to react to."),
      emojiName: z.string().min(1)
        .describe("Emoji slug without colons (e.g. \"thumbsup\", \"heart\", \"tada\")."),
    },
    async (input) => handleAddReaction(input, config)
  );

  server.tool(
    "chatops_get_emoji",
    `Look up custom emoji in ChatOps.

Lookup modes (mutually exclusive, checked in this order):
- By emojiId: provide emojiId to fetch one specific emoji.
- By emojiName: provide emojiName (slug, no colons) to fetch by name.
- List all: omit both to list all custom emoji sorted by name.

Built-in system emoji (e.g. :thumbsup:, :heart:) are not stored as custom emoji and won't appear in the list.`,
    {
      emojiId: z.string().optional()
        .describe("Custom emoji ID (preferred lookup)."),
      emojiName: z.string().optional()
        .describe("Emoji slug without colons — used when emojiId is not provided."),
    },
    async (input) => handleGetEmoji(input, config)
  );

  // ── Search ────────────────────────────────────────────────────────────────────

  server.tool(
    "chatops_search_posts",
    `Full-text search of posts in a ChatOps team.

Supports Mattermost search syntax:
- Phrase search: "exact phrase"
- Channel filter: in:channel-name (or use channelName param)
- Author filter: from:username
- Date filter: on:YYYY-MM-DD, before:YYYY-MM-DD, after:YYYY-MM-DD`,
    {
      teamId: z.string().min(1).describe("ChatOps team ID to search within."),
      terms: z.string().min(1).describe("Search query. Supports Mattermost search syntax."),
      channelName: z.string().optional()
        .describe("Optional channel slug/name to restrict search to a specific channel."),
      isOrSearch: z.boolean().optional().default(false)
        .describe("If true, terms are OR-ed instead of AND-ed (default false)."),
      page: z.number().int().min(0).optional().default(0).describe("0-based page (default 0)."),
      perPage: z.number().int().min(1).max(60).optional().default(20).describe("Results per page (default 20, max 60)."),
    },
    async (input) => handleSearchPosts(input, config)
  );

  server.tool(
    "chatops_get_file_info",
    "Get metadata (name, size, MIME type, upload date, linked post/channel) for a specific file attachment by its ID.",
    {
      fileId: z.string().min(1).describe("ChatOps file ID to look up."),
    },
    async (input) => handleGetFileInfo(input, config)
  );

  server.tool(
    "chatops_search_files",
    `Search file attachments in a ChatOps team by file name or extension.

Returns file metadata including name, size, MIME type, and the post/channel it was attached to.`,
    {
      teamId: z.string().min(1).describe("ChatOps team ID to search within."),
      terms: z.string().min(1).describe("Search term — matched against file name."),
      channelId: z.string().optional()
        .describe("Optional channel ID to restrict search to a specific channel."),
      page: z.number().int().min(0).optional().default(0).describe("0-based page (default 0)."),
      perPage: z.number().int().min(1).max(60).optional().default(20).describe("Results per page (default 20)."),
    },
    async (input) => handleSearchFiles(input, config)
  );

  server.tool(
    "chatops_search_links",
    `Find posts that contain shared URLs/links in a ChatOps team.

Optionally narrow by channel name (slug) or a keyword (e.g. a domain like "github.com").
Returns matching posts with all extracted URLs highlighted.`,
    {
      teamId: z.string().min(1).describe("ChatOps team ID to search within."),
      channelName: z.string().optional()
        .describe("Optional channel slug/name to restrict search to a specific channel."),
      term: z.string().optional()
        .describe("Optional keyword to narrow results (e.g. \"github.com\", \"confluence\")."),
      page: z.number().int().min(0).optional().default(0).describe("0-based page (default 0)."),
      perPage: z.number().int().min(1).max(60).optional().default(20).describe("Results per page (default 20)."),
    },
    async (input) => handleSearchLinks(input, config)
  );

  // ── Smart Search (composite) ────────────────────────────────────────────

  server.tool(
    "chatops_smart_search",
    `All-in-one search: resolves team/channel/user by name and searches posts — no need to call list_teams, search_channels, or search_users first.

Accepts human-readable names instead of IDs:
- teamName: "Đà Nẵng" (required)
- channelName: "CHECK.OFF.LATER" or "checkoff-later" (optional)
- userName: email like "quangdt@runsystem.net" or display name (optional)
- dateFrom / dateTo: "2026-04-01" / "2026-04-30" (optional, inclusive range)
- keywords: additional text to search for (optional)

Internally resolves all names → IDs in parallel, then runs the search.
Use this as the default search tool when the user provides names, not IDs.`,
    {
      teamName: z.string().min(1).describe("Team name or display name (e.g. 'Đà Nẵng')."),
      channelName: z.string().optional()
        .describe("Channel display name or slug (e.g. 'CHECK.OFF.LATER' or 'checkoff-later')."),
      userName: z.string().optional()
        .describe("User email, username, or display name to search for their posts."),
      dateFrom: z.string().optional()
        .describe("Start date (YYYY-MM-DD). Posts on or after this date."),
      dateTo: z.string().optional()
        .describe("End date (YYYY-MM-DD). Posts on or before this date."),
      keywords: z.string().optional()
        .describe("Additional search keywords (e.g. 'xin phép', 'nghỉ')."),
      page: z.number().int().min(0).optional().default(0).describe("0-based page (default 0)."),
      perPage: z.number().int().min(1).max(60).optional().default(20).describe("Results per page (default 20)."),
    },
    async (input) => handleSmartSearch(input, config)
  );

}

runStdioServer({
  name: "chatops-mcp",
  version: pkg.version,
  register: (server) => registerTools(server),
}).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[chatops-mcp] Fatal: ${msg}\n`);
  process.exit(1);
});
