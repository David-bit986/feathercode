import { create } from "zustand";

export type ScheduleKind = "cron" | "interval" | "event";

export type Schedule =
  | { type: "cron"; expression: string }
  | { type: "interval"; minutes: number }
  | { type: "event"; trigger: "git-push" | "file-change" | "manual" };

export type TaskRun = {
  id: string;
  startedAt: number;
  finishedAt: number | null;
  status: "running" | "done" | "error";
  output: string;
  error: string | null;
};

export type ScheduledTask = {
  id: string;
  name: string;
  instructions: string;
  schedule: Schedule;
  modelId: string;
  personaId: string | null;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number | null;
  runHistory: TaskRun[];
};

type StoreState = {
  tasks: Record<string, ScheduledTask>;
  order: string[];

  addTask: (task: ScheduledTask) => void;
  updateTask: (id: string, patch: Partial<ScheduledTask>) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string) => void;
  addRun: (taskId: string, run: TaskRun) => void;
  updateRun: (
    taskId: string,
    runId: string,
    patch: Partial<TaskRun>,
  ) => void;
  getEnabled: () => ScheduledTask[];
};

export const useSchedulerStore = create<StoreState>((set, get) => ({
  tasks: {},
  order: [],

  addTask: (task) =>
    set((s) => ({
      tasks: { ...s.tasks, [task.id]: task },
      order: [task.id, ...s.order],
    })),

  updateTask: (id, patch) =>
    set((s) => {
      const existing = s.tasks[id];
      if (!existing) return s;
      return {
        tasks: { ...s.tasks, [id]: { ...existing, ...patch } },
      };
    }),

  removeTask: (id) =>
    set((s) => {
      const next = { ...s.tasks };
      delete next[id];
      return {
        tasks: next,
        order: s.order.filter((tid) => tid !== id),
      };
    }),

  toggleTask: (id) =>
    set((s) => {
      const existing = s.tasks[id];
      if (!existing) return s;
      return {
        tasks: {
          ...s.tasks,
          [id]: { ...existing, enabled: !existing.enabled },
        },
      };
    }),

  addRun: (taskId, run) =>
    set((s) => {
      const existing = s.tasks[taskId];
      if (!existing) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...existing,
            lastRun: run.startedAt,
            runHistory: [run, ...existing.runHistory].slice(0, 20),
          },
        },
      };
    }),

  updateRun: (taskId, runId, patch) =>
    set((s) => {
      const existing = s.tasks[taskId];
      if (!existing) return s;
      return {
        tasks: {
          ...s.tasks,
          [taskId]: {
            ...existing,
            runHistory: existing.runHistory.map((r) =>
              r.id === runId ? { ...r, ...patch } : r,
            ),
          },
        },
      };
    }),

  getEnabled: () =>
    Object.values(get().tasks).filter((t) => t.enabled),
}));

export function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
