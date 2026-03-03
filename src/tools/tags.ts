import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";

export function registerTagTools(server: McpServer, api: DefinedAPIClient) {
  server.tool(
    "list-tags",
    "List all tags in your Defined Networking account. Tags are key:value pairs applied to hosts for fine-grained firewall rule targeting (e.g. 'env:production', 'region:us-east').",
    {
      cursor: z.string().optional().describe("Pagination cursor"),
      pageSize: z.number().optional().describe("Results per page"),
    },
    async ({ cursor, pageSize }) => {
      const result = await api.listTags({ cursor, pageSize });
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
    "get-tag",
    "Get detailed information about a specific tag.",
    {
      tagID: z.string().describe("The tag ID to look up"),
    },
    async ({ tagID }) => {
      const result = await api.getTag(tagID);
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
    "create-tag",
    "Create a new tag for use in host labeling and firewall rules. Tags consist of a key and value separated by a colon (e.g. 'env:production'). Tags can be used in firewall rules to allow fine-grained access control beyond role-based rules.",
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
    },
    async (params) => {
      const result = await api.createTag(params);
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
    "update-tag",
    "Update a tag's value or description.",
    {
      tagID: z.string().describe("The tag ID to update"),
      key: z.string().optional().describe("Updated tag key"),
      value: z.string().optional().describe("Updated tag value"),
      description: z.string().optional().describe("Updated description"),
    },
    async ({ tagID, ...data }) => {
      const result = await api.updateTag(tagID, data);
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
    "delete-tag",
    "Delete a tag. Hosts with this tag will have it removed.",
    {
      tagID: z.string().describe("The tag ID to delete"),
    },
    async ({ tagID }) => {
      await api.deleteTag(tagID);
      return {
        content: [
          {
            type: "text" as const,
            text: `Tag ${tagID} has been deleted successfully.`,
          },
        ],
      };
    }
  );
}
