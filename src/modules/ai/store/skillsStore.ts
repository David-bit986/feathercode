import { create } from "zustand";
import {
  importFromClaudeCode,
  importFromDirectory,
  importFromOpenCode,
  importFromProject,
  loadSkills,
  newSkillId,
  saveSkills,
  type Skill,
} from "../lib/skills";

type State = {
  hydrated: boolean;
  skills: Skill[];
  hydrate: () => Promise<void>;
  add: (name: string, description: string, instructions: string) => string;
  update: (id: string, patch: Partial<Skill>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  importFromSource: (source: "claude-code" | "opencode") => Promise<number>;
  importFromPath: (dirPath: string) => Promise<number>;
  importFromWorkspace: (workspaceRoot: string) => Promise<number>;
  getEnabled: () => Skill[];
};

export const useSkillsStore = create<State>((set, get) => ({
  hydrated: false,
  skills: [],
  hydrate: async () => {
    if (get().hydrated) return;
    const skills = await loadSkills();
    set({ skills, hydrated: true });
  },
  add: (name, description, instructions) => {
    const id = newSkillId();
    const skill: Skill = {
      id,
      name,
      description,
      instructions,
      source: "imported",
      enabled: true,
    };
    const next = [...get().skills, skill];
    set({ skills: next });
    void saveSkills(next);
    return id;
  },
  update: (id, patch) => {
    const next = get().skills.map((s) =>
      s.id === id ? { ...s, ...patch } : s,
    );
    set({ skills: next });
    void saveSkills(next);
  },
  remove: (id) => {
    const next = get().skills.filter((s) => s.id !== id);
    set({ skills: next });
    void saveSkills(next);
  },
  toggle: (id) => {
    const next = get().skills.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s,
    );
    set({ skills: next });
    void saveSkills(next);
  },
  importFromSource: async (source) => {
    const imported = source === "claude-code"
      ? await importFromClaudeCode()
      : await importFromOpenCode();
    if (imported.length === 0) return 0;
    const existing = get().skills;
    const existingIds = new Set(existing.map((s) => s.id));
    const newSkills = imported.filter((s) => !existingIds.has(s.id));
    if (newSkills.length === 0) return 0;
    const next = [...existing, ...newSkills];
    set({ skills: next });
    void saveSkills(next);
    return newSkills.length;
  },
  importFromWorkspace: async (workspaceRoot) => {
    const imported = await importFromProject(workspaceRoot);
    if (imported.length === 0) return 0;
    const existing = get().skills;
    const existingIds = new Set(existing.map((s) => s.id));
    const newSkills = imported.filter((s) => !existingIds.has(s.id));
    if (newSkills.length === 0) return 0;
    const next = [...existing, ...newSkills];
    set({ skills: next });
    void saveSkills(next);
    return newSkills.length;
  },
  importFromPath: async (dirPath) => {
    const imported = await importFromDirectory(dirPath, "imported");
    if (imported.length === 0) return 0;
    const existing = get().skills;
    const existingIds = new Set(existing.map((s) => s.id));
    const newSkills = imported.filter((s) => !existingIds.has(s.id));
    if (newSkills.length === 0) return 0;
    const next = [...existing, ...newSkills];
    set({ skills: next });
    void saveSkills(next);
    return newSkills.length;
  },
  getEnabled: () => get().skills.filter((s) => s.enabled),
}));
