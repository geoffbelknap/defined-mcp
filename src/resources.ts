import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DefinedAPIClient } from "./api-client.js";

export function registerResources(server: McpServer, api: DefinedAPIClient) {
  // Network resource with dynamic URI
  server.resource(
    "network",
    new ResourceTemplate("nebula://networks/{networkID}", {
      list: async () => {
        const result = await api.listNetworks();
        return {
          resources: result.data.map((n) => ({
            uri: `nebula://networks/${n.id}`,
            name: `${n.name} (${n.cidr})`,
            description: `Nebula network: ${n.name}`,
            mimeType: "application/json",
          })),
        };
      },
    }),
    {
      description: "Nebula overlay network details",
      mimeType: "application/json",
    },
    async (uri, { networkID }) => {
      const result = await api.getNetwork(networkID as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
  );

  // Host resource with dynamic URI
  server.resource(
    "host",
    new ResourceTemplate("nebula://hosts/{hostID}", {
      list: async () => {
        const result = await api.listHosts({ pageSize: 100 });
        return {
          resources: result.data.map((h) => ({
            uri: `nebula://hosts/${h.id}`,
            name: `${h.name} (${h.ipAddress})`,
            description: `${h.isLighthouse ? "Lighthouse" : h.isRelay ? "Relay" : "Host"}: ${h.name}`,
            mimeType: "application/json",
          })),
        };
      },
    }),
    {
      description: "Nebula overlay network host details",
      mimeType: "application/json",
    },
    async (uri, { hostID }) => {
      const result = await api.getHost(hostID as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
  );

  // Role resource with dynamic URI
  server.resource(
    "role",
    new ResourceTemplate("nebula://roles/{roleID}", {
      list: async () => {
        const result = await api.listRoles();
        return {
          resources: result.data.map((r) => ({
            uri: `nebula://roles/${r.id}`,
            name: r.name,
            description: r.description || `Role: ${r.name}`,
            mimeType: "application/json",
          })),
        };
      },
    }),
    {
      description: "Nebula network role and firewall rules",
      mimeType: "application/json",
    },
    async (uri, { roleID }) => {
      const result = await api.getRole(roleID as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
  );
}
