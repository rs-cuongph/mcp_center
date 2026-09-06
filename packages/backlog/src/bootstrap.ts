import { setupBootstrap } from "@cuongph.dev/mcp-core";

const boot = setupBootstrap({
  moduleUrl: import.meta.url,
  localDirName: "downloads",
  homeDirName: "backlog-mcp",
});

export const projectRoot = boot.projectRoot;
export const fromRoot = boot.fromRoot;
export const defaultDownloadsDir = boot.downloadsDir;
