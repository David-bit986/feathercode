import { create } from "zustand";

export type ArtifactKind =
  | "code-diff"
  | "architecture-diagram"
  | "task-report"
  | "test-results"
  | "api-spec"
  | "data-schema"
  | "documentation"
  | "custom";

export type ArtifactStatus = "draft" | "review" | "accepted" | "rejected";

export type ReviewComment = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  resolved: boolean;
};

export type ArtifactContent =
  | { type: "code-diff"; fileName: string; hunks: string }
  | { type: "architecture-diagram"; mermaidSource: string; format: "mermaid" }
  | { type: "task-report"; markdown: string }
  | { type: "test-results"; passed: number; failed: number; skipped: number; output: string }
  | { type: "api-spec"; spec: string; format: "openapi" | "graphql" }
  | { type: "data-schema"; schema: string; format: "prisma" | "sql" }
  | { type: "documentation"; markdown: string }
  | { type: "custom"; mimeType: string; data: string };

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  description: string;
  agentId: string;
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  status: ArtifactStatus;
  content: ArtifactContent;
  reviewComments: ReviewComment[];
  metadata: Record<string, string>;
};

type StoreState = {
  artifacts: Record<string, Artifact>;
  order: string[];

  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (id: string, patch: Partial<Artifact>) => void;
  removeArtifact: (id: string) => void;
  setStatus: (id: string, status: ArtifactStatus) => void;
  addComment: (artifactId: string, comment: ReviewComment) => void;
  resolveComment: (artifactId: string, commentId: string) => void;
  getBySession: (sessionId: string) => Artifact[];
  getByAgent: (agentId: string) => Artifact[];
  persistArtifact: (artifact: Artifact) => Promise<void>;
  loadArtifacts: (sessionId: string) => Promise<Artifact[]>;
};

const STORAGE_PREFIX = "artifacts_";
const STORAGE_INDEX_KEY = "artifacts_index";

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

async function readStorage(key: string): Promise<string | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke("plugin:store|get", { key });
  } catch {
    return localStorage.getItem(key);
  }
}

async function writeStorage(key: string, value: string): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("plugin:store|set", { key, value });
    await invoke("plugin:store|save", {});
  } catch {
    localStorage.setItem(key, value);
  }
}

export const useArtifactsStore = create<StoreState>((set, get) => ({
  artifacts: {},
  order: [],

  addArtifact: (artifact) =>
    set((s) => ({
      artifacts: { ...s.artifacts, [artifact.id]: artifact },
      order: [artifact.id, ...s.order],
    })),

  updateArtifact: (id, patch) =>
    set((s) => {
      const existing = s.artifacts[id];
      if (!existing) return s;
      return {
        artifacts: {
          ...s.artifacts,
          [id]: { ...existing, ...patch, updatedAt: Date.now() },
        },
      };
    }),

  removeArtifact: (id) =>
    set((s) => {
      const next = { ...s.artifacts };
      delete next[id];
      return {
        artifacts: next,
        order: s.order.filter((oid) => oid !== id),
      };
    }),

  setStatus: (id, status) =>
    set((s) => {
      const existing = s.artifacts[id];
      if (!existing) return s;
      return {
        artifacts: {
          ...s.artifacts,
          [id]: { ...existing, status, updatedAt: Date.now() },
        },
      };
    }),

  addComment: (artifactId, comment) =>
    set((s) => {
      const existing = s.artifacts[artifactId];
      if (!existing) return s;
      return {
        artifacts: {
          ...s.artifacts,
          [artifactId]: {
            ...existing,
            reviewComments: [...existing.reviewComments, comment],
            updatedAt: Date.now(),
          },
        },
      };
    }),

  resolveComment: (artifactId, commentId) =>
    set((s) => {
      const existing = s.artifacts[artifactId];
      if (!existing) return s;
      return {
        artifacts: {
          ...s.artifacts,
          [artifactId]: {
            ...existing,
            reviewComments: existing.reviewComments.map((c) =>
              c.id === commentId ? { ...c, resolved: true } : c,
            ),
            updatedAt: Date.now(),
          },
        },
      };
    }),

  getBySession: (sessionId) =>
    Object.values(get().artifacts).filter((a) => a.sessionId === sessionId),

  getByAgent: (agentId) =>
    Object.values(get().artifacts).filter((a) => a.agentId === agentId),

  persistArtifact: async (artifact) => {
    const key = storageKey(artifact.sessionId);
    const existing = await get().loadArtifacts(artifact.sessionId);
    const merged = [...existing.filter((a) => a.id !== artifact.id), artifact];
    await writeStorage(key, JSON.stringify(merged));

    const indexStr = await readStorage(STORAGE_INDEX_KEY);
    const index: string[] = indexStr ? JSON.parse(indexStr) : [];
    if (!index.includes(artifact.sessionId)) {
      index.push(artifact.sessionId);
      await writeStorage(STORAGE_INDEX_KEY, JSON.stringify(index));
    }
  },

  loadArtifacts: async (sessionId) => {
    const key = storageKey(sessionId);
    const raw = await readStorage(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as Artifact[];
    } catch {
      return [];
    }
  },
}));

export function generateArtifactId(): string {
  return `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
