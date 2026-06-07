import { Check, FileEdit, Plus, Trash2, X } from "lucide-react";
import { useChatStore } from "../store/chatStore";
import { useMemo, useRef, useState } from "react";


import { cn } from "@/lib/utils";

export function SessionList() {
  const sessions = useChatStore((s) => s.sessions);
  const active = useChatStore((s) => s.activeSessionId);
  const switchSession = useChatStore((s) => s.switchSession);
  const newSession = useChatStore((s) => s.newSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const renameSession = useChatStore((s) => s.renameSession);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  return (
    <div className="flex h-full flex-col bg-card/50">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/40">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Chats
        </span>
        <button
          type="button"
          onClick={() => newSession()}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="New chat"
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            active={s.id === active}
            onSelect={() => switchSession(s.id)}
            onDelete={() => deleteSession(s.id)}
            onRename={(title) => renameSession(s.id, title)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
  onRename,
}: {
  session: { id: string; title: string; updatedAt: number };
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setDraft(session.title);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== session.title) onRename(trimmed);
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const dateLabel = formatDate(session.updatedAt);

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancelEdit();
          }}
          onBlur={commit}
          className="flex-1 min-w-0 rounded border border-border bg-background px-1.5 py-0.5 text-[11px] outline-none focus:border-primary"
          autoFocus
        />
        <button
          type="button"
          onClick={commit}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <Check size={11} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X size={11} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-1 px-2 py-1.5 text-left text-[11px] transition-colors",
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      <span className="flex-1 truncate">{session.title}</span>
      <span className="shrink-0 text-[9px] text-muted-foreground/60 tabular-nums">
        {dateLabel}
      </span>
      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
        <span
          role="button"
          tabIndex={0}
          onClick={startEdit}
          onKeyDown={(e) => { if (e.key === "Enter") startEdit(e as unknown as React.MouseEvent); }}
          className="rounded p-0.5 hover:bg-muted"
          title="Rename"
        >
          <FileEdit size={11} strokeWidth={1.75} />
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(); } }}
          className="rounded p-0.5 hover:bg-destructive/10 hover:text-destructive"
          title="Delete"
        >
          <Trash2 size={11} strokeWidth={1.75} />
        </span>
      </div>
    </button>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
