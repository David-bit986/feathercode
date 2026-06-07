import { useSyncExternalStore, useCallback } from "react";
import {
  useMissionControlStore,
  type AgentInstance,
} from "../store/missionControlStore";

export function useAgentPool() {
  const subscribe = useCallback(
    (cb: () => void) => useMissionControlStore.subscribe(() => cb()),
    [],
  );

  const pool = useSyncExternalStore(
    subscribe,
    () => useMissionControlStore.getState().activePool,
  );

  const agents = pool?.order
    .map((id) => pool.agents[id])
    .filter(Boolean) as AgentInstance[] | undefined;

  return {
    pool,
    agents: agents ?? [],
    isRunning: pool?.status === "running",
    isDone: pool?.status === "done",
    hasError: pool?.status === "error",
  };
}

export function useAgentSubscription(agentId: string) {
  const subscribe = useCallback(
    (cb: () => void) => useMissionControlStore.subscribe(() => cb()),
    [],
  );

  return useSyncExternalStore(
    subscribe,
    () => useMissionControlStore.getState().activePool?.agents[agentId] ?? null,
  );
}
