import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "../api-client.js";
import { toolPlan, toolSuccess, withToolError } from "../mcp-response.js";

export function registerEnrollmentTools(
  server: McpServer,
  api: DefinedAPIClient
) {
  server.tool(
    "create-host-and-enrollment-code",
    "Create a new host AND generate an enrollment code in a single operation. This is the recommended way to add hosts to your network for automated provisioning. Returns the host details and a one-time enrollment code that can be used with dnclient to enroll the host. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
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
        .describe("Specific overlay IP to assign (converted to ipAddresses)"),
      ipAddresses: z
        .array(z.string())
        .optional()
        .describe("Specific overlay IP addresses or CIDR prefixes to assign"),
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
      dryRun: z.boolean().optional().describe("Preview the host and enrollment-code creation without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to create the host and enrollment code"),
    },
    async ({ dryRun, confirm, ...params }) => withToolError("create-host-and-enrollment-code", async () => {
      if (dryRun || !confirm) {
        return toolPlan(
          "create-host-and-enrollment-code",
          {
            action: "create host and enrollment code",
            resource: { type: "host", id: params.name },
            would_change: [
              { type: "created", resource: { type: "host", id: params.name } },
              { type: "enrollment_code_created", resource: { type: "host", id: params.name } },
            ],
            required_confirmation: true,
          },
          ["Enrollment codes are credentials. The live response may include secret material."]
        );
      }
      const result = await api.createHostAndEnrollCode(params);
      const hostID = result.data?.host?.id;
      return toolSuccess("create-host-and-enrollment-code", result, {
        resource: hostID ? { type: "host", id: hostID } : undefined,
        sideEffects: hostID
          ? [
              { type: "created", resource: { type: "host", id: hostID } },
              { type: "enrollment_code_created", resource: { type: "host", id: hostID } },
            ]
          : [],
      });
    })
  );

  server.tool(
    "create-enrollment-code",
    "Generate a new enrollment code for an existing host. Useful when a host needs to be re-enrolled (e.g. after a reinstall). The code is single-use and time-limited. Requires confirm=true to execute; omit confirm or set dryRun=true to preview.",
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
      dryRun: z.boolean().optional().describe("Preview the enrollment-code creation without changing anything"),
      confirm: z.boolean().optional().describe("Must be true to create the enrollment code"),
    },
    async ({ hostID, lifetimeSeconds, dryRun, confirm }) => withToolError("create-enrollment-code", async () => {
      if (dryRun || !confirm) {
        return toolPlan(
          "create-enrollment-code",
          {
            action: "create enrollment code",
            resource: { type: "host", id: hostID },
            would_change: [
              { type: "enrollment_code_created", resource: { type: "host", id: hostID } },
            ],
            required_confirmation: true,
          },
          ["Enrollment codes are credentials. The live response may include secret material."]
        );
      }
      const result = await api.createEnrollmentCode(hostID, lifetimeSeconds);
      return toolSuccess("create-enrollment-code", result, {
        resource: { type: "host", id: hostID },
        sideEffects: [
          { type: "enrollment_code_created", resource: { type: "host", id: hostID } },
        ],
      });
    })
  );
}
