import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export async function runStdioServer(opts: {
  name: string;
  version: string;
  register: (server: McpServer) => void;
}): Promise<void> {
  const server = new McpServer({ name: opts.name, version: opts.version });
  opts.register(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${opts.name} v${opts.version} started (stdio)\n`);

  const shutdown = async (): Promise<void> => {
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
