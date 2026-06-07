import { create } from "zustand";
import type { UIMessage } from "@ai-sdk/react";

export type AgentInstanceStatus =
  | "pending"
  | "planning"
  | "executing"
  | "reviewing"
  | "done"
  | "error"
  | "cancelled";

export type AgentInstance = {
  id: string;
  name: string;
  goal: string;
  status: AgentInstanceStatus;
  modelId: string;
  step: string | null;
  stepCount: number;
  maxSteps: number;
  startedAt: number;
  finishedAt: number | null;
  error: string | null;
  artifacts: string[];
  abortController: AbortController | null;
};

export type AgentPool = {
  missionId: string;
  missionName: string;
  agents: Record<string, AgentInstance>;
  order: string[];
  status: "idle" | "running" | "done" | "error";
  startedAt: number | null;
  finishedAt: number | null;
  maxConcurrency: number;
};

type StoreState = {
  activePool: AgentPool | null;
  pools: AgentPool[];

  setActivePool: (pool: AgentPool | null) => void;
  createPool: (
    missionId: string,
    missionName: string,
    maxConcurrency?: number,
  ) => AgentPool;
  addAgent: (agent: AgentInstance) => void;
  updateAgent: (
    agentId: string,
    patch: Partial<AgentInstance>,
  ) => void;
  removeAgent: (agentId: string) => void;
  cancelAgent: (agentId: string) => void;
  cancelAll: () => void;
  setPoolStatus: (
    status: AgentPool["status"],
  ) => void;
  addArtifactToAgent: (agentId: string, artifactId: string) => void;
  getAgentMessages: (agentId: string) => UIMessage[];
  setAgentMessages: (agentId: string, messages: UIMessage[]) => void;
  appendAgentMessages: (agentId: string, messages: UIMessage[]) => void;
};

let missionCounter = 0;

const agentMessages = new Map<string, UIMessage[]>();

export const useMissionControlStore = create<StoreState>((set, get) => ({
  activePool: null,
  pools: [],

  setActivePool: (pool) => set({ activePool: pool }),

  createPool: (missionId, missionName, maxConcurrency = 4) => {
    const pool: AgentPool = {
      missionId,
      missionName,
      agents: {},
      order: [],
      status: "idle",
      startedAt: null,
      finishedAt: null,
      maxConcurrency,
    };
    set((s) => ({
      activePool: pool,
      pools: [pool, ...s.pools],
    }));
    return pool;
  },

  addAgent: (agent) =>
    set((s) => {
      if (!s.activePool) return s;
      const agents = { ...s.activePool.agents, [agent.id]: agent };
      const order = [...s.activePool.order, agent.id];
      const updated: AgentPool = { ...s.activePool, agents, order };
      return {
        activePool: updated,
        pools: s.pools.map((p) =>
          p.missionId === updated.missionId ? updated : p,
        ),
      };
    }),

  updateAgent: (agentId, patch) =>
    set((s) => {
      if (!s.activePool) return s;
      const existing = s.activePool.agents[agentId];
      if (!existing) return s;
      const updated = { ...existing, ...patch };
      const agents = { ...s.activePool.agents, [agentId]: updated };
      const poolUpdated: AgentPool = { ...s.activePool, agents };

      if (
        updated.status === "done" ||
        updated.status === "error" ||
        updated.status === "cancelled"
      ) {
        const allDone = Object.values(agents).every(
          (a) =>
            a.status === "done" ||
            a.status === "error" ||
            a.status === "cancelled",
        );
        if (allDone) {
          poolUpdated.status = "done";
          poolUpdated.finishedAt = Date.now();
        }
      }

      return {
        activePool: poolUpdated,
        pools: s.pools.map((p) =>
          p.missionId === poolUpdated.missionId ? poolUpdated : p,
        ),
      };
    }),

  removeAgent: (agentId) =>
    set((s) => {
      if (!s.activePool) return s;
      const agents = { ...s.activePool.agents };
      delete agents[agentId];
      const order = s.activePool.order.filter((id) => id !== agentId);
      const updated: AgentPool = { ...s.activePool, agents, order };
      return {
        activePool: updated,
        pools: s.pools.map((p) =>
          p.missionId === updated.missionId ? updated : p,
        ),
      };
    }),

  cancelAgent: (agentId) => {
    const pool = get().activePool;
    if (!pool) return;
    const agent = pool.agents[agentId];
    if (agent?.abortController) {
      agent.abortController.abort();
    }
    get().updateAgent(agentId, {
      status: "cancelled",
      finishedAt: Date.now(),
    });
  },

  cancelAll: () => {
    const pool = get().activePool;
    if (!pool) return;
    for (const agent of Object.values(pool.agents)) {
      if (agent.abortController) {
        agent.abortController.abort();
      }
    }
    set((s) => {
      if (!s.activePool) return s;
      const agents: Record<string, AgentInstance> = {};
      for (const [id, a] of Object.entries(s.activePool.agents)) {
        agents[id] = {
          ...a,
          status: "cancelled",
          finishedAt: Date.now(),
        };
      }
      const updated: AgentPool = {
        ...s.activePool,
        agents,
        status: "done",
        finishedAt: Date.now(),
      };
      return {
        activePool: updated,
        pools: s.pools.map((p) =>
          p.missionId === updated.missionId ? updated : p,
        ),
      };
    });
  },

  setPoolStatus: (status) =>
    set((s) => {
      if (!s.activePool) return s;
      const updated: AgentPool = {
        ...s.activePool,
        status,
        ...(status === "running" && !s.activePool.startedAt
          ? { startedAt: Date.now() }
          : {}),
      };
      return {
        activePool: updated,
        pools: s.pools.map((p) =>
          p.missionId === updated.missionId ? updated : p,
        ),
      };
    }),

  addArtifactToAgent: (agentId, artifactId) =>
    set((s) => {
      if (!s.activePool) return s;
      const existing = s.activePool.agents[agentId];
      if (!existing) return s;
      const agents = {
        ...s.activePool.agents,
        [agentId]: {
          ...existing,
          artifacts: [...existing.artifacts, artifactId],
        },
      };
      const updated: AgentPool = { ...s.activePool, agents };
      return {
        activePool: updated,
        pools: s.pools.map((p) =>
          p.missionId === updated.missionId ? updated : p,
        ),
      };
    }),

  getAgentMessages: (agentId) => agentMessages.get(agentId) ?? [],

  setAgentMessages: (agentId, messages) => {
    agentMessages.set(agentId, messages);
  },

  appendAgentMessages: (agentId, messages) => {
    const existing = agentMessages.get(agentId) ?? [];
    agentMessages.set(agentId, [...existing, ...messages]);
  },
}));

export function generateAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateMissionId(): string {
  missionCounter++;
  return `mission-${Date.now()}-${missionCounter}`;
}
