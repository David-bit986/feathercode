import { useCallback } from "react";
import {
  useMissionControlStore,
  generateAgentId,
} from "../store/missionControlStore";
import {
  decomplexTask,
  runSingleAgent,
  runAgentPool,
} from "../lib/orchestrator";
import type { ProviderKeys } from "../lib/keyring";
import type { ToolContext } from "../tools/context";
import { buildConfiguredLanguageModel } from "../lib/agent";

export function useAgentOrchestrator() {
  const store = useMissionControlStore();

  const createMission = useCallback(
    async (
      request: string,
      config: {
        keys: ProviderKeys;
        modelId: string;
        toolContext: ToolContext;
        missionName?: string;
        maxConcurrency?: number;
      },
    ) => {
      const missionId = crypto.randomUUID();
      store.createPool(
        missionId,
        config.missionName ?? "New Mission",
        config.maxConcurrency ?? 4,
      );

      store.setPoolStatus("running");

      const model = await buildConfiguredLanguageModel(
        config.modelId,
        config.keys,
      );

      const tasks = await decomplexTask(request, model);

      runAgentPool(
        tasks,
        {
          keys: config.keys,
          modelId: config.modelId,
          toolContext: config.toolContext,
          maxConcurrency: config.maxConcurrency,
          artifactSessionId: missionId,
        },
      ).catch(() => {
        store.setPoolStatus("error");
      });
    },
    [store],
  );

  const cancelMission = useCallback(() => {
    store.cancelAll();
  }, [store]);

  const spawnSingleAgent = useCallback(
    async (
      name: string,
      goal: string,
      instructions: string,
      config: {
        keys: ProviderKeys;
        modelId: string;
        toolContext: ToolContext;
        tools?: string[];
        maxSteps?: number;
      },
    ) => {
      const agentId = generateAgentId();
      const ac = new AbortController();

      store.addAgent({
        id: agentId,
        name,
        goal,
        status: "pending",
        modelId: config.modelId,
        step: null,
        stepCount: 0,
        maxSteps: config.maxSteps ?? 16,
        startedAt: Date.now(),
        finishedAt: null,
        error: null,
        artifacts: [],
        abortController: ac,
      });

      const gen = runSingleAgent({
        agentId,
        name,
        goal,
        instructions,
        keys: config.keys,
        modelId: config.modelId,
        toolContext: config.toolContext,
        tools: config.tools,
        maxSteps: config.maxSteps,
        abortSignal: ac.signal,
      });

      (async () => {
        for await (const event of gen) {
          if (event.type === "error") {
            store.updateAgent(agentId, {
              status: "error",
              error: event.error ?? "Unknown error",
              finishedAt: Date.now(),
            });
          }
        }
      })().catch((err: Error) => {
        store.updateAgent(agentId, {
          status: "error",
          error: String(err),
          finishedAt: Date.now(),
        });
      });

      return agentId;
    },
    [store],
  );

  return {
    activePool: store.activePool,
    createMission,
    cancelMission,
    spawnSingleAgent,
  };
}
