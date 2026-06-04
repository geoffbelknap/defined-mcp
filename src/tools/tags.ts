import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolDeleted, toolPlan, toolSuccess, withToolError } from "../mcp-response.js";

const configOverrideSchema = z.object({
  key: z.string().describe("Nebula config override key"),
  value: z.unknown().describe("Nebula config override value"),
});

export function registerTagTools(server: McpServer, api: DefinedAPIClient) {
  server.tool(
    "list-tags",
    "List all tags in your Defined Networking account. Tags are key:value pairs applied to hosts for fine-grained firewall rule targeting (e.g. 'env:production', 'region:us-east').",
    {
      cursor: z.string().optional().describe("Pagination cursor"),
      pageSize: z.number().optional().describe("Results per page"),
    },
    async ({ cursor, pageSize }) => withToolError("list-tags", async () => {
      const result = await api.listTags({ cursor, pageSize });
      return toolSuccess("list-tags", result);
    })
  );

  server.tool(
    "get-tag",
    "Get detailed information about a specific tag.",
    {
      tag: z.string().describe("The tag name to look up, e.g. 'env:production'"),
    },
    async ({ tag }) => withToolError("get-tag", async () => {
      const result = await api.getTag(tag);
      return toolSuccess("get-tag", result, {
        resource: { type: "tag", id: tag },
      });
    })
  );

  server.tool(
    "create-tag",
    "Create a new tag for use in host labeling and firewall rules. Tags consist of a key and value separated by a colon (e.g. 'env:production'). Tags can be used in firewall rules to allow fine-grained access control beyond role-based rules. Set dryRun=true to preview without making changes.",
    {
      key: z
        .string()
        .describe("Tag key (e.g. 'env', 'region', 'service', 'owner')"),
      value: z
        .string()
        .describe("Tag value (e.g. 'production', 'us-east-1', 'web', 'engineering')"),
      description: z
        .string()
        .optional()
        .describe("Optional description of the tag"),
      configOverrides: z
        .array(configOverrideSchema)
        .optional()
        .describe("Nebula config overrides associated with the tag"),
      dryRun: z.boolean().optional().describe("Preview the tag creation without changing anything"),
    },
    async ({ dryRun, ...params }) => withToolError("create-tag", async () => {
      const tag = `${params.key}:${params.value}`;
      if (dryRun) {
        return toolPlan("create-tag", {
          action: "create tag",
          resource: { type: "tag", id: tag },
          would_change: [{ type: "created", resource: { type: "tag", id: tag } }],
          execute_with_dry_run_false: true,
        });
      }
      const result = await api.createTag(params);
      const createdTag = result.data?.name ?? tag;
      return toolSuccess("create-tag", result, {
        resource: { type: "tag", id: createdTag },
        sideEffects: [{ type: "created", resource: { type: "tag", id: createdTag } }],
      });
    })
  );

  server.tool(
    "update-tag",
    "Update a tag's description, config overrides, ordering, or route subscriptions.",
    {
      tag: z.string().describe("The tag name to update, e.g. 'env:production'"),
      description: z.string().optional().describe("Updated description"),
      before: z
        .string()
        .optional()
        .describe("Move this tag before another tag name"),
      after: z
        .string()
        .optional()
        .describe("Move this tag after another tag name"),
      routeSubscriptions: z
        .array(z.string())
        .optional()
        .describe("Route IDs to subscribe hosts with this tag to"),
      configOverrides: z
        .array(configOverrideSchema)
        .optional()
        .describe("Nebula config overrides associated with the tag. Pass [] to clear overrides."),
      dryRun: z.boolean().optional().describe("Preview the tag update without changing anything"),
    },
    async ({ tag, dryRun, ...data }) => withToolError("update-tag", async () => {
      if (dryRun) {
        return toolPlan("update-tag", {
          action: "update tag",
          resource: { type: "tag", id: tag },
          would_change: [{ type: "updated", resource: { type: "tag", id: tag } }],
          execute_with_dry_run_false: true,
        });
      }
      const result = await api.updateTag(tag, data);
      return toolSuccess("update-tag", result, {
        resource: { type: "tag", id: tag },
        sideEffects: [{ type: "updated", resource: { type: "tag", id: tag } }],
      });
    })
  );

  server.tool(
    "delete-tag",
    "Delete a tag. Hosts with this tag will have it removed. Set dryRun=true to preview without making changes.",
    {
      tag: z.string().describe("The tag name to delete, e.g. 'env:production'"),
      dryRun: z.boolean().optional().describe("Preview the tag deletion without changing anything"),
    },
    async ({ tag, dryRun }) => withToolError("delete-tag", async () => {
      if (dryRun) {
        return toolPlan("delete-tag", {
          action: "delete tag",
          resource: { type: "tag", id: tag },
          would_change: [{ type: "deleted", resource: { type: "tag", id: tag } }],
          execute_with_dry_run_false: true,
        });
      }
      await api.deleteTag(tag);
      return toolDeleted("delete-tag", { type: "tag", id: tag });
    })
  );
}
