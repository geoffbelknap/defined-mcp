# Defined Networking MCP Server

An MCP (Model Context Protocol) server that enables AI agents to design, build, manage, and operate [Nebula](https://github.com/slackhq/nebula) overlay networks through the [Defined Networking](https://www.defined.net/) API.

Built for [OpenClaw](https://docs.openclaw.ai/) and any MCP-compatible AI agent platform (Claude, VS Code, etc.).

## Features

### Tools (29 operations)

**Network Management**
- `list-networks` — List all Nebula overlay networks
- `get-network` — Get detailed network information

**Host Management**
- `list-hosts` — List hosts with filtering (by network, role, type, status)
- `get-host` — Get host details
- `create-host` — Create a new host (lighthouse, relay, or regular)
- `update-host` — Update host configuration
- `delete-host` — Remove a host from the network
- `block-host` — Block a host (revoke network access)
- `unblock-host` — Restore a blocked host

**Enrollment**
- `create-host-and-enrollment-code` — Create a host + enrollment code in one step
- `create-enrollment-code` — Generate enrollment code for existing host

**Roles & Firewall**
- `list-roles` — List all roles
- `get-role` — Get role details with firewall rules
- `create-role` — Create a new role
- `update-role` — Update role configuration
- `delete-role` — Remove a role
- `get-firewall-rules` — Get inbound firewall rules for a role
- `update-firewall-rules` — Replace firewall rules for a role (supports role-based and tag-based rules)

**Tags**
- `list-tags` — List all tags (key:value pairs for fine-grained access control)
- `get-tag` — Get tag details
- `create-tag` — Create a new tag (e.g. `env:production`, `region:us-east`)
- `update-tag` — Update a tag
- `delete-tag` — Remove a tag

**Routes (Unsafe Routes)**
- `list-routes` — List routes extending access to non-overlay subnets
- `get-route` — Get route details
- `create-route` — Create a route through a gateway host
- `delete-route` — Remove a route

**Audit & Compliance**
- `list-audit-logs` — Search audit logs by actor, action, or target

**Downloads**
- `list-downloads` — List available DNClient software downloads for all platforms

### Resources

- `nebula://networks/{networkID}` — Network configuration data
- `nebula://hosts/{hostID}` — Host configuration data
- `nebula://roles/{roleID}` — Role and firewall rule data

### Prompts

- `design-network` — Interactive network topology design
- `provision-host` — Step-by-step host provisioning guide
- `audit-security` — Security posture audit
- `troubleshoot-connectivity` — Debug connectivity between hosts

## Setup

### Prerequisites

- Node.js 18+
- A [Defined Networking](https://admin.defined.net) account with an API key

### Get an API Key

1. Go to [admin.defined.net/settings/api-keys](https://admin.defined.net/settings/api-keys)
2. Create a new API key with the scopes you need:
   - `networks:read` — List and view networks
   - `hosts:create` — Create hosts
   - `hosts:read` — List and view hosts
   - `hosts:update` — Update hosts
   - `hosts:delete` — Delete hosts
   - `hosts:enroll` — Generate enrollment codes
   - `hosts:block` — Block/unblock hosts
   - `roles:create`, `roles:read`, `roles:update`, `roles:delete` — Manage roles
   - `tags:create`, `tags:read`, `tags:update`, `tags:delete` — Manage tags
   - `routes:create`, `routes:read`, `routes:delete` — Manage routes
   - `auditLogs:list` — View audit logs

### Install

```bash
npm install @defined-net/mcp-server
```

Or clone and build:

```bash
git clone https://github.com/geoffbelknap/defined-mcp.git
cd defined-mcp
npm install
npm run build
```

### Configure for Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "defined-nebula": {
      "command": "node",
      "args": ["/path/to/defined-mcp/dist/index.js"],
      "env": {
        "DEFINED_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Configure for OpenClaw

Add to your `~/.openclaw/openclaw.json`:

```json
{
  "mcpServers": {
    "defined-nebula": {
      "command": "node",
      "args": ["/path/to/defined-mcp/dist/index.js"],
      "env": {
        "DEFINED_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Configure for Claude Code

Add to your MCP settings:

```json
{
  "defined-nebula": {
    "command": "node",
    "args": ["/path/to/defined-mcp/dist/index.js"],
    "env": {
      "DEFINED_API_KEY": "your-api-key-here"
    }
  }
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEFINED_API_KEY` | Yes | — | Your Defined Networking API key |
| `DEFINED_API_URL` | No | `https://api.defined.net` | API base URL (for custom deployments) |

## Usage Examples

### Design a Network

> "Design a Nebula overlay network for my development team of 15 engineers with separate roles for web servers, databases, and developer endpoints."

The agent will use the `design-network` prompt to plan the topology, then execute the creation using the tools.

### Provision a Host

> "Add a new lighthouse named 'us-east-lighthouse' to my network with static address 203.0.113.1:4242"

### Security Audit

> "Audit the security posture of my Nebula network. Check for overly permissive firewall rules and blocked hosts."

### Troubleshoot

> "I can't connect from host-ABC to host-XYZ on port 443. Help me figure out why."

## Architecture

```
┌─────────────────────────────────────────────────┐
│  AI Agent (OpenClaw / Claude / VS Code / etc.)  │
├─────────────────────────────────────────────────┤
│  MCP Protocol (stdio / JSON-RPC 2.0)            │
├─────────────────────────────────────────────────┤
│  defined-nebula MCP Server                      │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐        │
│  │  Tools  │ │Resources │ │  Prompts  │        │
│  └────┬────┘ └────┬─────┘ └───────────┘        │
│       │           │                              │
│  ┌────┴───────────┴────┐                        │
│  │   Defined API Client │                        │
│  └──────────┬──────────┘                        │
├─────────────┼───────────────────────────────────┤
│  HTTPS + Bearer Token                            │
├─────────────┼───────────────────────────────────┤
│  Defined Networking API (api.defined.net)        │
├─────────────┼───────────────────────────────────┤
│  Nebula Overlay Network                          │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                │
│  │ L │ │ H │ │ H │ │ R │ │ H │                │
│  └───┘ └───┘ └───┘ └───┘ └───┘                │
│  L=Lighthouse  H=Host  R=Relay                  │
└─────────────────────────────────────────────────┘
```

## Development

```bash
npm install
npm run dev    # Watch mode
npm run build  # Production build
npm start      # Run the server
```

## License

MIT
