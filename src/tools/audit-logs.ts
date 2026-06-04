import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolSuccess, withToolError } from "../mcp-response.js";

export function registerAuditLogTools(
  server: McpServer,
  api: DefinedAPIClient
) {
  server.tool(
    "list-audit-logs",
    "List audit log entries for your Defined Networking account. Audit logs track all administrative actions including host creation, deletion, role changes, firewall updates, and more. Useful for security monitoring and compliance.",
    {
      targetType: z
        .string()
        .optional()
        .describe(
          "Filter by target type (e.g. 'host', 'role', 'network')"
        ),
      targetID: z
        .string()
        .optional()
        .describe("Filter by specific target ID"),
      cursor: z.string().optional().describe("Pagination cursor"),
      pageSize: z.number().optional().describe("Results per page"),
    },
    async (params) => withToolError("list-audit-logs", async () => {
      const result = await api.listAuditLogs(params);
      return toolSuccess("list-audit-logs", result);
    })
  );
}
