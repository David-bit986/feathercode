import type { UIMessage } from "@ai-sdk/react";
import { LazyStore } from "@tauri-apps/plugin-store";

export type SessionMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  projectPath?: string;
};

const STORE_PREFIX = "fc-ai-sessions";
const KEY_SESSIONS = "sessions";
const KEY_ACTIVE = "activeId";
const messagesKey = (id: string) => `messages:${id}`;

const stores = new Map<string, LazyStore>();

function getStore(projectPath: string): LazyStore {
  const normalized = projectPath.replace(/\\/g, "/").replace(/[^a-zA-Z0-9\-/_.]/g, "_");
  // Simple hash to keep filenames short
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  const key = `${STORE_PREFIX}-${Math.abs(hash).toString(36)}.json`;
  if (!stores.has(key)) {
    stores.set(key, new LazyStore(key, { defaults: {}, autoSave: 200 }));
  }
  return stores.get(key)!;
}

export type LoadedSessions = {
  sessions: SessionMeta[];
  activeId: string | null;
};

export async function loadAll(projectPath: string): Promise<LoadedSessions> {
  const store = getStore(projectPath);
  const entries = await store.entries();
  let sessions: SessionMeta[] | undefined;
  let activeId: string | null | undefined;
  for (const [k, v] of entries) {
    if (k === KEY_SESSIONS) sessions = v as SessionMeta[];
    else if (k === KEY_ACTIVE) activeId = v as string | null;
  }
  return { sessions: (sessions ?? []).filter(s => !s.projectPath || s.projectPath === projectPath), activeId: activeId ?? null };
}

export async function loadMessages(projectPath: string, id: string): Promise<UIMessage[] | null> {
  const store = getStore(projectPath);
  return (await store.get<UIMessage[]>(messagesKey(id))) ?? null;
}

export async function saveSessionsList(projectPath: string, sessions: SessionMeta[]): Promise<void> {
  const store = getStore(projectPath);
  await store.set(KEY_SESSIONS, sessions);
}

export async function saveActiveId(projectPath: string, id: string | null): Promise<void> {
  const store = getStore(projectPath);
  await store.set(KEY_ACTIVE, id);
}

export async function saveMessages(
  projectPath: string,
  id: string,
  messages: UIMessage[],
): Promise<void> {
  const store = getStore(projectPath);
  await store.set(messagesKey(id), messages);
}

export async function deleteSessionData(projectPath: string, id: string): Promise<void> {
  const store = getStore(projectPath);
  await store.delete(messagesKey(id));
}

export function newSessionId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function deriveTitle(messages: UIMessage[]): string {
  for (const m of messages) {
    if (m.role !== "user") continue;
    for (const p of m.parts) {
      if (p.type !== "text") continue;
      const text = (p as { text: string }).text
        .replace(/<terminal-context[\s\S]*?<\/terminal-context>\s*/g, "")
        .replace(/<selection[\s\S]*?<\/selection>\s*/g, "")
        .replace(/<file[\s\S]*?<\/file>\s*/g, "")
        .trim();
      if (!text) continue;
      const first = text.split("\n")[0].trim();
      return first.length > 40 ? `${first.slice(0, 40)}…` : first;
    }
  }
  return "New chat";
}
