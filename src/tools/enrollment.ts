import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";

export function registerEnrollmentTools(
  server: McpServer,
  api: DefinedAPIClient
) {
  server.tool(
    "create-host-and-enrollment-code",
    "Create a new host AND generate an enrollment code in a single operation. This is the recommended way to add hosts to your network for automated provisioning. Returns the host details and a one-time enrollment code that can be used with dnclient to enroll the host.",
    {
      networkID: z
        .string()
        .describe("The network ID to create the host in"),
      name: z
        .string()
        .describe("A descriptive name for the host"),
      roleID: z
        .string()
        .optional()
        .describe("The role ID to assign to the host"),
      ipAddress: z
        .string()
        .optional()
        .describe("Specific overlay IP to assign (auto-assigned if omitted)"),
      staticAddresses: z
        .array(z.string())
        .optional()
        .describe("Static public IP:port addresses"),
      listenPort: z
        .number()
        .optional()
        .describe("UDP listen port for Nebula"),
      isLighthouse: z
        .boolean()
        .optional()
        .describe("Whether this host is a lighthouse"),
      isRelay: z
        .boolean()
        .optional()
        .describe("Whether this host is a relay"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags to apply to the host"),
    },
    async (params) => {
      const result = await api.createHostAndEnrollCode(params);
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
    "create-enrollment-code",
    "Generate a new enrollment code for an existing host. Useful when a host needs to be re-enrolled (e.g. after a reinstall). The code is single-use and time-limited.",
    {
      hostID: z
        .string()
        .describe("The host ID to generate an enrollment code for"),
      lifetimeSeconds: z
        .number()
        .optional()
        .describe(
          "How long the enrollment code should be valid, in seconds (default varies by account)"
        ),
    },
    async ({ hostID, lifetimeSeconds }) => {
      const result = await api.createEnrollmentCode(hostID, lifetimeSeconds);
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
