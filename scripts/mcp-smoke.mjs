#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const mode = process.argv[2] ?? "dry-run";
const validModes = new Set(["dry-run", "read-only", "all"]);

if (!validModes.has(mode)) {
  console.error(`Usage: node scripts/mcp-smoke.mjs [${[...validModes].join("|")}]`);
  process.exit(2);
}

const readOnlyRequests = [
  call(101, "list-networks", { pageSize: 1 }),
  call(102, "list-hosts", { pageSize: 1 }),
  call(103, "list-roles", { pageSize: 1 }),
  call(104, "list-tags", { pageSize: 1 }),
  call(105, "list-routes", { pageSize: 1 }),
  call(106, "list-audit-logs", { pageSize: 1 }),
  call(107, "list-downloads", {}),
];

const dryRunRequests = [
  call(201, "create-host", { networkID: "net_ax_probe", name: "ax-probe-host", dryRun: true }),
  call(202, "update-host", { hostID: "host_ax_probe", name: "ax-probe-renamed", dryRun: true }),
  call(203, "delete-host", { hostID: "host_ax_probe", dryRun: true }),
  call(204, "block-host", { hostID: "host_ax_probe", dryRun: true }),
  call(205, "debug-host", { hostID: "host_ax_probe", command: "PrintCert", target: "10.255.0.5", dryRun: true }),
  call(206, "update-network", {
    networkID: "net_ax_probe",
    name: "ax-probe-network",
    lighthousesAsRelays: false,
    dryRun: true,
  }),
  call(207, "delete-network", { networkID: "net_ax_probe", dryRun: true }),
  call(208, "add-network-cidr", { networkID: "net_ax_probe", cidr: "192.168.44.0/24", dryRun: true }),
  call(209, "create-role", { name: "ax-probe-role", dryRun: true }),
  call(210, "update-role", { roleID: "role_ax_probe", description: "AX dry-run probe", dryRun: true }),
  call(211, "delete-role", { roleID: "role_ax_probe", dryRun: true }),
  call(212, "update-firewall-rules", { roleID: "role_ax_probe", firewallRules: [], dryRun: true }),
  call(213, "create-route", {
    name: "ax-probe-route",
    routerHostID: "host_ax_probe",
    routableCIDRs: { "10.255.0.0/24": { install: true } },
    dryRun: true,
  }),
  call(214, "update-route", {
    routeID: "route_ax_probe",
    name: "ax-probe-route",
    routerHostID: "host_ax_probe",
    routableCIDRs: { "10.255.0.0/24": { install: true } },
    dryRun: true,
  }),
  call(215, "delete-route", { routeID: "route_ax_probe", dryRun: true }),
  call(216, "create-tag", { key: "ax", value: "probe", dryRun: true }),
  call(217, "update-tag", { tag: "ax:probe", description: "AX dry-run probe", dryRun: true }),
  call(218, "delete-tag", { tag: "ax:probe", dryRun: true }),
  call(219, "create-host-and-enrollment-code", {
    networkID: "net_ax_probe",
    name: "ax-probe-enroll-host",
    dryRun: true,
  }),
  call(220, "create-enrollment-code", { hostID: "host_ax_probe", dryRun: true }),
];

const requests = [
  initialize(),
  { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
  ...(mode === "read-only" ? readOnlyRequests : []),
  ...(mode === "dry-run" ? dryRunRequests : []),
  ...(mode === "all" ? [...readOnlyRequests, ...dryRunRequests] : []),
];

if ((mode === "read-only" || mode === "all") && !process.env.DEFINED_API_KEY) {
  console.error("DEFINED_API_KEY is required for read-only live MCP smoke tests.");
  process.exit(2);
}

const child = spawn(process.execPath, ["dist/index.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DEFINED_API_KEY: process.env.DEFINED_API_KEY ?? "dry-run-placeholder",
  },
  stdio: ["pipe", "pipe", "pipe"],
});

const responses = new Map();
const stderr = [];

createInterface({ input: child.stdout }).on("line", (line) => {
  if (!line.trim()) return;
  const response = JSON.parse(line);
  if (response.id !== undefined) {
    responses.set(response.id, response);
  }
});

createInterface({ input: child.stderr }).on("line", (line) => {
  stderr.push(line);
});

for (const request of requests) {
  child.stdin.write(`${JSON.stringify(request)}\n`);
}
child.stdin.end();

const exitCode = await new Promise((resolve) => child.on("close", resolve));
if (exitCode !== 0) {
  fail(`MCP server exited with code ${exitCode}\n${stderr.join("\n")}`);
}

const expected = requests.filter((request) => request.id !== undefined);
for (const request of expected) {
  const response = responses.get(request.id);
  if (!response) fail(`Missing response for request ${request.id}`);
  if (response.error) fail(`JSON-RPC error for request ${request.id}: ${JSON.stringify(response.error)}`);
}

if (mode === "read-only" || mode === "all") {
  for (const request of readOnlyRequests) {
    assertToolSuccess(request);
  }
}

if (mode === "dry-run" || mode === "all") {
  for (const request of dryRunRequests) {
    assertDryRunPlan(request);
  }
}

console.log(`MCP smoke ${mode}: ${expected.length - 1} tool checks passed`);

function initialize() {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "defined-mcp-smoke", version: "1.0.0" },
    },
  };
}

function call(id, name, args) {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name, arguments: args },
  };
}

function assertToolSuccess(request) {
  const response = responses.get(request.id);
  const envelope = response?.result?.structuredContent;
  if (response?.result?.isError) fail(`${request.params.name} returned isError=true`);
  if (!envelope) fail(`${request.params.name} did not return structuredContent`);
  if (envelope.schema_version !== "ax.tool.v1") {
    fail(`${request.params.name} returned schema_version=${envelope.schema_version}`);
  }
  if (typeof envelope.request_id !== "string" || envelope.request_id.length === 0) {
    fail(`${request.params.name} did not return request_id`);
  }
  if (envelope.ok !== true) fail(`${request.params.name} returned ok=${envelope.ok}`);
  if (envelope.operation !== request.params.name) {
    fail(`${request.params.name} returned operation=${envelope.operation}`);
  }
  if (!Array.isArray(envelope.side_effects)) fail(`${request.params.name} side_effects is not an array`);
  if (!Array.isArray(envelope.warnings)) fail(`${request.params.name} warnings is not an array`);
}

function assertDryRunPlan(request) {
  assertToolSuccess(request);
  const envelope = responses.get(request.id).result.structuredContent;
  if (envelope.data?.dry_run !== true) fail(`${request.params.name} did not return dry_run=true`);
  if (!Array.isArray(envelope.data?.would_change)) {
    fail(`${request.params.name} did not include would_change[]`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
