import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolDeleted, toolPlan, toolSuccess, withToolError } from "../mcp-response.js";

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
    "Create an unsafe route to extend overlay network access to a non-Nebula subnet behind a specific host. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      networkID: z.string().describe("The network ID this route belongs to"),
      hostID: z
        .string()
        .describe("The host ID that will serve as the gateway for this route"),
      network: z
        .string()
        .describe(
          "The target CIDR subnet to route through this host (e.g. '10.0.0.0/24')"
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
                networkID: params.networkID,
                hostID: params.hostID,
                network: params.network,
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
