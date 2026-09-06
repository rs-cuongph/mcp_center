import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    server: "src/server.ts",
    "cli/auth-login": "src/cli/auth-login.ts",
    "cli/auth-check": "src/cli/auth-check.ts",
    "cli/auth-clear": "src/cli/auth-clear.ts",
  },
  format: ["esm"],
  target: "node20",
  platform: "node",
  bundle: true,
  noExternal: [/@cuongph\.dev\/mcp-.*/],
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  sourcemap: true,
});
