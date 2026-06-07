import { Bot, BotMessageSquare, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function iconFor(agent: string): LucideIcon {
  const a = agent.toLowerCase();
  if (a.includes("claude")) return BotMessageSquare;
  if (a.includes("gpt") || a.includes("openai")) return Bot;
  return Sparkles;
}

export function AgentIcon({
  agent,
  size = 15,
  className,
}: {
  agent: string;
  size?: number;
  className?: string;
}) {
  if (agent.toLowerCase().includes("feathercode")) {
    return (
      <img
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }
  const Icon = iconFor(agent);
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      className={className}
    />
  );
}
