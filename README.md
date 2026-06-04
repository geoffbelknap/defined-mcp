# Defined Networking MCP Server

An MCP (Model Context Protocol) server that lets AI coding and DevOps agents manage [Defined Networking](https://www.defined.net/) / Managed [Nebula](https://github.com/slackhq/nebula) infrastructure.

Use it with Codex, Claude Code, Copilot CLI, VS Code, and other MCP-compatible development tools.

## What This Does

Use this server to let an agent inspect and manage Defined Networking infrastructure without hand-writing API calls. It supports common workflows such as:

- designing a Nebula network topology
- provisioning hosts and enrollment codes
- managing roles, firewall rules, tags, routes, and network settings
- auditing configuration and administrative activity
- troubleshooting host connectivity and dnclient state

## Quick Start

Install the server:

```bash
nvm use
npm install
npm run build
```

Add it to your MCP client:

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

For tools that support managed secrets or environment variables, store `DEFINED_API_KEY` there instead of writing it directly into a config file.

Ask your agent to inspect the account:

> "List my Defined Networking networks and summarize the hosts, roles, routes, and tags."

## Setup

### Prerequisites

- Node.js 24 LTS (`24.16.0` or newer within the Node 24 line)
- A [Defined Networking](https://admin.defined.net) account with an API key

This repo includes `.nvmrc` and `.node-version` set to Node `24.16.0`. npm also uses `engine-strict=true`, so installs fail on unsupported Node versions instead of silently using an EOL runtime.

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

Do not paste API keys directly into shell commands. Prefer an MCP client secret store, a local environment file that is excluded from git, or your shell's secure environment management.

For local development, create an ignored `.env.local` file:

```bash
DEFINED_API_KEY=your-api-key-here
```

Then load it for the current shell session before running live checks. The command itself does not contain the secret, so it will not be written to shell history:

```bash
set -a
. ./.env.local
set +a
npm run test:live
```

### Install From npm

```bash
npm install @defined-net/mcp-server
```

### Clone and Build

```bash
git clone https://github.com/geoffbelknap/defined-mcp.git
cd defined-mcp
npm install
npm run build
```

### MCP Client Configuration

Use this shape for MCP clients that accept JSON server configuration:

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

If you installed the package globally, use `"command": "defined-mcp"` and omit `args`.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEFINED_API_KEY` | Yes | — | Your Defined Networking API key |
| `DEFINED_API_URL` | No | `https://api.defined.net` | API base URL (for custom deployments) |

## Tool Behavior

- Tools return structured results with operation names, resource IDs, side effects, warnings, and API error details.
- Mutating tools execute when called. Pass `dryRun: true` when you want the server to return a preview plan instead.
- Enrollment-code tools can return credential material. Treat their results like secrets.

## Capabilities

The MCP targets the current non-deprecated Defined Networking API surface from the official OpenAPI description, including hosts, roles, routes, tags, audit logs, networks, and downloads. Deprecated v1 endpoints are intentionally omitted when a current replacement exists.

### Tools

**Network Management**
- `list-networks` — List all Nebula overlay networks
- `get-network` — Get detailed network information
- `update-network` — Update network name, description, and lighthouse relay behavior
- `delete-network` — Delete an empty network
- `add-network-cidr` — Add an IPv4 CIDR to an IPv6-only network

**Host Management**
- `list-hosts` — List hosts with filtering (by network, role, type, status)
- `get-host` — Get host details
- `create-host` — Create a new host (lighthouse, relay, or regular)
- `update-host` — Update host configuration
- `delete-host` — Remove a host from the network
- `block-host` — Block a host (revoke network access)
- `unblock-host` — Restore a blocked host
- `debug-host` — Send host debug commands such as log streaming, tunnel inspection, certificate inspection, lighthouse queries, and stack traces

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
- `update-route` — Update route name, router host, routable CIDRs, and firewall rules
- `delete-route` — Remove a route

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
│  AI Agent (Codex / Claude Code / VS Code / etc.)│
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
nvm use
npm install
npm run dev    # Watch mode
npm run build  # Production build
npm start      # Run the server
```

### Tests and Security Checks

```bash
npm test              # Build and run non-mutating dry-run smoke tests
npm run test:live     # Run read-only live API checks plus dry-run mutation checks
npm run security:audit
```

`npm run test:live` requires `DEFINED_API_KEY`. It performs read-only API calls and explicit dry-run mutation checks only.

The default `npm test` target is safe for CI environments without real Defined credentials because it uses dry-run mutation plans and a placeholder API key.

## License

MIT
