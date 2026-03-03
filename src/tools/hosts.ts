import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";

export function registerHostTools(server: McpServer, api: DefinedAPIClient) {
  server.tool(
    "list-hosts",
    "List hosts, lighthouses, and relays in your Nebula overlay networks. Supports filtering by network, role, type, and status.",
    {
      networkID: z
        .string()
        .optional()
        .describe("Filter by network ID"),
      roleID: z.string().optional().describe("Filter by role ID"),
      isLighthouse: z
        .boolean()
        .optional()
        .describe("Filter for lighthouse nodes only"),
      isRelay: z
        .boolean()
        .optional()
        .describe("Filter for relay nodes only"),
      isBlocked: z
        .boolean()
        .optional()
        .describe("Filter for blocked/unblocked hosts"),
      name: z.string().optional().describe("Filter by host name"),
      ipAddress: z
        .string()
        .optional()
        .describe("Filter by overlay IP address"),
      cursor: z.string().optional().describe("Pagination cursor"),
      pageSize: z.number().optional().describe("Results per page"),
    },
    async (params) => {
      const result = await api.listHosts(params);
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

  server.tool(
    "get-host",
    "Get detailed information about a specific host including its overlay IP, role, lighthouse/relay status, and configuration.",
    {
      hostID: z.string().describe("The host ID to look up"),
    },
    async ({ hostID }) => {
      const result = await api.getHost(hostID);
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

  server.tool(
    "create-host",
    "Create a new host in a Nebula overlay network. You can specify the role, whether it's a lighthouse or relay, static addresses, and tags.",
    {
      networkID: z
        .string()
        .describe("The network ID to add the host to"),
      name: z
        .string()
        .describe("A descriptive name for the host (e.g. 'web-server-1')"),
      roleID: z
        .string()
        .optional()
        .describe("The role ID to assign to the host"),
      ipAddress: z
        .string()
        .optional()
        .describe(
          "Specific overlay IP address to assign (auto-assigned if omitted)"
        ),
      staticAddresses: z
        .array(z.string())
        .optional()
        .describe(
          "Static public IP:port addresses for this host (required for lighthouses)"
        ),
      listenPort: z
        .number()
        .optional()
        .describe("UDP listen port for Nebula (default 4242)"),
      isLighthouse: z
        .boolean()
        .optional()
        .describe("Whether this host should be a lighthouse node"),
      isRelay: z
        .boolean()
        .optional()
        .describe("Whether this host should be a relay node"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags to apply to the host"),
    },
    async (params) => {
      const result = await api.createHost(params);
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

  server.tool(
    "update-host",
    "Update an existing host's name, role, static addresses, listen port, or tags.",
    {
      hostID: z.string().describe("The host ID to update"),
      name: z.string().optional().describe("New name for the host"),
      roleID: z.string().optional().describe("New role ID to assign"),
      staticAddresses: z
        .array(z.string())
        .optional()
        .describe("Updated static addresses"),
      listenPort: z
        .number()
        .optional()
        .describe("Updated listen port"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Updated tags"),
    },
    async ({ hostID, ...data }) => {
      const result = await api.updateHost(hostID, data);
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

  server.tool(
    "delete-host",
    "Permanently delete a host from the Nebula overlay network. This removes the host and invalidates its certificates.",
    {
      hostID: z.string().describe("The host ID to delete"),
    },
    async ({ hostID }) => {
      await api.deleteHost(hostID);
      return {
        content: [
          {
            type: "text" as const,
            text: `Host ${hostID} has been deleted successfully.`,
          },
        ],
      };
    }
  );

  server.tool(
    "block-host",
    "Block a host, preventing it from communicating on the Nebula overlay network. The host's certificate will be added to the blocklist.",
    {
      hostID: z.string().describe("The host ID to block"),
    },
    async ({ hostID }) => {
      const result = await api.blockHost(hostID);
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

  server.tool(
    "unblock-host",
    "Unblock a previously blocked host, restoring its ability to communicate on the Nebula overlay network.",
    {
      hostID: z.string().describe("The host ID to unblock"),
    },
    async ({ hostID }) => {
      const result = await api.unblockHost(hostID);
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
