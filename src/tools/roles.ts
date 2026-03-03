import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";

const firewallRuleSchema = z.object({
  protocol: z
    .string()
    .describe("Protocol: 'any', 'tcp', 'udp', or 'icmp'"),
  port: z
    .string()
    .optional()
    .describe("Port or port range (e.g. '443', '8000-9000'). Omit for 'any' or 'icmp'."),
  allowedRoleID: z
    .string()
    .optional()
    .describe(
      "Role ID that is allowed access. If omitted, allows access from any role."
    ),
  description: z
    .string()
    .optional()
    .describe("Human-readable description of this rule"),
});

export function registerRoleTools(server: McpServer, api: DefinedAPIClient) {
  server.tool(
    "list-roles",
    "List all roles defined in your Defined Networking account. Roles control host identity and firewall access rules.",
    {
      cursor: z.string().optional().describe("Pagination cursor"),
      pageSize: z.number().optional().describe("Results per page"),
    },
    async ({ cursor, pageSize }) => {
      const result = await api.listRoles({ cursor, pageSize });
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
    "get-role",
    "Get detailed information about a specific role including its firewall rules.",
    {
      roleID: z.string().describe("The role ID to look up"),
    },
    async ({ roleID }) => {
      const result = await api.getRole(roleID);
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
    "create-role",
    "Create a new role for organizing hosts and defining firewall rules. Roles are the primary mechanism for controlling access between hosts in a Nebula network. New roles default to allowing only ICMP (ping) traffic.",
    {
      name: z
        .string()
        .describe(
          "Name for the role (e.g. 'Web Server', 'Database', 'Admin Endpoint')"
        ),
      description: z
        .string()
        .optional()
        .describe("Description of the role's purpose"),
      firewallRules: z
        .array(firewallRuleSchema)
        .optional()
        .describe("Initial inbound firewall rules for this role"),
    },
    async (params) => {
      const result = await api.createRole(params);
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
    "update-role",
    "Update a role's name, description, or firewall rules. Changes to firewall rules are automatically pushed to all hosts with this role.",
    {
      roleID: z.string().describe("The role ID to update"),
      name: z.string().optional().describe("Updated role name"),
      description: z.string().optional().describe("Updated description"),
      firewallRules: z
        .array(firewallRuleSchema)
        .optional()
        .describe("Complete replacement set of firewall rules"),
    },
    async ({ roleID, ...data }) => {
      const result = await api.updateRole(roleID, data);
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
    "delete-role",
    "Delete a role. Hosts assigned to this role will need to be reassigned.",
    {
      roleID: z.string().describe("The role ID to delete"),
    },
    async ({ roleID }) => {
      await api.deleteRole(roleID);
      return {
        content: [
          {
            type: "text" as const,
            text: `Role ${roleID} has been deleted successfully.`,
          },
        ],
      };
    }
  );

  server.tool(
    "get-firewall-rules",
    "Get the current inbound firewall rules for a specific role. Firewall rules control which other roles can communicate with hosts in this role, on which protocols and ports.",
    {
      roleID: z
        .string()
        .describe("The role ID to get firewall rules for"),
    },
    async ({ roleID }) => {
      const result = await api.getRoleFirewallRules(roleID);
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
    "update-firewall-rules",
    "Replace all inbound firewall rules for a role. This is a full replacement — provide the complete desired set of rules. Changes are automatically distributed to all affected hosts. Rules define inbound access by protocol, port, and source role.",
    {
      roleID: z
        .string()
        .describe("The role ID to update firewall rules for"),
      firewallRules: z
        .array(firewallRuleSchema)
        .describe(
          "Complete set of firewall rules to apply (replaces existing rules)"
        ),
    },
    async ({ roleID, firewallRules }) => {
      const result = await api.updateRoleFirewallRules(roleID, firewallRules);
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
