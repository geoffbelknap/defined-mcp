import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolDeleted, toolPlan, toolSuccess, withToolError } from "../mcp-response.js";

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
  allowedTag: z
    .string()
    .optional()
    .describe(
      "Tag (key:value) that is allowed access (e.g. 'env:production'). Alternative to allowedRoleID for tag-based rules."
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
    async ({ cursor, pageSize }) => withToolError("list-roles", async () => {
      const result = await api.listRoles({ cursor, pageSize });
      return toolSuccess("list-roles", result);
    })
  );

  server.tool(
    "get-role",
    "Get detailed information about a specific role including its firewall rules.",
    {
      roleID: z.string().describe("The role ID to look up"),
    },
    async ({ roleID }) => withToolError("get-role", async () => {
      const result = await api.getRole(roleID);
      return toolSuccess("get-role", result, {
        resource: { type: "role", id: roleID },
      });
    })
  );

  server.tool(
    "create-role",
    "Create a new role for organizing hosts and defining firewall rules. Roles are the primary mechanism for controlling access between hosts in a Nebula network. New roles default to allowing only ICMP (ping) traffic. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
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
      dryRun: z.boolean().optional().describe("Preview the role creation without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to create the role"),
    },
    async ({ dryRun, confirm, ...params }) => withToolError("create-role", async () => {
      if (dryRun || !confirm) {
        return toolPlan("create-role", {
          action: "create role",
          resource: { type: "role", id: params.name },
          would_change: [{ type: "created", resource: { type: "role", id: params.name } }],
          required_confirmation: true,
        });
      }
      const result = await api.createRole(params);
      const roleID = result.data?.id;
      return toolSuccess("create-role", result, {
        resource: roleID ? { type: "role", id: roleID } : undefined,
        sideEffects: roleID
          ? [{ type: "created", resource: { type: "role", id: roleID } }]
          : [],
      });
    })
  );

  server.tool(
    "update-role",
    "Update a role's name, description, or firewall rules. Changes to firewall rules are automatically pushed to all hosts with this role. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      roleID: z.string().describe("The role ID to update"),
      name: z.string().optional().describe("Updated role name"),
      description: z.string().optional().describe("Updated description"),
      firewallRules: z
        .array(firewallRuleSchema)
        .optional()
        .describe("Complete replacement set of firewall rules"),
      dryRun: z.boolean().optional().describe("Preview the role update without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to update the role"),
    },
    async ({ roleID, dryRun, confirm, ...data }) => withToolError("update-role", async () => {
      if (dryRun || !confirm) {
        return toolPlan("update-role", {
          action: "update role",
          resource: { type: "role", id: roleID },
          would_change: [
            {
              type: "updated",
              resource: { type: "role", id: roleID },
              fields: Object.keys(data).filter((key) => data[key as keyof typeof data] !== undefined),
            },
          ],
          required_confirmation: true,
        });
      }
      const result = await api.updateRole(roleID, data);
      return toolSuccess("update-role", result, {
        resource: { type: "role", id: roleID },
        sideEffects: [{ type: "updated", resource: { type: "role", id: roleID } }],
      });
    })
  );

  server.tool(
    "delete-role",
    "Delete a role. Hosts assigned to this role will need to be reassigned. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      roleID: z.string().describe("The role ID to delete"),
      dryRun: z.boolean().optional().describe("Preview the role deletion without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to delete the role"),
    },
    async ({ roleID, dryRun, confirm }) => withToolError("delete-role", async () => {
      if (dryRun || !confirm) {
        return toolPlan("delete-role", {
          action: "delete role",
          resource: { type: "role", id: roleID },
          would_change: [{ type: "deleted", resource: { type: "role", id: roleID } }],
          required_confirmation: true,
        });
      }
      await api.deleteRole(roleID);
      return toolDeleted("delete-role", { type: "role", id: roleID });
    })
  );

  server.tool(
    "get-firewall-rules",
    "Get the current inbound firewall rules for a specific role. Firewall rules control which other roles can communicate with hosts in this role, on which protocols and ports.",
    {
      roleID: z
        .string()
        .describe("The role ID to get firewall rules for"),
    },
    async ({ roleID }) => withToolError("get-firewall-rules", async () => {
      const result = await api.getRoleFirewallRules(roleID);
      return toolSuccess("get-firewall-rules", result, {
        resource: { type: "role", id: roleID },
      });
    })
  );

  server.tool(
    "update-firewall-rules",
    "Replace all inbound firewall rules for a role. This is a full replacement automatically distributed to affected hosts. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
    {
      roleID: z
        .string()
        .describe("The role ID to update firewall rules for"),
      firewallRules: z
        .array(firewallRuleSchema)
        .describe(
          "Complete set of firewall rules to apply (replaces existing rules)"
        ),
      dryRun: z.boolean().optional().describe("Preview the firewall replacement without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to replace firewall rules"),
    },
    async ({ roleID, firewallRules, dryRun, confirm }) => withToolError("update-firewall-rules", async () => {
      if (dryRun || !confirm) {
        return toolPlan(
          "update-firewall-rules",
          {
            action: "replace firewall rules",
            resource: { type: "role", id: roleID },
            would_change: [
              {
                type: "firewall_rules_replaced",
                resource: { type: "role", id: roleID },
                replacementRuleCount: firewallRules.length,
              },
            ],
            required_confirmation: true,
          },
          ["This operation replaces the full inbound firewall rule set."]
        );
      }
      const result = await api.updateRoleFirewallRules(roleID, firewallRules);
      return toolSuccess("update-firewall-rules", result, {
        resource: { type: "role", id: roleID },
        sideEffects: [
          { type: "firewall_rules_replaced", resource: { type: "role", id: roleID } },
        ],
      });
    })
  );
}
