import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";

export function registerDownloadTools(
  server: McpServer,
  api: DefinedAPIClient
) {
  server.tool(
    "list-downloads",
    "List available DNClient and Nebula software downloads with version info and download links for all supported platforms (Linux, macOS, Windows, mobile).",
    {},
    async () => {
      const result = await api.listDownloads();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
