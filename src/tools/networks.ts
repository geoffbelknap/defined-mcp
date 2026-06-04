import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolSuccess, withToolError } from "../mcp-response.js";

export function registerNetworkTools(
  server: McpServer,
  api: DefinedAPIClient
) {
  server.tool(
    "list-networks",
    "List all Nebula overlay networks in your Defined Networking account. Returns network IDs, names, CIDRs, and host counts.",
    {
      cursor: z.string().optional().describe("Pagination cursor for next page"),
      pageSize: z
        .number()
        .optional()
        .describe("Number of results per page (default 25)"),
    },
    async ({ cursor, pageSize }) => withToolError("list-networks", async () => {
      const result = await api.listNetworks({ cursor, pageSize });
      return toolSuccess("list-networks", result);
    })
  );

  server.tool(
    "get-network",
    "Get detailed information about a specific Nebula overlay network including its CIDR, signing CA, and host/lighthouse counts.",
    {
      networkID: z
        .string()
        .describe(
          "The network ID (e.g. network-ABCDEFG1234567890HIJKLMNOP)"
        ),
    },
    async ({ networkID }) => withToolError("get-network", async () => {
      const result = await api.getNetwork(networkID);
      return toolSuccess("get-network", result, {
        resource: { type: "network", id: networkID },
      });
    })
  );
}
