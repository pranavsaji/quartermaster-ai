import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConfigError, loadConfig } from "./config";
import { contextFromConfig, createMcpServer } from "./server";

/**
 * stdio entry point. stdout carries the MCP protocol, so diagnostics go to stderr, and they never
 * include the password or session cookie.
 */
async function main() {
  const config = loadConfig();
  const server = createMcpServer(contextFromConfig(config));
  await server.connect(new StdioServerTransport());
  process.stderr.write(`[quartermaster-mcp] ready; API ${config.apiUrl}\n`);
  const shutdown = () => {
    void server.close().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err: unknown) => {
  const message = err instanceof ConfigError ? err.message : "Could not start the Quartermaster MCP server.";
  process.stderr.write(`[quartermaster-mcp] ${message}\n`);
  process.exit(1);
});
