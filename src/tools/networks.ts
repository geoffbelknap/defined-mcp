import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolDeleted, toolPlan, toolSuccess, withToolError } from "../mcp-response.js";

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

  server.tool(
    "update-network",
    "Update a network's name, description, and lighthouse relay behavior. This is a reset-style update: properties not provided by the API request may reset to defaults. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      networkID: z.string().describe("The network ID to update"),
      name: z.string().describe("Updated network name"),
      description: z.string().optional().describe("Updated network description"),
      lighthousesAsRelays: z.boolean().describe("Whether lighthouses in this network should also act as relays"),
      dryRun: z.boolean().optional().describe("Preview the network update without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to update the network"),
    },
    async ({ networkID, dryRun, confirm, ...data }) => withToolError("update-network", async () => {
      if (dryRun || !confirm) {
        return toolPlan(
          "update-network",
          {
            action: "update network",
            resource: { type: "network", id: networkID },
            would_change: [
              {
                type: "updated",
                resource: { type: "network", id: networkID },
                fields: Object.keys(data),
              },
            ],
            required_confirmation: true,
          },
          ["Network updates are full API updates; include every current value you want to keep."]
        );
      }
      const result = await api.updateNetwork(networkID, data);
      return toolSuccess("update-network", result, {
        resource: { type: "network", id: networkID },
        sideEffects: [{ type: "updated", resource: { type: "network", id: networkID } }],
      });
    })
  );

  server.tool(
    "delete-network",
    "Delete an empty network. The network must have no hosts before it can be deleted. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      networkID: z.string().describe("The network ID to delete"),
      dryRun: z.boolean().optional().describe("Preview the network deletion without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to delete the network"),
    },
    async ({ networkID, dryRun, confirm }) => withToolError("delete-network", async () => {
      if (dryRun || !confirm) {
        return toolPlan("delete-network", {
          action: "delete network",
          resource: { type: "network", id: networkID },
          would_change: [{ type: "deleted", resource: { type: "network", id: networkID } }],
          required_confirmation: true,
        });
      }
      await api.deleteNetwork(networkID);
      return toolDeleted("delete-network", { type: "network", id: networkID });
    })
  );

  server.tool(
    "add-network-cidr",
    "Add an IPv4 CIDR to an existing IPv6-only network, making it dual-stack. Each network supports at most one IPv4 CIDR. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      networkID: z.string().describe("The network ID to modify"),
      cidr: z.string().describe("The IPv4 CIDR to add, e.g. 192.168.4.0/22"),
      dryRun: z.boolean().optional().describe("Preview the CIDR addition without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to add the CIDR"),
    },
    async ({ networkID, cidr, dryRun, confirm }) => withToolError("add-network-cidr", async () => {
      if (dryRun || !confirm) {
        return toolPlan("add-network-cidr", {
          action: "add network cidr",
          resource: { type: "network", id: networkID },
          would_change: [
            {
              type: "cidr_added",
              resource: { type: "network", id: networkID },
              cidr,
            },
          ],
          required_confirmation: true,
        });
      }
      const result = await api.addNetworkCIDR(networkID, cidr);
      return toolSuccess("add-network-cidr", result, {
        resource: { type: "network", id: networkID },
        sideEffects: [{ type: "cidr_added", resource: { type: "network", id: networkID }, cidr }],
      });
    })
  );
}
