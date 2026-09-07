import { defaultDownloadsDir } from "./bootstrap.js";
import { z } from "zod";
import { parseEnv } from "@cuongph.dev/mcp-core";

// ---------------------------------------------------------------------------
// Schema — only user-facing variables are read from the environment.
// Internal/infra settings are hardcoded below.
// ---------------------------------------------------------------------------

const schema = z.object({
  JIRA_BASE_URL: z
    .string()
    .url("JIRA_BASE_URL must be a valid URL (e.g. https://jira.yourcompany.com)"),

  JIRA_EMAIL: z.string().min(1, "JIRA_EMAIL is required"),
  JIRA_PASSWORD: z.string().min(1, "JIRA_PASSWORD is required"),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
});

// ---------------------------------------------------------------------------
// Hardcoded defaults — not configurable via .env
// ---------------------------------------------------------------------------

const DEFAULTS = {
  JIRA_VALIDATE_PATH: "/rest/api/2/myself",
  ATTACHMENT_WORKSPACE: defaultDownloadsDir,                   // absolute path
} as const;

export type Config = z.infer<typeof schema> & typeof DEFAULTS;

// ---------------------------------------------------------------------------
// Parse once at startup — callers import `config` directly
// ---------------------------------------------------------------------------

function loadConfig(): Config {
  const data = parseEnv(schema);
  return {
    ...DEFAULTS,
    ...data,
  };
}

export const config: Config = loadConfig();
