import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolDeleted, toolPlan, toolSuccess, withToolError } from "../mcp-response.js";

const routeFirewallRuleSchema = z.object({
  localCIDR: z
    .string()
    .optional()
    .describe('CIDR within the routableCIDRs this rule applies to. Use "0.0.0.0/0" for all IP addresses.'),
  protocol: z
    .enum(["ANY", "TCP", "UDP", "ICMP"])
    .describe("Protocol allowed by this route firewall rule"),
  description: z.string().optional().describe("Human-readable rule description"),
  allowedRoleID: z
    .string()
    .nullable()
    .optional()
    .describe("Role ID allowed by this rule. If omitted, all roles are included."),
  allowedTags: z
    .array(z.string())
    .optional()
    .describe("Tags allowed by this rule. Empty list allows all tags."),
  portRange: z
    .object({
      from: z.number().min(1).max(65535),
      to: z.number().min(1).max(65535),
    })
    .nullable()
    .optional()
    .describe("Allowed port range. Null or omitted means all ports."),
});

const routableCIDRsSchema = z
  .record(z.string(), z.object({ install: z.boolean().optional() }))
  .describe("Map of IPv4 CIDR ranges to install settings, e.g. {\"192.168.14.0/26\":{\"install\":true}}");

export function registerRouteTools(server: McpServer, api: DefinedAPIClient) {
  server.tool(
    "list-routes",
    "List unsafe routes (routes that extend overlay network access to non-Nebula subnets). These allow Nebula hosts to reach networks behind a specific host.",
    {
      networkID: z
        .string()
        .optional()
        .describe("Filter by network ID"),
      hostID: z
        .string()
        .optional()
        .describe("Filter by the host that serves this route"),
      cursor: z.string().optional().describe("Pagination cursor"),
      pageSize: z.number().optional().describe("Results per page"),
    },
    async (params) => withToolError("list-routes", async () => {
      const result = await api.listRoutes(params);
      return toolSuccess("list-routes", result);
    })
  );

  server.tool(
    "get-route",
    "Get details about a specific unsafe route.",
    {
      routeID: z.string().describe("The route ID to look up"),
    },
    async ({ routeID }) => withToolError("get-route", async () => {
      const result = await api.getRoute(routeID);
      return toolSuccess("get-route", result, {
        resource: { type: "route", id: routeID },
      });
    })
  );

  server.tool(
    "create-route",
    "Create an unsafe route to extend overlay network access to non-Nebula subnets behind a router host. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      name: z.string().describe("Name of the new route"),
      routerHostID: z
        .string()
        .optional()
        .describe("The host ID that will serve as the router for this route"),
      routableCIDRs: routableCIDRsSchema.optional(),
      firewallRules: z
        .array(routeFirewallRuleSchema)
        .optional()
        .describe("Route firewall rules"),
      networkID: z.string().optional().describe("Deprecated compatibility field; the current route API does not require networkID"),
      hostID: z
        .string()
        .optional()
        .describe("The host ID that will serve as the gateway for this route"),
      network: z
        .string()
        .optional()
        .describe(
          "Deprecated compatibility field for a single target CIDR subnet, e.g. '10.0.0.0/24'. Prefer routableCIDRs."
        ),
      description: z
        .string()
        .optional()
        .describe("Human-readable description of this route"),
      enabled: z
        .boolean()
        .optional()
        .describe("Whether the route is enabled (default true)"),
      dryRun: z.boolean().optional().describe("Preview the route creation without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to create the route"),
    },
    async ({ dryRun, confirm, ...params }) => withToolError("create-route", async () => {
      if (dryRun || !confirm) {
        return toolPlan(
          "create-route",
          {
            action: "create unsafe route",
            would_change: [
              {
                type: "created",
                resource: { type: "route", id: "pending" },
                name: params.name,
                routerHostID: params.routerHostID ?? params.hostID,
                routableCIDRs: params.routableCIDRs ?? (params.network ? { [params.network]: { install: params.enabled ?? true } } : undefined),
              },
            ],
            required_confirmation: true,
          },
          ["Unsafe routes extend overlay access to non-Nebula subnets."]
        );
      }
      const result = await api.createRoute(params);
      const routeID = result.data?.id;
      return toolSuccess("create-route", result, {
        resource: routeID ? { type: "route", id: routeID } : undefined,
        sideEffects: routeID
          ? [{ type: "created", resource: { type: "route", id: routeID } }]
          : [],
      });
    })
  );

  server.tool(
    "update-route",
    "Update an unsafe route. This is a full replacement: omitted route fields, including firewall rules, may be reset or removed by the API. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      routeID: z.string().describe("The route ID to update"),
      name: z.string().describe("Updated route name"),
      description: z.string().optional().describe("Updated route description"),
      routerHostID: z.string().optional().describe("Updated router host ID"),
      routableCIDRs: routableCIDRsSchema.optional(),
      firewallRules: z
        .array(routeFirewallRuleSchema)
        .optional()
        .describe("Complete replacement route firewall rule list"),
      dryRun: z.boolean().optional().describe("Preview the route update without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to update the route"),
    },
    async ({ routeID, dryRun, confirm, ...data }) => withToolError("update-route", async () => {
      if (dryRun || !confirm) {
        return toolPlan(
          "update-route",
          {
            action: "update unsafe route",
            resource: { type: "route", id: routeID },
            would_change: [
              {
                type: "updated",
                resource: { type: "route", id: routeID },
                fields: Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined),
              },
            ],
            required_confirmation: true,
          },
          ["Route updates are full replacements; include all existing routable CIDRs and firewall rules you want to keep."]
        );
      }
      const result = await api.updateRoute(routeID, data);
      return toolSuccess("update-route", result, {
        resource: { type: "route", id: routeID },
        sideEffects: [{ type: "updated", resource: { type: "route", id: routeID } }],
      });
    })
  );

  server.tool(
    "delete-route",
    "Delete an unsafe route, removing the ability for overlay hosts to reach the target subnet through the gateway host. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      routeID: z.string().describe("The route ID to delete"),
      dryRun: z.boolean().optional().describe("Preview the route deletion without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to delete the route"),
    },
    async ({ routeID, dryRun, confirm }) => withToolError("delete-route", async () => {
      if (dryRun || !confirm) {
        return toolPlan("delete-route", {
          action: "delete unsafe route",
          resource: { type: "route", id: routeID },
          would_change: [{ type: "deleted", resource: { type: "route", id: routeID } }],
          required_confirmation: true,
        });
      }
      await api.deleteRoute(routeID);
      return toolDeleted("delete-route", { type: "route", id: routeID });
    })
  );
}
