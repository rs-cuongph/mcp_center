import "./bootstrap.js";
import { z } from "zod";
import { parseEnv } from "@cuongph.dev/mcp-core";

// ---------------------------------------------------------------------------
// Schema — only user-facing variables are read from the environment.
// Internal/infra settings are hardcoded below.
// ---------------------------------------------------------------------------

const schema = z.object({
  GITLAB_URL: z
    .string()
    .url("GITLAB_URL must be a valid URL (e.g. https://gitlab.yourcompany.com)"),

  GITLAB_TOKEN: z
    .string()
    .min(1, "GITLAB_TOKEN must not be empty"),

  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
});

// ---------------------------------------------------------------------------
// Hardcoded defaults — not configurable via .env
// ---------------------------------------------------------------------------

const DEFAULTS = {
  GITLAB_VALIDATE_PATH: "/api/v4/user",
} as const;

export type Config = z.infer<typeof schema> & typeof DEFAULTS;

// ---------------------------------------------------------------------------
// Parse once at startup — callers import `config` directly
// ---------------------------------------------------------------------------

function loadConfig(): Config {
  return { ...DEFAULTS, ...parseEnv(schema) };
}

export const config: Config = loadConfig();
