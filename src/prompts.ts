import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer) {
  server.prompt(
    "design-network",
    "Design a new Nebula overlay network topology. Helps plan roles, lighthouses, relays, firewall rules, and host placement.",
    {
      purpose: z
        .string()
        .describe(
          "The purpose of the network (e.g. 'connect development team', 'production microservices', 'IoT device mesh')"
        ),
      hostCount: z
        .string()
        .optional()
        .describe("Approximate number of hosts expected"),
      requirements: z
        .string()
        .optional()
        .describe(
          "Special requirements (e.g. 'high availability', 'restricted access between tiers', 'mobile devices')"
        ),
    },
    ({ purpose, hostCount, requirements }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I need to design a Nebula overlay network with the following details:

**Purpose:** ${purpose}
${hostCount ? `**Expected hosts:** ${hostCount}` : ""}
${requirements ? `**Requirements:** ${requirements}` : ""}

Please help me design this network by:

1. **Network CIDR**: Recommend an appropriate overlay network CIDR range
2. **Roles**: Define roles that match the use case (e.g. lighthouse, relay, web-server, database, admin-endpoint, etc.)
3. **Lighthouse placement**: Recommend number and placement of lighthouses for reliability
4. **Relay nodes**: Determine if relays are needed and where
5. **Firewall rules**: Design role-based firewall rules following least-privilege principles
6. **Routes**: Identify if any unsafe routes are needed to bridge to existing networks

After designing, use the available Defined Networking tools to:
- List existing networks and roles to avoid conflicts
- Create the network components (roles, firewall rules)
- Create hosts with proper role assignments
- Generate enrollment codes for easy provisioning

Provide the design as a clear plan before executing any changes.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "provision-host",
    "Step-by-step guide to provision and enroll a new host into an existing Nebula network.",
    {
      networkID: z
        .string()
        .describe("The network ID to provision the host into"),
      hostName: z.string().describe("Name for the new host"),
      hostType: z
        .string()
        .optional()
        .describe(
          "Type of host: 'lighthouse', 'relay', or 'host' (default: 'host')"
        ),
      roleID: z
        .string()
        .optional()
        .describe("Role ID to assign"),
    },
    ({ networkID, hostName, hostType, roleID }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Please provision a new ${hostType || "host"} named "${hostName}" in network ${networkID}${roleID ? ` with role ${roleID}` : ""}.

Steps to follow:
1. First, verify the network exists using get-network
2. If a role was specified, verify it exists using get-role
3. Create the host and enrollment code using create-host-and-enrollment-code
4. Provide the enrollment code and instructions for running dnclient on the target machine

The enrollment command will be:
\`\`\`
sudo dnclient enroll <enrollment-code>
\`\`\`

After enrollment, the host will automatically receive its Nebula certificate and configuration.`,
          },
        },
      ],
    })
  );

  server.prompt(
    "audit-security",
    "Perform a security audit of the Nebula network configuration, checking for overly permissive rules, blocked hosts, and configuration issues.",
    {
      networkID: z
        .string()
        .optional()
        .describe("Specific network to audit (audits all if omitted)"),
    },
    ({ networkID }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Please perform a security audit of ${networkID ? `network ${networkID}` : "all networks"} by:

1. **Network overview**: List all networks and their CIDRs
2. **Role analysis**: List all roles and their firewall rules, checking for:
   - Overly permissive rules (e.g. protocol "any" from "any" role)
   - Unused roles with no assigned hosts
   - Roles missing ICMP rules (needed for troubleshooting)
3. **Host inventory**: List all hosts, checking for:
   - Blocked hosts that may need attention
   - Hosts without assigned roles
   - Lighthouse/relay distribution and redundancy
4. **Route review**: Check unsafe routes for:
   - Overly broad subnet definitions
   - Disabled routes that may be stale
5. **Audit log review**: Check recent audit logs for:
   - Suspicious activity patterns
   - Recent role/firewall changes
   - Host deletions or blocks

Provide a summary with:
- Overall security posture rating
- Critical findings
- Recommended actions`,
          },
        },
      ],
    })
  );

  server.prompt(
    "troubleshoot-connectivity",
    "Troubleshoot connectivity issues between Nebula hosts by examining network configuration, roles, and firewall rules.",
    {
      sourceHostID: z
        .string()
        .describe("Host ID of the source (initiating connection)"),
      destinationHostID: z
        .string()
        .describe("Host ID of the destination"),
      protocol: z
        .string()
        .optional()
        .describe("Protocol having issues (tcp, udp, icmp)"),
      port: z
        .string()
        .optional()
        .describe("Port having issues"),
    },
    ({ sourceHostID, destinationHostID, protocol, port }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `I'm having connectivity issues between two Nebula hosts. Please troubleshoot:

**Source host:** ${sourceHostID}
**Destination host:** ${destinationHostID}
${protocol ? `**Protocol:** ${protocol}` : ""}
${port ? `**Port:** ${port}` : ""}

Please investigate by:
1. Get details for both hosts (get-host for each)
2. Check if either host is blocked
3. Verify both hosts are in the same network
4. Check the role assigned to the destination host
5. Review the firewall rules on the destination's role (get-firewall-rules)
6. Verify the source host's role is allowed through the firewall
7. Check if any unsafe routes are involved

Provide:
- Root cause analysis
- Step-by-step fix (e.g. add firewall rule, unblock host, etc.)
- Commands to apply the fix using the available tools`,
          },
        },
      ],
    })
  );
}
