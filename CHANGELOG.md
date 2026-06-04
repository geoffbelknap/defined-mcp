# Changelog

## 2026-06-04

### Updated

- Brought the MCP server up to date with the current non-deprecated Defined Networking API surface.
- Added support for network updates, network deletion, adding IPv4 CIDRs, route updates, host debug commands, and current route schema fields.
- Added `configOverrides` support for hosts, enrollment host creation, and tags where the API exposes it.
- Updated host, network, tag, audit log, and route calls to use the current API paths and payload shapes.

### Improved for Agents

- Added structured tool responses with operation names, resource identifiers, side effects, warnings, timestamps, and API error details.
- Added `dryRun: true` previews for mutating tools while keeping normal tool calls direct and executable.
- Improved tool schemas and descriptions so coding and DevOps agents can discover required inputs, understand side effects, and recover from errors more reliably.
- Added repeatable MCP smoke tests covering read-only live API calls and explicit dry-run mutation checks.

### Runtime and Security

- Updated the project to require Node.js 24 LTS.
- Enabled npm `engine-strict` so unsupported Node versions fail early.
- Updated dependency lockfile entries to clear known npm audit findings.

### Documentation

- Reworked the README around practical MCP installation and client configuration.
- Removed inline API key command examples and documented safer local secret handling.
- Moved the full tool inventory into a lower reference section so the README starts with what the MCP does and how to use it.
