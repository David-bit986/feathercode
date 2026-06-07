import { create } from "zustand";

export type McpServerStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpResource = {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
};

export type McpServer = {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  status: McpServerStatus;
  error: string | null | undefined;
  tools: McpTool[];
  resources: McpResource[];
};

type StoreState = {
  servers: Record<string, McpServer>;
  order: string[];

  addServer: (server: McpServer) => void;
  updateServer: (id: string, patch: Partial<McpServer>) => void;
  removeServer: (id: string) => void;
  setStatus: (id: string, status: McpServerStatus, error?: string) => void;
  setTools: (id: string, tools: McpTool[]) => void;
  setResources: (id: string, resources: McpResource[]) => void;
  getConnected: () => McpServer[];
  getAllTools: () => Record<string, McpTool>;
};

export const useMcpStore = create<StoreState>((set, get) => ({
  servers: {},
  order: [],

  addServer: (server) =>
    set((s) => ({
      servers: { ...s.servers, [server.id]: server },
      order: [server.id, ...s.order],
    })),

  updateServer: (id, patch) =>
    set((s) => {
      const existing = s.servers[id];
      if (!existing) return s;
      return {
        servers: { ...s.servers, [id]: { ...existing, ...patch } },
      };
    }),

  removeServer: (id) =>
    set((s) => {
      const next = { ...s.servers };
      delete next[id];
      return {
        servers: next,
        order: s.order.filter((sid) => sid !== id),
      };
    }),

  setStatus: (id, status, error?) =>
    set((s) => {
      const existing = s.servers[id];
      if (!existing) return s;
      return {
        servers: {
          ...s.servers,
          [id]: { ...existing, status, error },
        },
      };
    }),

  setTools: (id, tools) =>
    set((s) => {
      const existing = s.servers[id];
      if (!existing) return s;
      return {
        servers: {
          ...s.servers,
          [id]: { ...existing, tools },
        },
      };
    }),

  setResources: (id, resources) =>
    set((s) => {
      const existing = s.servers[id];
      if (!existing) return s;
      return {
        servers: {
          ...s.servers,
          [id]: { ...existing, resources },
        },
      };
    }),

  getConnected: () =>
    Object.values(get().servers).filter((s) => s.status === "connected"),

  getAllTools: () => {
    const all: Record<string, McpTool> = {};
    for (const server of Object.values(get().servers)) {
      if (server.status !== "connected") continue;
      for (const tool of server.tools) {
        all[`mcp_${server.id}_${tool.name}`] = tool;
      }
    }
    return all;
  },
}));

export function generateMcpServerId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
