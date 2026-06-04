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
- `create-host` — Create a new host (lighthouse, relay, or regular; confirmation required)
- `update-host` — Update host configuration (confirmation required)
- `delete-host` — Remove a host from the network (confirmation required)
- `block-host` — Block a host (revoke network access; confirmation required)
- `unblock-host` — Restore a blocked host (confirmation required)

**Enrollment**
- `create-host-and-enrollment-code` — Create a host + enrollment code in one step (confirmation required)
- `create-enrollment-code` — Generate enrollment code for existing host (confirmation required)

**Roles & Firewall**
- `list-roles` — List all roles
- `get-role` — Get role details with firewall rules
- `create-role` — Create a new role (confirmation required)
- `update-role` — Update role configuration (confirmation required)
- `delete-role` — Remove a role (confirmation required)
- `get-firewall-rules` — Get inbound firewall rules for a role
- `update-firewall-rules` — Replace firewall rules for a role (supports role-based and tag-based rules; confirmation required)

**Tags**
- `list-tags` — List all tags (key:value pairs for fine-grained access control)
- `get-tag` — Get tag details
- `create-tag` — Create a new tag (e.g. `env:production`, `region:us-east`; confirmation required)
- `update-tag` — Update a tag (confirmation required)
- `delete-tag` — Remove a tag (confirmation required)

**Routes (Unsafe Routes)**
- `list-routes` — List routes extending access to non-overlay subnets
- `get-route` — Get route details
- `create-route` — Create a route through a gateway host (confirmation required)
- `delete-route` — Remove a route (confirmation required)

**Audit & Compliance**
- `list-audit-logs` — Search audit logs by target

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

- Node.js 24 LTS (`24.16.0` or newer within the Node 24 line)
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

## Agent Experience Contract

Tool responses are optimized for MCP clients and LLM agents:

- Successful tools return `structuredContent` with `schema_version`, `ok`, `operation`, `request_id`, `data`, `metadata`, `side_effects`, `warnings`, and `observed_at`.
- The text response is a JSON-formatted fallback of the same envelope.
- API errors return classified structured errors with retryability, status code, request ID when available, and suggested next actions.
- Mutating tools are dry-run by default. Omit `confirm` or set `dryRun: true` to preview the operation. Pass `confirm: true` only after reviewing the planned `would_change` list.
- Enrollment-code tools are treated as sensitive because live responses can contain credential material.

Example dry-run mutation:

```json
{
  "name": "update-firewall-rules",
  "arguments": {
    "roleID": "role_123",
    "firewallRules": [],
    "dryRun": true
  }
}
```

Example confirmed mutation:

```json
{
  "name": "update-firewall-rules",
  "arguments": {
    "roleID": "role_123",
    "firewallRules": [],
    "confirm": true
  }
}
```

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

### Tests and Security Checks

```bash
npm test              # Build and run non-mutating AX dry-run smoke tests
npm run test:ax:live  # Run read-only live API checks plus dry-run mutation checks
npm run security:audit
```

`npm run test:ax:live` requires `DEFINED_API_KEY`. It performs read-only API calls and dry-run mutation checks only; it does not execute confirmed mutations.

## License

MIT
