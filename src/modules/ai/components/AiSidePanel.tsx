import {  Brain, MessageSquare, Plug } from "lucide-react";
import { AiChatView } from "./AiChat";
import { AiInputBar } from "./AiInputBar";
import { AiStatusBarControls } from "./AiStatusBarControls";
import { McpConfigPanel } from "./McpConfigPanel";
import { SkillsConfigPanel } from "./SkillsConfigPanel";
import { useSessionsStore } from "../store/sessionsStore";
import { getOrCreateChat } from "../store/chatRuntime";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";



type Props = {
  className?: string;
};

type RightTab = "chat" | "mcp" | "skills";

function TabBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MessageSquare;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      <Icon size={14} strokeWidth={2} />
      {label}
    </button>
  );
}

export function AiSidePanel({ className }: Props) {
  const sessionId = useSessionsStore((s) => s.activeSessionId);
  const [tab, setTab] = useState<RightTab>("chat");

  return (
    <div className={cn("flex h-full flex-col bg-card", className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-2 py-1.5">
        <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-md border border-border/40">
          <TabBtn
            icon={MessageSquare}
            label="Chat"
            active={tab === "chat"}
            onClick={() => setTab("chat")}
          />
          <TabBtn
            icon={Plug}
            label="MCP"
            active={tab === "mcp"}
            onClick={() => setTab("mcp")}
          />
          <TabBtn
            icon={Brain}
            label="Skills"
            active={tab === "skills"}
            onClick={() => setTab("skills")}
          />
        </div>
        <AiStatusBarControls minimal />
      </div>

      <div className="min-h-0 flex-1">
        {tab === "chat" ? (
          sessionId ? (
            <ChatPanel sessionId={sessionId} />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-sm text-muted-foreground text-center">
                Start a conversation to see AI chat here.
              </p>
            </div>
          )
        ) : tab === "mcp" ? (
          <McpConfigPanel />
        ) : (
          <SkillsConfigPanel />
        )}
      </div>
    </div>
  );
}

function ChatPanel({ sessionId }: { sessionId: string }) {
  const chat = useMemo(() => getOrCreateChat(sessionId), [sessionId]);
  const helpers = useChat<UIMessage>({ chat });

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 relative">
        <div className="absolute inset-0">
          <AiChatView
            messages={helpers.messages}
            status={helpers.status}
            error={helpers.error}
            clearError={helpers.clearError}
            addToolApprovalResponse={helpers.addToolApprovalResponse}
            stop={helpers.stop}
          />
        </div>
      </div>
      <div className="shrink-0 border-t border-border/60 p-2">
        <AiInputBar />
      </div>
    </div>
  );
}
