import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";

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
    async (params) => {
      const result = await api.listRoutes(params);
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
    "get-route",
    "Get details about a specific unsafe route.",
    {
      routeID: z.string().describe("The route ID to look up"),
    },
    async ({ routeID }) => {
      const result = await api.getRoute(routeID);
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
    "create-route",
    "Create an unsafe route to extend overlay network access to a non-Nebula subnet behind a specific host. This allows Nebula hosts to reach traditional networks through a gateway host.",
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
    },
    async (params) => {
      const result = await api.createRoute(params);
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
    "delete-route",
    "Delete an unsafe route, removing the ability for overlay hosts to reach the target subnet through the gateway host.",
    {
      routeID: z.string().describe("The route ID to delete"),
    },
    async ({ routeID }) => {
      await api.deleteRoute(routeID);
      return {
        content: [
          {
            type: "text" as const,
            text: `Route ${routeID} has been deleted successfully.`,
          },
        ],
      };
    }
  );
}
