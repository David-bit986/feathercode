import { TerminalPane } from "@/modules/terminal";
import type { TerminalTab } from "@/modules/tabs";
import type { SearchAddon } from "@xterm/addon-search";
import type { TerminalPaneHandle } from "@/modules/terminal";
import { leafIds } from "@/modules/terminal";

type Props = {
  tab: TerminalTab;
  registerTerminalHandle: (
    leafId: number,
    h: TerminalPaneHandle | null,
  ) => void;
  onSearchReady: (leafId: number, addon: SearchAddon) => void;
  onCwd: (leafId: number, cwd: string) => void;
  onExit: (leafId: number, code: number) => void;
  onFocusLeaf: (tabId: number, leafId: number) => void;
};

export function MiniTerminalSurface({
  tab,
  registerTerminalHandle,
  onSearchReady,
  onCwd,
  onExit,
}: Props) {
  const leaves = leafIds(tab.paneTree);

  return (
    <div className="flex h-full items-stretch">
      {leaves.map((leafId) => (
        <div key={leafId} className="flex-1 min-w-0 border-r border-border/60 last:border-0">
          <TerminalPane
            ref={(h) => registerTerminalHandle(leafId, h)}
            leafId={leafId}
            visible
            focused={leafId === tab.activeLeafId}
            initialCwd={tab.cwd}
            onSearchReady={onSearchReady}
            onCwd={onCwd}
            onExit={onExit}
          />
        </div>
      ))}
    </div>
  );
}
