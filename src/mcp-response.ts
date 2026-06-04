import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { DefinedAPIError } from "./api-client.js";

type SideEffect = {
  type: string;
  resource?: {
    type: string;
    id: string;
  };
  [key: string]: unknown;
};

type ToolEnvelope = {
  schema_version: "ax.tool.v1";
  ok: boolean;
  operation: string;
  request_id: string;
  data?: unknown;
  metadata?: unknown;
  resource?: {
    type: string;
    id: string;
  };
  side_effects: SideEffect[];
  warnings: string[];
  observed_at: string;
};

type ToolErrorEnvelope = Omit<ToolEnvelope, "data" | "metadata"> & {
  error: {
    code: string;
    class: string;
    message: string;
    status_code?: number;
    request_id?: string;
    retryable: boolean;
    same_input_retryable: boolean;
    suggested_next_actions: string[];
    raw_errors?: unknown;
  };
};

export function toolSuccess(
  operation: string,
  result: unknown,
  options: {
    resource?: { type: string; id: string };
    sideEffects?: SideEffect[];
    warnings?: string[];
  } = {}
): CallToolResult {
  const response = result as { data?: unknown; metadata?: unknown };
  const envelope: ToolEnvelope = {
    schema_version: "ax.tool.v1",
    ok: true,
    operation,
    request_id: randomUUID(),
    data: response?.data ?? result,
    metadata: response?.metadata,
    resource: options.resource,
    side_effects: options.sideEffects ?? [],
    warnings: options.warnings ?? [],
    observed_at: new Date().toISOString(),
  };

  return {
    structuredContent: envelope,
    content: [
      {
        type: "text",
        text: JSON.stringify(envelope, null, 2),
      },
    ],
  };
}

export function toolDeleted(
  operation: string,
  resource: { type: string; id: string }
): CallToolResult {
  return toolSuccess(
    operation,
    { data: { deleted: true }, metadata: {} },
    {
      resource,
      sideEffects: [{ type: "deleted", resource }],
    }
  );
}

export function toolPlan(
  operation: string,
  plan: {
    action: string;
    resource?: { type: string; id: string };
    would_change: SideEffect[];
    required_confirmation: boolean;
  },
  warnings: string[] = []
): CallToolResult {
  return toolSuccess(
    operation,
    {
      data: {
        dry_run: true,
        ...plan,
      },
      metadata: {},
    },
    {
      resource: plan.resource,
      warnings,
    }
  );
}

export async function withToolError(
  operation: string,
  fn: () => Promise<CallToolResult>
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    return toolError(operation, error);
  }
}

function toolError(operation: string, error: unknown): CallToolResult {
  const mapped = mapError(error);
  const envelope: ToolErrorEnvelope = {
    schema_version: "ax.tool.v1",
    ok: false,
    operation,
    request_id: randomUUID(),
    error: mapped,
    side_effects: [],
    warnings: [],
    observed_at: new Date().toISOString(),
  };

  return {
    isError: true,
    structuredContent: envelope,
    content: [
      {
        type: "text",
        text: JSON.stringify(envelope, null, 2),
      },
    ],
  };
}

function mapError(error: unknown): ToolErrorEnvelope["error"] {
  if (error instanceof DefinedAPIError) {
    const errorCode = error.errors?.[0]?.code ?? statusCodeToCode(error.statusCode);
    const errorClass = statusCodeToClass(error.statusCode);
    const retryable = errorClass === "transient" || errorClass === "capacity";

    return {
      code: errorCode,
      class: errorClass,
      message: error.message,
      status_code: error.statusCode,
      request_id: error.requestId,
      retryable,
      same_input_retryable: retryable,
      suggested_next_actions: suggestedActions(errorClass),
      raw_errors: error.errors,
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    code: "internal_error",
    class: "internal",
    message,
    retryable: false,
    same_input_retryable: false,
    suggested_next_actions: ["Check server logs and retry after the implementation issue is resolved."],
  };
}

function statusCodeToCode(statusCode: number): string {
  if (statusCode === 400) return "invalid_input";
  if (statusCode === 401) return "unauthorized";
  if (statusCode === 403) return "forbidden";
  if (statusCode === 404) return "not_found";
  if (statusCode === 405) return "method_not_allowed";
  if (statusCode === 409) return "conflict";
  if (statusCode === 429) return "rate_limited";
  if (statusCode >= 500) return "upstream_error";
  return "api_error";
}

function statusCodeToClass(statusCode: number): string {
  if (statusCode === 400) return "input";
  if (statusCode === 401 || statusCode === 403) return "auth";
  if (statusCode === 404) return "not_found";
  if (statusCode === 405) return "unsupported";
  if (statusCode === 409) return "conflict";
  if (statusCode === 429) return "capacity";
  if (statusCode >= 500) return "transient";
  return "internal";
}

function suggestedActions(errorClass: string): string[] {
  switch (errorClass) {
    case "input":
      return ["Validate the input fields and retry with corrected values."];
    case "auth":
      return ["Verify the API key has the required Defined Networking scope."];
    case "not_found":
      return ["List resources to find a valid target ID or name before retrying."];
    case "unsupported":
      return ["Use a supported endpoint or tool for this operation."];
    case "conflict":
      return ["Inspect the current resource state before retrying the mutation."];
    case "capacity":
      return ["Retry later or reduce request rate/page size."];
    case "transient":
      return ["Retry the same request after a short delay."];
    default:
      return ["Check diagnostics before retrying."];
  }
}
