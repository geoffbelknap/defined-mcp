import type { Config } from "./config.js";

export interface PaginationParams {
  cursor?: string;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
    nextCursor?: string;
    prevCursor?: string;
    totalCount?: number;
    page: {
      cursor?: string;
      hasNextPage: boolean;
      totalCount?: number;
    };
  };
}

export interface SingleResponse<T> {
  data: T;
}

export interface DNNetwork {
  id: string;
  organizationID?: string;
  name: string;
  cidr?: string;
  cidrs?: string[];
  signingCAID: string;
  createdAt: string;
  description?: string;
  certVersion?: 1 | 2;
  lighthousesAsRelays?: boolean;
  curve?: "25519" | "P256";
  lighthouseCount?: number;
  hostCount?: number;
}

export interface DNNetworkUpdate {
  name: string;
  description?: string;
  lighthousesAsRelays: boolean;
}

export interface DNHost {
  id: string;
  organizationID?: string;
  networkID: string;
  roleID?: string | null;
  endpointOIDCUserID?: string | null;
  name: string;
  ipAddress?: string;
  ipAddresses?: string[];
  staticAddresses: string[];
  listenPort: number;
  isLighthouse: boolean;
  isRelay: boolean;
  isBlocked: boolean;
  createdAt: string;
  modifiedAt?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  configOverrides?: ConfigOverride[];
}

export interface DNHostCreate {
  networkID: string;
  roleID?: string | null;
  name: string;
  ipAddress?: string;
  ipAddresses?: string[];
  staticAddresses?: string[];
  listenPort?: number;
  isLighthouse?: boolean;
  isRelay?: boolean;
  tags?: string[];
  configOverrides?: ConfigOverride[];
}

export interface DNRole {
  id: string;
  name: string;
  description?: string;
  firewallRules?: DNFirewallRule[];
  createdAt: string;
  modifiedAt: string;
}

export interface DNRoleCreate {
  name: string;
  description?: string;
  firewallRules?: DNFirewallRuleInput[];
}

export interface DNFirewallRule {
  id: string;
  protocol: string;
  port?: string;
  allowedRoleID?: string;
  allowedTag?: string;
  allowedTags?: string[];
  portRange?: { from: number; to: number } | null;
  description?: string;
}

export interface DNFirewallRuleInput {
  protocol: string;
  port?: string;
  allowedRoleID?: string;
  allowedTag?: string;
  allowedTags?: string[];
  portRange?: { from: number; to: number } | null;
  description?: string;
}

export interface DNRouteFirewallRuleInput {
  localCIDR?: string;
  protocol: "ANY" | "TCP" | "UDP" | "ICMP" | string;
  description?: string;
  allowedRoleID?: string | null;
  allowedTags?: string[];
  portRange?: { from: number; to: number } | null;
}

export interface DNEnrollmentCode {
  code: string;
  lifetimeSeconds: number;
}

export interface DNHostAndEnrollCode {
  host: DNHost;
  enrollmentCode: DNEnrollmentCode;
}

export interface DNRoute {
  id: string;
  name?: string;
  networkID?: string;
  hostID?: string;
  network?: string;
  routerHostID?: string;
  routableCIDRs?: Record<string, { install?: boolean }>;
  description?: string;
  enabled?: boolean;
  firewallRules?: DNRouteFirewallRuleInput[];
  createdAt: string;
  modifiedAt?: string;
  firewallRulesCount?: number;
}

export interface DNRouteCreate {
  name: string;
  routerHostID?: string;
  routableCIDRs?: Record<string, { install?: boolean }>;
  firewallRules?: DNRouteFirewallRuleInput[];
  description?: string;
  networkID?: string;
  hostID?: string;
  network?: string;
  enabled?: boolean;
}

export interface DNRouteUpdate {
  name: string;
  description?: string;
  routerHostID?: string;
  routableCIDRs?: Record<string, { install?: boolean }>;
  firewallRules?: DNRouteFirewallRuleInput[];
}

export type DNHostCommand =
  | { command: "StreamLogs"; args: { durationSeconds: number; level: "panic" | "fatal" | "error" | "warning" | "info" | "debug" } }
  | { command: "CreateTunnel"; args: { target: string } }
  | { command: "PrintTunnel"; args: { target: string } }
  | { command: "PrintCert"; args: { target: string } }
  | { command: "QueryLighthouse"; args: { target: string } }
  | { command: "DebugStack"; args?: Record<string, never> };

export interface DNTag {
  id?: string;
  key?: string;
  value?: string;
  name?: string;
  description?: string;
  configOverrides?: ConfigOverride[];
  priority?: number;
  hostCount?: number;
  routeSubscriptions?: string[];
  createdAt?: string;
  modifiedAt?: string;
}

export interface DNTagCreate {
  key: string;
  value: string;
  description?: string;
  configOverrides?: ConfigOverride[];
}

export interface DNTagUpdate {
  description?: string;
  configOverrides?: ConfigOverride[];
  before?: string;
  after?: string;
  routeSubscriptions?: string[];
}

export interface DNAuditLogEntry {
  id: string;
  organizationID?: string;
  timestamp?: string;
  actorType?: string;
  actorID?: string;
  actorName?: string;
  actor?: Record<string, unknown>;
  action?: string;
  targetType?: string;
  targetID?: string;
  targetName?: string;
  target?: Record<string, unknown>;
  event?: Record<string, unknown>;
  details?: Record<string, unknown>;
  createdAt?: string;
}

export interface ConfigOverride {
  key: string;
  value: unknown;
}

export interface DNDownloads {
  dnclient: DNDownloadInfo[];
  mobile?: DNDownloadInfo[];
}

export interface DNDownloadInfo {
  version: string;
  platform: string;
  architecture: string;
  url: string;
}

export interface APIErrorItem {
  code: string;
  message: string;
}

export class DefinedAPIError extends Error {
  public statusCode: number;
  public requestId?: string;
  public errors?: APIErrorItem[];

  constructor(
    message: string,
    statusCode: number,
    requestId?: string,
    errors?: APIErrorItem[]
  ) {
    super(message);
    this.name = "DefinedAPIError";
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.errors = errors;
  }
}

export class DefinedAPIClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: Config) {
    this.baseUrl = config.DEFINED_API_URL.replace(/\/$/, "");
    this.apiKey = config.DEFINED_API_KEY;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | undefined>,
    apiVersion = 1
  ): Promise<T> {
    const url = new URL(`/v${apiVersion}${path}`, this.baseUrl);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const requestId = response.headers.get("x-request-id") ?? undefined;

    if (!response.ok) {
      let errorBody: unknown;
      try {
        errorBody = await response.json();
      } catch {
        throw new DefinedAPIError(
          `API request failed with status ${response.status}`,
          response.status,
          requestId
        );
      }

      const errorObj =
        errorBody !== null && typeof errorBody === "object" ? errorBody : {};
      const errors = (errorObj as { errors?: APIErrorItem[] }).errors;
      const message =
        errors?.[0]?.message ??
        `API request failed with status ${response.status}`;
      throw new DefinedAPIError(message, response.status, requestId, errors);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // ─── Networks ───────────────────────────────────────────────

  async listNetworks(
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<DNNetwork>> {
    return this.request("GET", "/networks", undefined, {
      cursor: pagination?.cursor,
      pageSize: pagination?.pageSize?.toString(),
    }, 2);
  }

  async getNetwork(networkID: string): Promise<SingleResponse<DNNetwork>> {
    return this.request("GET", `/networks/${encodeURIComponent(networkID)}`, undefined, undefined, 2);
  }

  async updateNetwork(
    networkID: string,
    data: DNNetworkUpdate
  ): Promise<SingleResponse<DNNetwork>> {
    return this.request("PUT", `/networks/${encodeURIComponent(networkID)}`, data, undefined, 2);
  }

  async deleteNetwork(networkID: string): Promise<void> {
    await this.request("DELETE", `/networks/${encodeURIComponent(networkID)}`);
  }

  async addNetworkCIDR(
    networkID: string,
    cidr: string
  ): Promise<SingleResponse<DNNetwork>> {
    return this.request("POST", `/networks/${encodeURIComponent(networkID)}/cidrs`, { cidr }, undefined, 2);
  }

  // ─── Hosts ─────────────────────────────────────────────────

  async listHosts(
    params?: {
      networkID?: string;
      roleID?: string;
      isLighthouse?: boolean;
      isRelay?: boolean;
      isBlocked?: boolean;
      name?: string;
      ipAddress?: string;
    } & PaginationParams
  ): Promise<PaginatedResponse<DNHost>> {
    return this.request("GET", "/hosts", undefined, {
      networkID: params?.networkID,
      roleID: params?.roleID,
      isLighthouse: params?.isLighthouse?.toString(),
      isRelay: params?.isRelay?.toString(),
      isBlocked: params?.isBlocked?.toString(),
      name: params?.name,
      ipAddress: params?.ipAddress,
      cursor: params?.cursor,
      pageSize: params?.pageSize?.toString(),
    }, 2);
  }

  async getHost(hostID: string): Promise<SingleResponse<DNHost>> {
    return this.request("GET", `/hosts/${encodeURIComponent(hostID)}`, undefined, undefined, 2);
  }

  async createHost(data: DNHostCreate): Promise<SingleResponse<DNHost>> {
    const { ipAddress, ...rest } = data;
    const v2Data = {
      ...rest,
      ipAddresses: data.ipAddresses ?? (ipAddress ? [ipAddress] : undefined),
    };
    return this.request("POST", "/hosts", v2Data, undefined, 2);
  }

  async updateHost(
    hostID: string,
    data: Partial<Pick<DNHost, "name" | "staticAddresses" | "listenPort" | "roleID" | "tags" | "configOverrides">>
  ): Promise<SingleResponse<DNHost>> {
    return this.request("PUT", `/hosts/${encodeURIComponent(hostID)}`, data, undefined, 3);
  }

  async deleteHost(hostID: string): Promise<void> {
    await this.request("DELETE", `/hosts/${encodeURIComponent(hostID)}`);
  }

  async blockHost(hostID: string): Promise<SingleResponse<DNHost>> {
    return this.request("POST", `/hosts/${encodeURIComponent(hostID)}/block`, undefined, undefined, 2);
  }

  async unblockHost(hostID: string): Promise<SingleResponse<DNHost>> {
    return this.request("POST", `/hosts/${encodeURIComponent(hostID)}/unblock`, undefined, undefined, 2);
  }

  // ─── Enrollment ────────────────────────────────────────────

  async createHostAndEnrollCode(
    data: DNHostCreate
  ): Promise<SingleResponse<DNHostAndEnrollCode>> {
    const { ipAddress, ...rest } = data;
    const v2Data = {
      ...rest,
      ipAddresses: data.ipAddresses ?? (ipAddress ? [ipAddress] : undefined),
    };
    return this.request("POST", "/host-and-enrollment-code", v2Data, undefined, 2);
  }

  async createEnrollmentCode(
    hostID: string,
    lifetimeSeconds?: number
  ): Promise<SingleResponse<DNEnrollmentCode>> {
    return this.request("POST", `/hosts/${encodeURIComponent(hostID)}/enrollment-code`, {
      lifetimeSeconds,
    });
  }

  async debugHost(
    hostID: string,
    command: DNHostCommand
  ): Promise<SingleResponse<unknown>> {
    return this.request("POST", `/hosts/${encodeURIComponent(hostID)}/command`, command);
  }

  // ─── Roles ─────────────────────────────────────────────────

  async listRoles(
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<DNRole>> {
    return this.request("GET", "/roles", undefined, {
      cursor: pagination?.cursor,
      pageSize: pagination?.pageSize?.toString(),
    });
  }

  async getRole(roleID: string): Promise<SingleResponse<DNRole>> {
    return this.request("GET", `/roles/${encodeURIComponent(roleID)}`);
  }

  async createRole(data: DNRoleCreate): Promise<SingleResponse<DNRole>> {
    return this.request("POST", "/roles", data);
  }

  async updateRole(
    roleID: string,
    data: Partial<DNRoleCreate>
  ): Promise<SingleResponse<DNRole>> {
    return this.request("PUT", `/roles/${encodeURIComponent(roleID)}`, data);
  }

  async deleteRole(roleID: string): Promise<void> {
    await this.request("DELETE", `/roles/${encodeURIComponent(roleID)}`);
  }

  // ─── Firewall Rules ────────────────────────────────────────

  async getRoleFirewallRules(
    roleID: string
  ): Promise<SingleResponse<DNFirewallRule[]>> {
    return this.request("GET", `/roles/${encodeURIComponent(roleID)}/firewall-rules`);
  }

  async updateRoleFirewallRules(
    roleID: string,
    rules: DNFirewallRuleInput[]
  ): Promise<SingleResponse<DNFirewallRule[]>> {
    return this.request("PUT", `/roles/${encodeURIComponent(roleID)}/firewall-rules`, {
      firewallRules: rules,
    });
  }

  // ─── Routes ────────────────────────────────────────────────

  async listRoutes(
    params?: { networkID?: string; hostID?: string } & PaginationParams
  ): Promise<PaginatedResponse<DNRoute>> {
    return this.request("GET", "/routes", undefined, {
      networkID: params?.networkID,
      hostID: params?.hostID,
      cursor: params?.cursor,
      pageSize: params?.pageSize?.toString(),
    });
  }

  async getRoute(routeID: string): Promise<SingleResponse<DNRoute>> {
    return this.request("GET", `/routes/${encodeURIComponent(routeID)}`);
  }

  async createRoute(data: DNRouteCreate): Promise<SingleResponse<DNRoute>> {
    const routeData = normalizeRouteData(data);
    return this.request("POST", "/routes", routeData);
  }

  async updateRoute(
    routeID: string,
    data: DNRouteUpdate
  ): Promise<SingleResponse<DNRoute>> {
    return this.request("PUT", `/routes/${encodeURIComponent(routeID)}`, data);
  }

  async deleteRoute(routeID: string): Promise<void> {
    await this.request("DELETE", `/routes/${encodeURIComponent(routeID)}`);
  }

  // ─── Tags ───────────────────────────────────────────────────

  async listTags(
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<DNTag>> {
    return this.request("GET", "/tags", undefined, {
      cursor: pagination?.cursor,
      pageSize: pagination?.pageSize?.toString(),
    }, 2);
  }

  async getTag(tag: string): Promise<SingleResponse<DNTag>> {
    return this.request("GET", `/tags/${encodeURIComponent(tag)}`);
  }

  async createTag(data: DNTagCreate): Promise<SingleResponse<DNTag>> {
    return this.request("POST", "/tags", data);
  }

  async updateTag(
    tag: string,
    data: DNTagUpdate
  ): Promise<SingleResponse<DNTag>> {
    return this.request("PUT", `/tags/${encodeURIComponent(tag)}`, data);
  }

  async deleteTag(tag: string): Promise<void> {
    await this.request("DELETE", `/tags/${encodeURIComponent(tag)}`);
  }

  // ─── Audit Logs ────────────────────────────────────────────

  async listAuditLogs(
    params?: {
      actorType?: string;
      action?: string;
      targetType?: string;
      targetID?: string;
    } & PaginationParams
  ): Promise<PaginatedResponse<DNAuditLogEntry>> {
    return this.request("GET", "/audit-logs", undefined, {
      targetType: params?.targetType,
      targetID: params?.targetID,
      cursor: params?.cursor,
      pageSize: params?.pageSize?.toString(),
    });
  }

  // ─── Downloads ─────────────────────────────────────────────

  async listDownloads(): Promise<SingleResponse<DNDownloads>> {
    return this.request("GET", "/downloads");
  }
}

function normalizeRouteData(data: DNRouteCreate): DNRouteCreate {
  if (data.routerHostID || data.routableCIDRs) {
    return data;
  }

  const { hostID, network, networkID: _networkID, enabled, ...rest } = data;
  return {
    ...rest,
    routerHostID: hostID,
    routableCIDRs: network ? { [network]: { install: enabled ?? true } } : undefined,
  };
}
