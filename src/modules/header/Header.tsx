import { MessageSquare, PanelBottom, PanelLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/WindowControls";
import { IS_MAC, USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import type { Tab } from "@/modules/tabs";
import { TabBar } from "@/modules/tabs";
import { NotificationBell } from "@/modules/agents";


import { useEffect, useRef, useState, type RefObject } from "react";
import {
  SearchInline,
  type SearchInlineHandle,
  type SearchTarget,
} from "./SearchInline";

type Props = {
  tabs: Tab[];
  activeId: number;
  onSelect: (id: number) => void;
  onNewEditor: () => void;
  onNewPreview: () => void;
  onNewGitGraph: () => void;
  onClose: (id: number) => void;
  onPin: (id: number) => void;
  onRename: (id: number, title: string) => void;
  onActivateAgent: (tabId: number, leafId: number) => void;
  onActivateLocalAgent: () => void;
  onOpenSettings: () => void;
  searchTarget: SearchTarget;
  searchRef: RefObject<SearchInlineHandle | null>;
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleBottom: () => void;
};

const COMPACT_WIDTH = 720;

export function Header({
  tabs,
  activeId,
  onSelect,
  onNewEditor,
  onNewPreview,
  onNewGitGraph,
  onClose,
  onPin,
  onRename,
  onActivateAgent,
  onActivateLocalAgent,
  onOpenSettings,
  searchTarget,
  searchRef,
  leftOpen,
  rightOpen,
  bottomOpen,
  onToggleLeft,
  onToggleRight,
  onToggleBottom,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setCompact(w < COMPACT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const settingsButton = (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={onOpenSettings}
      title="Settings"
    >
      <Settings size={15} strokeWidth={1.75} />
    </Button>
  );

  return (
    <div
      ref={rootRef}
      data-tauri-drag-region
      className={`flex h-10 shrink-0 items-center gap-2 border-b border-border/30 bg-card/70 backdrop-blur-xl select-none ${
        IS_MAC ? "pr-2 pl-20" : "pr-0 pl-2"
      }`}
    >
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          onClick={onToggleLeft}
          title={leftOpen ? "Hide sidebar" : "Show sidebar"}
          variant="ghost"
          size="icon-sm"
          className={`shrink-0 rounded-md hover:bg-accent hover:text-foreground ${
            leftOpen ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <PanelLeft size={18} strokeWidth={1.75} />
        </Button>

        {!IS_MAC && (
          <NotificationBell
            onActivate={onActivateAgent}
            onActivateLocal={onActivateLocalAgent}
          />
        )}
      </div>

      {!IS_MAC && <span className="mx-1 h-5 w-px shrink-0 bg-border" />}

      {IS_MAC && <span className="mr-1 h-full w-px shrink-0 bg-border" />}

      <div className="flex min-w-0 flex-1 items-center gap-2" data-tauri-drag-region>
        <TabBar
          tabs={tabs}
          activeId={activeId}
          onSelect={onSelect}
          onNewEditor={onNewEditor}
          onNewPreview={onNewPreview}
          onNewGitGraph={onNewGitGraph}
          onClose={onClose}
          onPin={onPin}
          onRename={onRename}
          compact={compact}
        />
        <div data-tauri-drag-region className="h-full min-w-2 flex-1" />
      </div>

      <SearchInline ref={searchRef} target={searchTarget} compact={compact} />

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          onClick={onToggleBottom}
          title={bottomOpen ? "Hide terminal" : "Show terminal"}
          variant="ghost"
          size="icon-sm"
          className={`shrink-0 rounded-md hover:bg-accent hover:text-foreground ${
            bottomOpen ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <PanelBottom size={16} strokeWidth={1.75} />
        </Button>

        <Button
          onClick={onToggleRight}
          title={rightOpen ? "Hide AI panel" : "Show AI panel"}
          variant="ghost"
          size="icon-sm"
          className={`shrink-0 rounded-md hover:bg-accent hover:text-foreground ${
            rightOpen ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <MessageSquare size={16} strokeWidth={1.75} />
        </Button>
      </div>

      {IS_MAC && (
        <>
          <NotificationBell
            onActivate={onActivateAgent}
            onActivateLocal={onActivateLocalAgent}
          />
          {settingsButton}
        </>
      )}

      {!IS_MAC && settingsButton}

      {USE_CUSTOM_WINDOW_CONTROLS && (
        <>
          <span className="ml-1 h-5 w-px shrink-0 bg-border" />
          <WindowControls />
        </>
      )}
    </div>
  );
}
