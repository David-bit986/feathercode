import { stepCountIs, streamText, type LanguageModel } from "ai";
import type { ProviderKeys } from "./keyring";
import { buildConfiguredLanguageModel } from "./agent";
import { buildTools, type ToolContext } from "../tools/tools";
import {
  useMissionControlStore,
} from "../store/missionControlStore";

export type SpawnConfig = {
  name: string;
  goal: string;
  instructions: string;
  modelId?: string;
  keys: ProviderKeys;
  toolContext: ToolContext;
  tools?: string[];
  maxSteps?: number;
};

const DEFAULT_MAX_STEPS = 16;

const ORCHESTRATOR_SYSTEM_PROMPT = `You are a task orchestrator. Decompose the user's request into parallel tasks.

For each task, output:
1. **Agent name**: short, descriptive (e.g., "DB Schema Designer")
2. **Goal**: one-line description
3. **Instructions**: detailed instructions for the agent

Rules:
- Tasks should be independent where possible for parallel execution
- Each task should produce a concrete, reviewable artifact
- Limit to 2-5 tasks

Return ONLY valid JSON: { "tasks": [{ "name": string, "goal": string, "instructions": string, "dependsOn": string[] }] }`;

function shortPath(p: unknown): string {
  if (typeof p !== "string") return "";
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

function ellipsize(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
}

const STEP_LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  read_file: (i) => `Reading ${shortPath(i.path)}`,
  list_directory: (i) => `Listing ${shortPath(i.path)}`,
  grep: (i) => `Grepping ${ellipsize(String(i.pattern ?? ""), 40)}`,
  glob: (i) => `Globbing ${ellipsize(String(i.pattern ?? ""), 40)}`,
  edit: (i) => `Editing ${shortPath(i.path)}`,
  multi_edit: (i) => `Editing ${shortPath(i.path)}`,
  write_file: (i) => `Writing ${shortPath(i.path)}`,
  create_directory: (i) => `Creating ${shortPath(i.path)}`,
  bash_run: (i) => `Running ${ellipsize(String(i.command ?? ""), 60)}`,
  bash_background: (i) => `Spawning ${ellipsize(String(i.command ?? ""), 60)}`,
  todo_write: (i) => `Updating plan (${Array.isArray(i.todos) ? i.todos.length : 0} items)`,
  run_subagent: (i) => `Spawning ${String(i.type ?? "subagent")} subagent`,
};

type TaskDef = {
  name: string;
  goal: string;
  instructions: string;
  dependsOn: string[];
};

export async function decomplexTask(
  request: string,
  model: LanguageModel,
): Promise<TaskDef[]> {
  const { generateText } = await import("ai");
  const result = await generateText({
    model,
    system: ORCHESTRATOR_SYSTEM_PROMPT,
    prompt: `Decompose this request into parallel tasks:\n\n${request}`,
  });

  const text = result.text;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackParse(text);
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) return fallbackParse(text);
    return parsed.tasks.map(
      (t: { name: string; goal: string; instructions: string; dependsOn: string[] }) => ({
        name: t.name,
        goal: t.goal,
        instructions: t.instructions,
        dependsOn: t.dependsOn ?? [],
      }),
    );
  } catch {
    return fallbackParse(text);
  }
}

function fallbackParse(text: string): TaskDef[] {
  const lines = text.split("\n");
  const tasks: TaskDef[] = [];
  let current: TaskDef | null = null;

  for (const line of lines) {
    const nameMatch = line.match(/^(?:Agent|Task)\s*(?:\d+)?[:-]\s*(.+)/i);
    if (nameMatch) {
      if (current) tasks.push(current);
      current = {
        name: nameMatch[1].trim(),
        goal: "",
        instructions: "",
        dependsOn: [],
      };
    } else if (current) {
      const goalMatch = line.match(/^(?:Goal|Objective)[:-]\s*(.+)/i);
      if (goalMatch) {
        current.goal = goalMatch[1].trim();
      } else {
        current.instructions += line + "\n";
      }
    }
  }
  if (current) tasks.push(current);
  return tasks.map((t) => ({
    ...t,
    instructions: t.instructions.trim() || t.goal,
  }));
}

export async function* runSingleAgent(config: {
  agentId: string;
  name: string;
  goal: string;
  instructions: string;
  keys: ProviderKeys;
  modelId: string;
  toolContext: ToolContext;
  tools?: string[];
  maxSteps?: number;
  abortSignal: AbortSignal;
}): AsyncGenerator<{
  type: "step" | "artifact" | "done" | "error";
  step?: string;
  error?: string;
}> {
  const store = useMissionControlStore.getState();
  const maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS;

  store.updateAgent(config.agentId, { status: "planning", step: "Initializing..." });

  try {
    const model = await buildConfiguredLanguageModel(
      config.modelId,
      config.keys,
    );

    const systemPrompt = buildSystemPrompt(config);

    const allTools = buildTools(config.toolContext) as Record<string, unknown>;
    const tools = config.tools
      ? filterTools(allTools, config.tools)
      : allTools;

    const result = streamText({
      model,
      system: systemPrompt,
      prompt: config.instructions,
      tools: tools as Parameters<typeof streamText>[0]["tools"],
      stopWhen: stepCountIs(maxSteps),
      abortSignal: config.abortSignal,
      onStepFinish: (step) => {
        if (config.abortSignal.aborted) return;
        const last = step.toolCalls?.[step.toolCalls.length - 1];
        if (last) {
          const label = STEP_LABELS[last.toolName];
          const stepLabel = label
            ? label((last.input ?? {}) as Record<string, unknown>)
            : `Calling ${last.toolName}`;
          store.updateAgent(config.agentId, {
            status: "executing",
            step: stepLabel,
            stepCount: (store.activePool?.agents[config.agentId]?.stepCount ?? 0) + 1,
          });
        } else if (step.text) {
          store.updateAgent(config.agentId, {
            status: "executing",
            step: "Writing",
          });
        }
      },
    });

    for await (const _chunk of result.fullStream) {
      if (config.abortSignal.aborted) break;
    }

    // consume the stream result to trigger onFinish
    await result;

    if (!config.abortSignal.aborted) {
      store.updateAgent(config.agentId, {
        status: "done",
        step: null,
        finishedAt: Date.now(),
      });
      yield { type: "done" };
    }
  } catch (err) {
    if (config.abortSignal.aborted) {
      store.updateAgent(config.agentId, {
        status: "cancelled",
        finishedAt: Date.now(),
      });
      return;
    }
    store.updateAgent(config.agentId, {
      status: "error",
      error: String(err),
      finishedAt: Date.now(),
    });
    yield { type: "error", error: String(err) };
  }
}

function buildSystemPrompt(config: {
  name: string;
  goal: string;
}): string {
  return `You are agent "${config.name}" working on: "${config.goal}"

Complete your task and summarize what you did. Be thorough but concise.`;
}

function filterTools(
  allTools: Record<string, unknown>,
  allowed: string[],
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const name of allowed) {
    if (name in allTools) filtered[name] = allTools[name];
  }
  return filtered;
}

export async function runAgentPool(
  tasks: TaskDef[],
  config: {
    keys: ProviderKeys;
    modelId: string;
    toolContext: ToolContext;
    maxConcurrency?: number;
    artifactSessionId: string;
  },
  abortSignal?: AbortSignal,
) {
  const store = useMissionControlStore.getState();
  const concurrency = config.maxConcurrency ?? 4;

  const agentIds: string[] = [];
  for (const task of tasks) {
    const agentId = crypto.randomUUID();
    agentIds.push(agentId);
    store.addAgent({
      id: agentId,
      name: task.name,
      goal: task.goal,
      status: "pending",
      modelId: config.modelId,
      step: null,
      stepCount: 0,
      maxSteps: DEFAULT_MAX_STEPS,
      startedAt: Date.now(),
      finishedAt: null,
      error: null,
      artifacts: [],
      abortController: null,
    });
  }

  store.setPoolStatus("running");

  const semaphore = new Semaphore(concurrency);
  const promises = tasks.map((task, i) =>
    semaphore.acquire(async () => {
      if (abortSignal?.aborted) return;
      const agentId = agentIds[i];

      store.updateAgent(agentId, { status: "planning" });

      const ac = new AbortController();
      store.updateAgent(agentId, { abortController: ac });

      const gen = runSingleAgent({
        agentId,
        name: task.name,
        goal: task.goal,
        instructions: task.instructions,
        keys: config.keys,
        modelId: config.modelId,
        toolContext: config.toolContext,
        abortSignal: ac.signal,
      });

      for await (const _event of gen) {
        if (ac.signal.aborted) break;
      }
    }),
  );

  await Promise.allSettled(promises);
}

class Semaphore {
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(private max: number) {}

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
