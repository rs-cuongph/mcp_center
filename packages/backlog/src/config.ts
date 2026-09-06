import { defaultDownloadsDir } from "./bootstrap.js";
import { z } from "zod";
import { parseEnv } from "@cuongph.dev/mcp-core";

// ---------------------------------------------------------------------------
// Schema — only user-facing variables are read from the environment.
// Internal/infra settings are hardcoded below.
// ---------------------------------------------------------------------------

const schema = z.object({
  BACKLOG_BASE_URL: z
    .string()
    .url("BACKLOG_BASE_URL must be a valid URL (e.g. https://yourspace.backlog.com)"),

  BACKLOG_API_KEY: z
    .string()
    .min(1, "BACKLOG_API_KEY must not be empty"),
});

// ---------------------------------------------------------------------------
// Hardcoded defaults — not configurable via .env
// ---------------------------------------------------------------------------

const DEFAULTS = {
  ATTACHMENT_WORKSPACE: defaultDownloadsDir, // absolute path
} as const;

export type Config = z.infer<typeof schema> & typeof DEFAULTS;

// ---------------------------------------------------------------------------
// Parse once at startup — callers import `config` directly
// ---------------------------------------------------------------------------

function loadConfig(): Config {
  return { ...DEFAULTS, ...parseEnv(schema) };
}

export const config: Config = loadConfig();
