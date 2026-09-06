import { runInteractiveLogin } from "./browser.js";
import { clearSession, readSession } from "./session-store.js";
import { isMcpError } from "@cuongph.dev/mcp-core";

export interface AuthCliConfig {
  appName: string;          // e.g. "Jira" — used in messages
  loginCommand: string;     // e.g. "jira-auth-login" — used in hints
  baseUrl: string;
  sessionFilePath: string;
  validatePath: string;
  headless: boolean;
  browser: "chromium" | "firefox" | "webkit";
  validate: (sessionFilePath: string, baseUrl: string, validatePath: string) => Promise<unknown>;
}

export function makeAuthCli(cfg: AuthCliConfig): {
  login: () => Promise<void>;
  check: () => Promise<void>;
  clear: () => Promise<void>;
} {
  return {
    async login() {
      try {
        await runInteractiveLogin({
          baseUrl: cfg.baseUrl,
          sessionFilePath: cfg.sessionFilePath,
          headless: cfg.headless,
          browser: cfg.browser,
          appLabel: cfg.appName,
          validatePath: cfg.validatePath,
        });
        console.log("🔍 Validating session...");
        try {
          await cfg.validate(cfg.sessionFilePath, cfg.baseUrl, cfg.validatePath);
          console.log(`✅ Session is valid. You are authenticated with ${cfg.appName}.\n`);
        } catch (validationErr: unknown) {
          if (isMcpError(validationErr)) {
            console.warn(`⚠️  Post-login validation failed: [${validationErr.code}] ${validationErr.message}`);
            console.warn("   The session was saved but may not be usable yet. Try again.\n");
          } else {
            throw validationErr;
          }
        }
      } catch (err: unknown) {
        if (isMcpError(err)) {
          console.error(`\n❌ [${err.code}] ${err.message}\n`);
        } else {
          console.error("\n❌ Unexpected error during login:", err);
        }
        process.exit(1);
      }
    },

    async check() {
      try {
        const session = await readSession(cfg.sessionFilePath);
        if (!session) {
          console.log("❌ No session found.");
          console.log(`   Expected file: ${cfg.sessionFilePath}`);
          console.log(`   Run: ${cfg.loginCommand}\n`);
          process.exit(1);
        }

        console.log(`📄 Session file   : ${cfg.sessionFilePath}`);
        console.log(`   Saved at       : ${session.savedAt ?? "unknown"}`);
        console.log(`   Base URL       : ${session.baseUrl ?? cfg.baseUrl}`);
        console.log(`   Cookies stored : ${session.storageState.cookies?.length ?? 0}`);
        console.log(`\n🔍 Validating against ${cfg.baseUrl}${cfg.validatePath} ...`);

        await cfg.validate(cfg.sessionFilePath, cfg.baseUrl, cfg.validatePath);
        console.log(`✅ Session is valid. You are authenticated with ${cfg.appName}.\n`);
        process.exit(0);
      } catch (err: unknown) {
        if (isMcpError(err)) {
          console.error(`\n❌ [${err.code}] ${err.message}`);
          console.error(`   Run: ${cfg.loginCommand}\n`);
        } else {
          console.error("\n❌ Unexpected error:", err);
        }
        process.exit(1);
      }
    },

    async clear() {
      try {
        await clearSession(cfg.sessionFilePath);
        console.log(`🗑️  Session cleared: ${cfg.sessionFilePath}\n`);
        process.exit(0);
      } catch (err: unknown) {
        console.error("❌ Failed to clear session:", err);
        process.exit(1);
      }
    },
  };
}
