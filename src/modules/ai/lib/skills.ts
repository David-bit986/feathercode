import { LazyStore } from "@tauri-apps/plugin-store";
import { native } from "./native";
import { homeDir } from "@tauri-apps/api/path";

export type SkillSource = "builtin" | "imported" | "claude-code" | "opencode";

export type Skill = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  source: SkillSource;
  enabled: boolean;
};

const STORE_PATH = "fc-ai-skills.json";
const KEY_LIST = "skills";
const store = new LazyStore(STORE_PATH, { defaults: {}, autoSave: 200 });

export async function loadSkills(): Promise<Skill[]> {
  return (await store.get<Skill[]>(KEY_LIST)) ?? [];
}

export async function saveSkills(list: Skill[]): Promise<void> {
  await store.set(KEY_LIST, list);
  await store.save();
}

export function newSkillId(): string {
  return `sk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function importFromClaudeCode(): Promise<Skill[]> {
  const skills: Skill[] = [];
  let home = "";
  try {
    home = (await homeDir()).replace(/\\/g, "/");
  } catch {
    return skills;
  }

  const searchDirs = [
    `${home}.claude/skills`,
    `${home}AppData/Roaming/Claude/skills`,
  ];

  for (const dir of searchDirs) {
    await scanSkillDir(dir, "claude-code", skills);
  }

  return skills;
}

export async function importFromOpenCode(): Promise<Skill[]> {
  const skills: Skill[] = [];
  let home = "";
  try {
    home = (await homeDir()).replace(/\\/g, "/");
  } catch {
    return skills;
  }

  const searchDirs = [
    `${home}.config/opencode/skills`,
  ];

  for (const dir of searchDirs) {
    await scanSkillDir(dir, "opencode", skills);
  }

  return skills;
}

/**
 * Import skills from an arbitrary directory chosen by the user.
 * Handles both: a skills-collection directory (subdirs with SKILL.md)
 * and a single skill directory (contains SKILL.md directly).
 */
export async function importFromDirectory(
  dirPath: string,
  source: SkillSource = "imported",
): Promise<Skill[]> {
  const skills: Skill[] = [];
  const normalized = dirPath.replace(/\\/g, "/");

  // First: check if this directory IS a skill (has SKILL.md directly)
  const directFile = await parseSkillFile(`${normalized}/SKILL.md`);
  if (directFile) {
    const name = directFile.name !== "Unnamed Skill"
      ? directFile.name
      : normalized.split("/").filter(Boolean).pop() ?? "Imported Skill";
    skills.push({
      id: `${source}-${name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`,
      name,
      description: directFile.description,
      instructions: directFile.instructions,
      source,
      enabled: true,
    });
    return skills;
  }

  // Second: scan as a collection (subdirectories with SKILL.md)
  await scanSkillDir(normalized, source, skills);

  // Third: scan SKILL.md files directly in the directory root
  try {
    const entries = await native.readDir(normalized);
    for (const entry of entries) {
      if (entry.kind !== "file") continue;
      if (!entry.name.endsWith(".md")) continue;
      const parsed = await parseSkillFile(`${normalized}/${entry.name}`);
      if (parsed) {
        const name = parsed.name !== "Unnamed Skill"
          ? parsed.name
          : entry.name.replace(/\.md$/i, "");
        skills.push({
          id: `${source}-${name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`,
          name,
          description: parsed.description,
          instructions: parsed.instructions,
          source,
          enabled: true,
        });
      }
    }
  } catch {
    // Directory can't be read
  }

  return skills;
}

export async function importFromProject(workspaceRoot: string): Promise<Skill[]> {
  const skills: Skill[] = [];
  const normalized = workspaceRoot.replace(/\\/g, "/");
  const dir = `${normalized}/.claude/skills`;
  await scanSkillDir(dir, "claude-code", skills);
  return skills;
}

type SkillFile = {
  path: string;
  name: string;
  description: string;
  instructions: string;
};

async function scanSkillDir(
  dir: string,
  source: SkillSource,
  skills: Skill[],
): Promise<void> {
  try {
    const entries = await native.readDir(dir);
    for (const entry of entries) {
      if (entry.kind !== "dir") continue;
      const skillPath = `${dir}/${entry.name}/SKILL.md`;
      const parsed = await parseSkillFile(skillPath);
      if (parsed) {
        skills.push({
          id: `${source}-${entry.name}`,
          name: parsed.name,
          description: parsed.description,
          instructions: parsed.instructions,
          source,
          enabled: true,
        });
      }
    }
  } catch {
    // Directory doesn't exist or can't be read — silently skip
  }
}

async function parseSkillFile(path: string): Promise<SkillFile | null> {
  try {
    const result = await native.readFile(path);
    if (result.kind !== "text") return null;
    const content = result.content;

    const nameMatch = content.match(/^---\s*\nname:\s*(.+?)\s*\n---/m);
    const descMatch = content.match(/description:\s*(.+)/);
    const name = nameMatch?.[1]?.trim() ?? path.split("/").slice(-2, -1)[0] ?? "Unnamed Skill";
    const description = descMatch?.[1]?.trim() ?? "";

    const bodyStart = content.indexOf("---\n", 4);
    const instructions = bodyStart !== -1
      ? content.slice(bodyStart + 4).trim()
      : content.trim();

    return { path, name, description, instructions };
  } catch {
    return null;
  }
}

export function getSkillsInstructions(skills: Skill[]): string {
  const enabled = skills.filter((s) => s.enabled);
  if (enabled.length === 0) return "";

  return enabled
    .map(
      (s) =>
        `## SKILL: ${s.name}\n${s.description ? `> ${s.description}\n\n` : ""}${s.instructions.trim()}`,
    )
    .join("\n\n");
}
