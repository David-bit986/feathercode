import type { McpServer, McpTool, McpResource } from "../store/mcpStore";
import { useMcpStore, generateMcpServerId } from "../store/mcpStore";

type McpServerConfig = {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
};

export function createMcpServer(config: McpServerConfig): McpServer {
  const id = generateMcpServerId();
  return {
    id,
    name: config.name,
    command: config.command,
    args: config.args,
    env: config.env ?? {},
    status: "disconnected",
    error: null,
    tools: [],
    resources: [],
  };
}

export async function startMcpServer(server: McpServer): Promise<void> {
  const store = useMcpStore.getState();
  store.setStatus(server.id, "connecting");

  try {
    const { invoke } = await import("@tauri-apps/api/core");

    await invoke("mcp_start_server", {
      id: server.id,
      command: server.command,
      args: server.args,
      env: server.env,
    });

    store.setStatus(server.id, "connected");

    await listMcpTools(server.id);
  } catch (err) {
    store.setStatus(server.id, "error", String(err));
  }
}

export async function stopMcpServer(serverId: string): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("mcp_stop_server", { serverId });
    useMcpStore.getState().setStatus(serverId, "disconnected");
  } catch (err) {
    console.error(`Failed to stop MCP server ${serverId}:`, err);
  }
}

async function listMcpTools(serverId: string): Promise<void> {
  try {
    const tools = await sendMcpRequest<ToolListResult>(serverId, "tools/list");
    const mapped: McpTool[] = (tools.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? "",
      inputSchema: t.inputSchema ?? {},
    }));
    useMcpStore.getState().setTools(serverId, mapped);
  } catch {
    // Server may not support tools
  }

  try {
    const resources = await sendMcpRequest<ResourceListResult>(
      serverId,
      "resources/list",
    );
    const mapped: McpResource[] = (resources.resources ?? []).map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }));
    useMcpStore.getState().setResources(serverId, mapped);
  } catch {
    // Server may not support resources
  }
}

type ToolListResult = {
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
  }>;
};

type ResourceListResult = {
  resources: Array<{
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
  }>;
};

let requestId = 0;

async function sendMcpRequest<T>(
  serverId: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const id = ++requestId;
  const request = JSON.stringify({
    jsonrpc: "2.0",
    method,
    params,
    id,
  });

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<string>("mcp_send_request", {
      id: serverId,
      request,
    });

    const response = JSON.parse(result) as {
      result?: T;
      error?: { code: number; message: string };
    };
    if (response.error) {
      throw new Error(
        `MCP Error [${response.error.code}]: ${response.error.message}`,
      );
    }

    return response.result as T;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(`MCP request failed: ${String(err)}`);
  }
}

export async function callMcpTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const result = await sendMcpRequest<ToolCallResult>(serverId, "tools/call", {
    name: toolName,
    arguments: args,
  });

  if (result.content && result.content.length > 0) {
    return result.content
      .map((c) => (c.type === "text" ? c.text ?? "" : `[${c.type}]`))
      .join("\n");
  }

  return JSON.stringify(result);
}

type ToolCallResult = {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
};
