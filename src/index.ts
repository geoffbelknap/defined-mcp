#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { DefinedAPIClient } from "./api-client.js";
import {
  registerNetworkTools,
  registerHostTools,
  registerEnrollmentTools,
  registerRoleTools,
  registerRouteTools,
  registerTagTools,
  registerAuditLogTools,
  registerDownloadTools,
} from "./tools/index.js";
import { registerPrompts } from "./prompts.js";
import { registerResources } from "./resources.js";

async function main() {
  const config = loadConfig();
  const api = new DefinedAPIClient(config);

  const server = new McpServer({
    name: "defined-nebula",
    version: "1.0.0",
  });

  // Register all tools
  registerNetworkTools(server, api);
  registerHostTools(server, api);
  registerEnrollmentTools(server, api);
  registerRoleTools(server, api);
  registerRouteTools(server, api);
  registerTagTools(server, api);
  registerAuditLogTools(server, api);
  registerDownloadTools(server, api);

  // Register prompts
  registerPrompts(server);

  // Register resources
  registerResources(server, api);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP JSON-RPC)
  console.error("Defined Networking MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
