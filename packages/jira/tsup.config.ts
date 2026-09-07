import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    server: "src/server.ts",
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
