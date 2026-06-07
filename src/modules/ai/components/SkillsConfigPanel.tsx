import {  Folder, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useSkillsStore } from "../store/skillsStore";
import { cn } from "@/lib/utils";


import type { Skill, SkillSource } from "../lib/skills";

export function SkillsConfigPanel() {
  const skills = useSkillsStore((s) => s.skills);
  const add = useSkillsStore((s) => s.add);
  const remove = useSkillsStore((s) => s.remove);
  const toggle = useSkillsStore((s) => s.toggle);
  const importFromPath = useSkillsStore((s) => s.importFromPath);
  const [showNew, setShowNew] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const handleImportFromFolder = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;
    const count = await importFromPath(selected);
    if (count > 0) {
      setImportMsg(`Imported ${count} skill${count > 1 ? "s" : ""} from folder`);
    } else {
      setImportMsg("No valid SKILL.md files found in the selected folder.");
    }
    setTimeout(() => setImportMsg(null), 3000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-3 py-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Skills
        </h2>
        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="rounded px-2 py-1 text-[11px] font-medium text-primary hover:bg-accent"
        >
          <Plus size={12} strokeWidth={2} className="inline mr-1" />
          New
        </button>
      </div>

      {importMsg && (
        <div className="shrink-0 bg-accent/50 px-3 py-1.5 text-[11px] text-foreground border-b border-border/40">
          {importMsg}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 border-b border-border/40 px-3 py-1.5">
        <ImportButton
          icon={Folder}
          label="Import from folder…"
          onClick={handleImportFromFolder}
        />
      </div>

      {showNew && (
        <NewSkillForm
          onDone={(name, desc, instructions) => {
            add(name, desc, instructions);
            setShowNew(false);
          }}
          onCancel={() => setShowNew(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {skills.length === 0 && (
          <p className="py-8 text-center text-[11px] text-muted-foreground">
            No skills configured. Create one or import from Claude Code / opencode.
          </p>
        )}
        {skills.map((skill) => (
          <SkillRow
            key={skill.id}
            skill={skill}
            onToggle={() => toggle(skill.id)}
            onRemove={() => remove(skill.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ImportButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Folder;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded border border-border/50 px-2 py-0.5 text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Icon size={10} strokeWidth={1.75} />
      From {label}
    </button>
  );
}

function NewSkillForm({
  onDone,
  onCancel,
}: {
  onDone: (name: string, desc: string, instructions: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [instructions, setInstructions] = useState("");

  return (
    <div className="shrink-0 space-y-2 border-b border-border/40 px-3 py-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Skill name"
        className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Short description"
        className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary"
      />
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Instructions (injected into system prompt)"
        rows={4}
        className="w-full resize-none rounded border border-border bg-background px-2 py-1 text-[11px] outline-none focus:border-primary font-mono"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { if (name.trim()) onDone(name.trim(), desc.trim(), instructions.trim()); }}
          disabled={!name.trim()}
          className="rounded bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          Add Skill
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function SkillRow({
  skill,
  onToggle,
  onRemove,
}: {
  skill: Skill;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const sourceLabel: Record<SkillSource, string> = {
    builtin: "Built-in",
    imported: "Custom",
    "claude-code": "Claude Code",
    opencode: "opencode",
  };
  const sourceColor: Record<SkillSource, string> = {
    builtin: "bg-primary/10 text-primary border-primary/20",
    imported: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "claude-code": "bg-orange-500/10 text-orange-500 border-orange-500/20",
    opencode: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border/40 px-2 py-1.5 group",
        !skill.enabled && "opacity-50",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "h-5 w-9 rounded-full transition-colors relative shrink-0",
          skill.enabled ? "bg-primary" : "bg-muted-foreground/20",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform",
            skill.enabled ? "left-[calc(100%-1.125rem)]" : "left-0.5",
          )}
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-foreground truncate">
            {skill.name}
          </span>
          <span className={cn("shrink-0 rounded border px-1 text-[8px] font-medium", sourceColor[skill.source])}>
            {sourceLabel[skill.source]}
          </span>
        </div>
        {skill.description && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {skill.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
        title="Remove"
      >
        <Trash2 size={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}
