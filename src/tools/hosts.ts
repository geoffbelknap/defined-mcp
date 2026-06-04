import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolDeleted, toolPlan, toolSuccess, withToolError } from "../mcp-response.js";

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
        .describe("Filter by overlay IP address. Deprecated for v2 API; prefer tags/network/role filters."),
      cursor: z.string().optional().describe("Pagination cursor"),
      pageSize: z.number().optional().describe("Results per page"),
    },
    async (params) => withToolError("list-hosts", async () => {
      const result = await api.listHosts(params);
      return toolSuccess("list-hosts", result);
    })
  );

  server.tool(
    "get-host",
    "Get detailed information about a specific host including its overlay IP, role, lighthouse/relay status, and configuration.",
    {
      hostID: z.string().describe("The host ID to look up"),
    },
    async ({ hostID }) => withToolError("get-host", async () => {
      const result = await api.getHost(hostID);
      return toolSuccess("get-host", result, {
        resource: { type: "host", id: hostID },
      });
    })
  );

  server.tool(
    "create-host",
    "Create a new host in a Nebula overlay network. You can specify the role, whether it's a lighthouse or relay, static addresses, and tags. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
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
        .describe("Specific overlay IP address to assign (converted to ipAddresses)"),
      ipAddresses: z
        .array(z.string())
        .optional()
        .describe("Specific overlay IP addresses or CIDR prefixes to assign"),
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
      dryRun: z.boolean().optional().describe("Preview the host creation without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to create the host"),
    },
    async ({ dryRun, confirm, ...params }) => withToolError("create-host", async () => {
      if (dryRun || !confirm) {
        return toolPlan("create-host", {
          action: "create host",
          resource: { type: "host", id: params.name },
          would_change: [{ type: "created", resource: { type: "host", id: params.name } }],
          required_confirmation: true,
        });
      }
      const result = await api.createHost(params);
      const hostID = result.data?.id;
      return toolSuccess("create-host", result, {
        resource: hostID ? { type: "host", id: hostID } : undefined,
        sideEffects: hostID
          ? [{ type: "created", resource: { type: "host", id: hostID } }]
          : [],
      });
    })
  );

  server.tool(
    "update-host",
    "Update an existing host's name, role, static addresses, listen port, or tags. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
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
      dryRun: z.boolean().optional().describe("Preview the host update without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to update the host"),
    },
    async ({ hostID, dryRun, confirm, ...data }) => withToolError("update-host", async () => {
      if (dryRun || !confirm) {
        return toolPlan("update-host", {
          action: "update host",
          resource: { type: "host", id: hostID },
          would_change: [
            {
              type: "updated",
              resource: { type: "host", id: hostID },
              fields: Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined),
            },
          ],
          required_confirmation: true,
        });
      }
      const result = await api.updateHost(hostID, data);
      return toolSuccess("update-host", result, {
        resource: { type: "host", id: hostID },
        sideEffects: [{ type: "updated", resource: { type: "host", id: hostID } }],
      });
    })
  );

  server.tool(
    "delete-host",
    "Permanently delete a host from the Nebula overlay network. This removes the host and invalidates its certificates. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      hostID: z.string().describe("The host ID to delete"),
      dryRun: z.boolean().optional().describe("Preview the deletion without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to execute the deletion"),
    },
    async ({ hostID, dryRun, confirm }) => withToolError("delete-host", async () => {
      if (dryRun || !confirm) {
        return toolPlan("delete-host", {
          action: "delete host",
          resource: { type: "host", id: hostID },
          would_change: [{ type: "deleted", resource: { type: "host", id: hostID } }],
          required_confirmation: true,
        });
      }
      await api.deleteHost(hostID);
      return toolDeleted("delete-host", { type: "host", id: hostID });
    })
  );

  server.tool(
    "block-host",
    "Block a host, preventing it from communicating on the Nebula overlay network. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      hostID: z.string().describe("The host ID to block"),
      dryRun: z.boolean().optional().describe("Preview the block without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to execute the block"),
    },
    async ({ hostID, dryRun, confirm }) => withToolError("block-host", async () => {
      if (dryRun || !confirm) {
        return toolPlan("block-host", {
          action: "block host",
          resource: { type: "host", id: hostID },
          would_change: [{ type: "blocked", resource: { type: "host", id: hostID } }],
          required_confirmation: true,
        });
      }
      const result = await api.blockHost(hostID);
      return toolSuccess("block-host", result, {
        resource: { type: "host", id: hostID },
        sideEffects: [{ type: "blocked", resource: { type: "host", id: hostID } }],
      });
    })
  );

  server.tool(
    "unblock-host",
    "Unblock a previously blocked host, restoring its ability to communicate on the Nebula overlay network. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      hostID: z.string().describe("The host ID to unblock"),
      dryRun: z.boolean().optional().describe("Preview the unblock without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to execute the unblock"),
    },
    async ({ hostID, dryRun, confirm }) => withToolError("unblock-host", async () => {
      if (dryRun || !confirm) {
        return toolPlan("unblock-host", {
          action: "unblock host",
          resource: { type: "host", id: hostID },
          would_change: [{ type: "unblocked", resource: { type: "host", id: hostID } }],
          required_confirmation: true,
        });
      }
      const result = await api.unblockHost(hostID);
      return toolSuccess("unblock-host", result, {
        resource: { type: "host", id: hostID },
        sideEffects: [{ type: "unblocked", resource: { type: "host", id: hostID } }],
      });
    })
  );
}
