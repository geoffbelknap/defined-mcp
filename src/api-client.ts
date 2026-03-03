import type { Config } from "./config.js";

export interface PaginationParams {
  cursor?: string;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
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
  name: string;
  cidr: string;
  signingCAID: string;
  createdAt: string;
  lighthouseCount?: number;
  hostCount?: number;
}

export interface DNHost {
  id: string;
  networkID: string;
  roleID?: string;
  name: string;
  ipAddress: string;
  staticAddresses: string[];
  listenPort: number;
  isLighthouse: boolean;
  isRelay: boolean;
  isBlocked: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface DNHostCreate {
  networkID: string;
  roleID?: string;
  name: string;
  ipAddress?: string;
  staticAddresses?: string[];
  listenPort?: number;
  isLighthouse?: boolean;
  isRelay?: boolean;
  tags?: string[];
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
  description?: string;
}

export interface DNFirewallRuleInput {
  protocol: string;
  port?: string;
  allowedRoleID?: string;
  allowedTag?: string;
  description?: string;
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
  networkID: string;
  hostID: string;
  network: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
}

export interface DNRouteCreate {
  networkID: string;
  hostID: string;
  network: string;
  description?: string;
  enabled?: boolean;
}

export interface DNTag {
  id: string;
  key: string;
  value: string;
  description?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface DNTagCreate {
  key: string;
  value: string;
  description?: string;
}

export interface DNAuditLogEntry {
  id: string;
  actorType: string;
  actorID: string;
  actorName: string;
  action: string;
  targetType: string;
  targetID: string;
  targetName: string;
  details?: Record<string, unknown>;
  createdAt: string;
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

export class DefinedAPIError extends Error {
  public statusCode: number;
  public requestId?: string;
  public errors?: Array<{ code: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    requestId?: string,
    errors?: Array<{ code: string; message: string }>
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
    queryParams?: Record<string, string | undefined>
  ): Promise<T> {
    const url = new URL(`/v1${path}`, this.baseUrl);

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
      let errorBody: any;
      try {
        errorBody = await response.json();
      } catch {
        throw new DefinedAPIError(
          `API request failed with status ${response.status}`,
          response.status,
          requestId
        );
      }

      const errors = errorBody?.errors;
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
    });
  }

  async getNetwork(networkID: string): Promise<SingleResponse<DNNetwork>> {
    return this.request("GET", `/networks/${networkID}`);
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
    });
  }

  async getHost(hostID: string): Promise<SingleResponse<DNHost>> {
    return this.request("GET", `/hosts/${hostID}`);
  }

  async createHost(data: DNHostCreate): Promise<SingleResponse<DNHost>> {
    return this.request("POST", "/hosts", data);
  }

  async updateHost(
    hostID: string,
    data: Partial<Pick<DNHost, "name" | "staticAddresses" | "listenPort" | "roleID" | "tags">>
  ): Promise<SingleResponse<DNHost>> {
    return this.request("PUT", `/hosts/${hostID}`, data);
  }

  async deleteHost(hostID: string): Promise<void> {
    await this.request("DELETE", `/hosts/${hostID}`);
  }

  async blockHost(hostID: string): Promise<SingleResponse<DNHost>> {
    return this.request("POST", `/hosts/${hostID}/block`);
  }

  async unblockHost(hostID: string): Promise<SingleResponse<DNHost>> {
    return this.request("POST", `/hosts/${hostID}/unblock`);
  }

  // ─── Enrollment ────────────────────────────────────────────

  async createHostAndEnrollCode(
    data: DNHostCreate
  ): Promise<SingleResponse<DNHostAndEnrollCode>> {
    return this.request("POST", "/host-and-enrollment-code", data);
  }

  async createEnrollmentCode(
    hostID: string,
    lifetimeSeconds?: number
  ): Promise<SingleResponse<DNEnrollmentCode>> {
    return this.request("POST", `/hosts/${hostID}/enrollment-code`, {
      lifetimeSeconds,
    });
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
    return this.request("GET", `/roles/${roleID}`);
  }

  async createRole(data: DNRoleCreate): Promise<SingleResponse<DNRole>> {
    return this.request("POST", "/roles", data);
  }

  async updateRole(
    roleID: string,
    data: Partial<DNRoleCreate>
  ): Promise<SingleResponse<DNRole>> {
    return this.request("PUT", `/roles/${roleID}`, data);
  }

  async deleteRole(roleID: string): Promise<void> {
    await this.request("DELETE", `/roles/${roleID}`);
  }

  // ─── Firewall Rules ────────────────────────────────────────

  async getRoleFirewallRules(
    roleID: string
  ): Promise<SingleResponse<DNFirewallRule[]>> {
    return this.request("GET", `/roles/${roleID}/firewall-rules`);
  }

  async updateRoleFirewallRules(
    roleID: string,
    rules: DNFirewallRuleInput[]
  ): Promise<SingleResponse<DNFirewallRule[]>> {
    return this.request("PUT", `/roles/${roleID}/firewall-rules`, {
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
    return this.request("GET", `/routes/${routeID}`);
  }

  async createRoute(data: DNRouteCreate): Promise<SingleResponse<DNRoute>> {
    return this.request("POST", "/routes", data);
  }

  async deleteRoute(routeID: string): Promise<void> {
    await this.request("DELETE", `/routes/${routeID}`);
  }

  // ─── Tags ───────────────────────────────────────────────────

  async listTags(
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<DNTag>> {
    return this.request("GET", "/tags", undefined, {
      cursor: pagination?.cursor,
      pageSize: pagination?.pageSize?.toString(),
    });
  }

  async getTag(tagID: string): Promise<SingleResponse<DNTag>> {
    return this.request("GET", `/tags/${tagID}`);
  }

  async createTag(data: DNTagCreate): Promise<SingleResponse<DNTag>> {
    return this.request("POST", "/tags", data);
  }

  async updateTag(
    tagID: string,
    data: Partial<DNTagCreate>
  ): Promise<SingleResponse<DNTag>> {
    return this.request("PUT", `/tags/${tagID}`, data);
  }

  async deleteTag(tagID: string): Promise<void> {
    await this.request("DELETE", `/tags/${tagID}`);
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
    return this.request("GET", "/audit-log", undefined, {
      actorType: params?.actorType,
      action: params?.action,
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
