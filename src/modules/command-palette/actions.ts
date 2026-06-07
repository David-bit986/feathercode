import { ChevronLeft, ChevronRight, Columns2, FilePenLine, Globe, Keyboard, PanelLeft, Rows2, Search, Settings, Sparkles, Terminal, VenetianMask, X } from "lucide-react";
import type { SearchTarget } from "@/modules/header";
import type { ShortcutId } from "@/modules/shortcuts";
import { MAX_PANES_PER_TAB, type Tab } from "@/modules/tabs";
import { leafIds } from "@/modules/terminal";


type CommandIcon = typeof Terminal;

export type CommandPaletteActionGroup =
  | "General"
  | "Tabs"
  | "Panes"
  | "View"
  | "Search"
  | "AI";

export type CommandPaletteAction = {
  id: string;
  label: string;
  group: CommandPaletteActionGroup;
  keywords: string[];
  icon: CommandIcon;
  shortcutId?: ShortcutId;
  disabledReason?: string;
  run: () => void;
  deferRun?: boolean;
};

export const COMMAND_PALETTE_ACTION_GROUPS: readonly CommandPaletteActionGroup[] =
  ["General", "Tabs", "Panes", "View", "Search", "AI"] as const;

export type CommandPaletteActionContext = {
  tabs: Tab[];
  activeId: number;
  searchTarget: SearchTarget;
  explorerRoot: string | null;
  home: string | null;
  openNewTab: () => void;
  openNewPrivate: () => void;
  openNewEditor: () => void;
  openNewPreview: () => void;
  closeActiveTabOrPane: () => void;
  nextTab: () => void;
  previousTab: () => void;
  splitPaneRight: () => void;
  splitPaneDown: () => void;
  focusNextPane: () => void;
  focusPreviousPane: () => void;
  focusSearch: () => void;
  focusExplorerSearch: () => void;
  toggleSidebar: () => void;
  toggleAi: () => void;
  askAiSelection: () => void;
  openSettings: () => void;
  openShortcuts: () => void;
};

export function createCommandPaletteActions(
  ctx: CommandPaletteActionContext,
): CommandPaletteAction[] {
  const activeTab = ctx.tabs.find((tab) => tab.id === ctx.activeId);
  const activeTerminalTab =
    activeTab?.kind === "terminal" ? activeTab : null;
  const activePaneCount = activeTerminalTab
    ? leafIds(activeTerminalTab.paneTree).length
    : 0;
  const onlyOneTab = ctx.tabs.length < 2;
  const noWorkspaceRoot = !ctx.explorerRoot && !ctx.home;
  const splitPaneDisabledReason = !activeTerminalTab
    ? "No terminal tab"
    : activePaneCount >= MAX_PANES_PER_TAB
      ? "Pane limit"
      : undefined;
  const focusPaneDisabledReason = !activeTerminalTab
    ? "No terminal tab"
    : activePaneCount < 2
      ? "Only one pane"
      : undefined;
  const closeDisabledReason =
    onlyOneTab && activePaneCount < 2 ? "Last tab" : undefined;

  return [
    {
      id: "settings.open",
      label: "Open settings",
      group: "General",
      keywords: ["preferences", "config"],
      icon: Settings,
      shortcutId: "settings.open",
      run: ctx.openSettings,
      deferRun: true,
    },
    {
      id: "shortcuts.open",
      label: "Show keyboard shortcuts",
      group: "General",
      keywords: ["keys", "keybindings", "help"],
      icon: Keyboard,
      shortcutId: "shortcuts.open",
      run: ctx.openShortcuts,
      deferRun: true,
    },
    {
      id: "tab.new",
      label: "New terminal",
      group: "Tabs",
      keywords: ["shell", "terminal", "new tab"],
      icon: Terminal,
      shortcutId: "tab.new",
      run: ctx.openNewTab,
    },
    {
      id: "tab.newPrivate",
      label: "New private terminal",
      group: "Tabs",
      keywords: ["privacy", "private", "incognito", "hidden from ai"],
      icon: VenetianMask,
      shortcutId: "tab.newPrivate",
      run: ctx.openNewPrivate,
    },
    {
      id: "tab.newEditor",
      label: "New editor tab",
      group: "Tabs",
      keywords: ["file", "editor", "create"],
      icon: FilePenLine,
      shortcutId: "tab.newEditor",
      disabledReason: noWorkspaceRoot ? "No workspace root" : undefined,
      run: ctx.openNewEditor,
      deferRun: true,
    },
    {
      id: "tab.newPreview",
      label: "New preview tab",
      group: "Tabs",
      keywords: ["browser", "web", "localhost"],
      icon: Globe,
      shortcutId: "tab.newPreview",
      run: ctx.openNewPreview,
    },
    {
      id: "tab.close",
      label: "Close tab or pane",
      group: "Tabs",
      keywords: ["close", "remove", "pane"],
      icon: X,
      shortcutId: "tab.close",
      disabledReason: closeDisabledReason,
      run: ctx.closeActiveTabOrPane,
    },
    {
      id: "tab.next",
      label: "Next tab",
      group: "Tabs",
      keywords: ["switch", "right"],
      icon: ChevronRight,
      shortcutId: "tab.next",
      disabledReason: onlyOneTab ? "Only one tab" : undefined,
      run: ctx.nextTab,
    },
    {
      id: "tab.prev",
      label: "Previous tab",
      group: "Tabs",
      keywords: ["switch", "left"],
      icon: ChevronLeft,
      shortcutId: "tab.prev",
      disabledReason: onlyOneTab ? "Only one tab" : undefined,
      run: ctx.previousTab,
    },
    {
      id: "pane.splitRight",
      label: "Split pane right",
      group: "Panes",
      keywords: ["terminal", "pane", "split", "right", "column"],
      icon: Columns2,
      shortcutId: "pane.splitRight",
      disabledReason: splitPaneDisabledReason,
      run: ctx.splitPaneRight,
    },
    {
      id: "pane.splitDown",
      label: "Split pane down",
      group: "Panes",
      keywords: ["terminal", "pane", "split", "down", "row"],
      icon: Rows2,
      shortcutId: "pane.splitDown",
      disabledReason: splitPaneDisabledReason,
      run: ctx.splitPaneDown,
    },
    {
      id: "pane.focusNext",
      label: "Focus next pane",
      group: "Panes",
      keywords: ["terminal", "pane", "focus", "next"],
      icon: ChevronRight,
      shortcutId: "pane.focusNext",
      disabledReason: focusPaneDisabledReason,
      run: ctx.focusNextPane,
    },
    {
      id: "pane.focusPrev",
      label: "Focus previous pane",
      group: "Panes",
      keywords: ["terminal", "pane", "focus", "previous"],
      icon: ChevronLeft,
      shortcutId: "pane.focusPrev",
      disabledReason: focusPaneDisabledReason,
      run: ctx.focusPreviousPane,
    },
    {
      id: "sidebar.toggle",
      label: "Toggle file explorer",
      group: "View",
      keywords: ["sidebar", "files", "explorer"],
      icon: PanelLeft,
      shortcutId: "sidebar.toggle",
      run: ctx.toggleSidebar,
    },
    {
      id: "explorer.search",
      label: "Search files",
      group: "Search",
      keywords: ["explorer", "workspace", "file search"],
      icon: Search,
      shortcutId: "explorer.search",
      disabledReason: ctx.explorerRoot ? undefined : "No workspace root",
      run: ctx.focusExplorerSearch,
      deferRun: true,
    },
    {
      id: "search.focus",
      label: "Focus search",
      group: "Search",
      keywords: ["find", "terminal", "editor"],
      icon: Search,
      shortcutId: "search.focus",
      disabledReason: ctx.searchTarget ? undefined : "No searchable view",
      run: ctx.focusSearch,
      deferRun: true,
    },
    {
      id: "ai.toggle",
      label: "Toggle AI agent",
      group: "AI",
      keywords: ["assistant", "chat", "agent"],
      icon: Sparkles,
      shortcutId: "ai.toggle",
      run: ctx.toggleAi,
    },
    {
      id: "ai.askSelection",
      label: "Ask AI about selection",
      group: "AI",
      keywords: ["selection", "explain", "assistant", "chat"],
      icon: Sparkles,
      shortcutId: "ai.askSelection",
      run: ctx.askAiSelection,
    },
  ];
}
