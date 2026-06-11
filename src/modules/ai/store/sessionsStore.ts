import type { Chat, UIMessage } from "@ai-sdk/react";
import { create } from "zustand";
import { useTodosStore } from "./todoStore";
import {
  deleteSessionData,
  deriveTitle,
  loadAll,
  loadMessages,
  newSessionId,
  saveActiveId,
  saveMessages,
  saveSessionsList,
  type SessionMeta,
} from "../lib/sessions";
import { useAgentMetaStore } from "./agentMetaStore";

const CHATS_LRU_CAP = 8;
export const chats = new Map<string, Chat<UIMessage>>();

export function touchChat(id: string, c: Chat<UIMessage>) {
  if (chats.has(id)) chats.delete(id);
  chats.set(id, c);
  while (chats.size > CHATS_LRU_CAP) {
    const oldest = chats.keys().next().value;
    if (!oldest || oldest === id) break;
    if (useSessionsStore.getState().activeSessionId === oldest) break;
    flushPersistEntry(oldest);
    void chats.get(oldest)?.stop();
    chats.delete(oldest);
  }
}

export const seedMessages = new Map<string, UIMessage[]>();

const PERSIST_DEBOUNCE_MS = 300;
const pendingPersist = new Map<
  string,
  { latest: UIMessage[]; timer: ReturnType<typeof setTimeout> }
>();

function flushPersistEntry(id: string) {
  const entry = pendingPersist.get(id);
  if (!entry) return;
  clearTimeout(entry.timer);
  pendingPersist.delete(id);
  const pp = useSessionsStore.getState().currentProjectPath;
  if (pp) void saveMessages(pp, id, entry.latest);
}

export function flushPersist(id?: string): void {
  if (id) {
    flushPersistEntry(id);
    return;
  }
  for (const key of Array.from(pendingPersist.keys())) flushPersistEntry(key);
}

type SessionsState = {
  currentProjectPath: string | null;
  sessionsHydrated: boolean;
  sessions: SessionMeta[];
  activeSessionId: string | null;

  hydrateSessions: (projectPath?: string | null) => Promise<void>;
  newSession: () => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  persistMessages: (id: string, messages: UIMessage[]) => void;
};

export const useSessionsStore = create<SessionsState>((set, get) => ({
  currentProjectPath: null,
  sessionsHydrated: false,
  sessions: [],
  activeSessionId: null,

  hydrateSessions: async (projectPath) => {
    if (!projectPath) return;
    const { currentProjectPath } = get();
    if (currentProjectPath === projectPath && get().sessionsHydrated) return;
    const { sessions } = await loadAll(projectPath);

    const reusable = sessions[0]?.title === "New chat" ? sessions[0] : null;
    let nextSessions: SessionMeta[];
    let freshId: string;
    if (reusable) {
      nextSessions = sessions;
      freshId = reusable.id;
    } else {
      freshId = newSessionId();
      const fresh: SessionMeta = {
        id: freshId,
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectPath: projectPath ?? undefined,
      };
      nextSessions = [fresh, ...sessions];
      void saveSessionsList(projectPath, nextSessions);
    }
    void saveActiveId(projectPath, freshId);

    set({
      currentProjectPath: projectPath,
      sessions: nextSessions,
      activeSessionId: freshId,
      sessionsHydrated: true,
    });
  },

  newSession: () => {
    const id = newSessionId();
    const projectPath = get().currentProjectPath;
    const meta: SessionMeta = {
      id,
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      projectPath: projectPath ?? undefined,
    };
    const next = [meta, ...get().sessions];
    set({ sessions: next, activeSessionId: id });
    useAgentMetaStore.getState().resetAgentMeta();
    if (projectPath) {
      void saveSessionsList(projectPath, next);
      void saveActiveId(projectPath, id);
    }
    return id;
  },

  switchSession: (id) => {
    if (get().activeSessionId === id) return;
    if (!get().sessions.some((s) => s.id === id)) return;

    const flip = () => {
      set({ activeSessionId: id });
      useAgentMetaStore.getState().resetAgentMeta();
      const pp = get().currentProjectPath;
      if (pp) void saveActiveId(pp, id);
    };
    if (chats.has(id) || seedMessages.has(id)) {
      flip();
      return;
    }
    const projectPath = get().currentProjectPath;
    if (!projectPath) {
      flip();
      return;
    }
    void loadMessages(projectPath, id).then((m) => {
      if (m && m.length > 0 && !chats.has(id)) seedMessages.set(id, m);
      flip();
    });
  },

  deleteSession: (id) => {
    const projectPath = get().currentProjectPath;
    const remaining = get().sessions.filter((s) => s.id !== id);
    chats.get(id)?.stop();
    chats.delete(id);
    seedMessages.delete(id);
    const pend = pendingPersist.get(id);
    if (pend) {
      clearTimeout(pend.timer);
      pendingPersist.delete(id);
    }
    if (projectPath) void deleteSessionData(projectPath, id);
    void useTodosStore.getState().clearSession(id);

    if (remaining.length === 0) {
      const fresh: SessionMeta = {
        id: newSessionId(),
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        projectPath: projectPath ?? undefined,
      };
      const next = [fresh];
      set({ sessions: next, activeSessionId: fresh.id });
      if (projectPath) {
        void saveSessionsList(projectPath, next);
        void saveActiveId(projectPath, fresh.id);
      }
      return;
    }

    const wasActive = get().activeSessionId === id;
    const nextActive = wasActive ? remaining[0].id : get().activeSessionId;
    set({ sessions: remaining, activeSessionId: nextActive });
    if (projectPath) {
      void saveSessionsList(projectPath, remaining);
      if (wasActive) void saveActiveId(projectPath, nextActive);
    }
  },

  renameSession: (id, title) => {
    const next = get().sessions.map((s) =>
      s.id === id ? { ...s, title, updatedAt: Date.now() } : s,
    );
    set({ sessions: next });
    const pp = get().currentProjectPath;
    if (pp) void saveSessionsList(pp, next);
  },

  persistMessages: (id, messages) => {
    const projectPath = get().currentProjectPath;
    const existing = pendingPersist.get(id);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      const entry = pendingPersist.get(id);
      if (!entry) return;
      pendingPersist.delete(id);
      if (projectPath) void saveMessages(projectPath, id, entry.latest);
    }, PERSIST_DEBOUNCE_MS);
    pendingPersist.set(id, { latest: messages, timer });

    const sessions = get().sessions;
    const meta = sessions.find((s) => s.id === id);
    if (!meta) return;
    const isUntitled = !meta.title || meta.title === "New chat";
    if (!isUntitled) return;
    const nextTitle = deriveTitle(messages);
    if (nextTitle === meta.title) return;
    const next = sessions.map((s) =>
      s.id === id ? { ...s, title: nextTitle, updatedAt: Date.now() } : s,
    );
    set({ sessions: next });
    if (projectPath) void saveSessionsList(projectPath, next);
  },
}));

export function getChat(sessionId?: string): Chat<UIMessage> | undefined {
  if (sessionId) return chats.get(sessionId);
  const id = useSessionsStore.getState().activeSessionId;
  return id ? chats.get(id) : undefined;
}

export function stop(): void {
  const id = useSessionsStore.getState().activeSessionId;
  if (!id) return;
  void chats.get(id)?.stop();
}
