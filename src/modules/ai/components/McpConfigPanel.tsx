import { useState, useMemo } from "react";
import type { McpServer } from "../store/mcpStore";
import {
  useMcpStore,
  generateMcpServerId,
} from "../store/mcpStore";

export function McpConfigPanel() {
  const serversMap = useMcpStore((s) => s.servers);
  const order = useMcpStore((s) => s.order);
  const servers = useMemo(
    () =>
      order
        .map((id) => serversMap[id])
        .filter((x): x is McpServer => x != null),
    [serversMap, order],
  );
  const removeServer = useMcpStore((s) => s.removeServer);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <h2 className="text-sm font-semibold">MCP Servers</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/80"
        >
          {showNew ? "Cancel" : "+ Add Server"}
        </button>
      </div>

      {showNew && <NewServerForm onDone={() => setShowNew(false)} />}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {servers.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-8">
            No MCP servers configured. Add servers to give agents access to
            external tools and data sources.
          </p>
        )}

        {servers.map((server) => (
          <div key={server.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      server.status === "connected"
                        ? "bg-primary"
                        : server.status === "connecting"
                          ? "bg-muted"
                          : server.status === "error"
                            ? "bg-destructive"
                            : "bg-muted"
                    }`}
                  />
                  <h3 className="text-sm font-medium">{server.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground ml-4">
                  {server.command} {server.args.join(" ")}
                </p>
                <p className="text-xs text-muted-foreground ml-4">
                  {server.tools.length} tools &middot; {server.resources.length}{" "}
                  resources
                </p>
                {server.error && (
                  <p className="text-xs text-destructive ml-4 mt-1">
                    {server.error}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeServer(server.id)}
                className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded shrink-0"
              >
                Remove
              </button>
            </div>

            {server.tools.length > 0 && (
              <details className="mt-2 ml-4">
                <summary className="text-xs text-primary cursor-pointer hover:underline">
                  {server.tools.length} tools available
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {server.tools.map((tool) => (
                    <li
                      key={tool.name}
                      className="text-xs text-muted-foreground"
                    >
                      <span className="font-mono font-medium">
                        {tool.name}
                      </span>
                      {tool.description && ` — ${tool.description}`}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NewServerForm({ onDone }: { onDone: () => void }) {
  const addServer = useMcpStore((s) => s.addServer);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("npx");
  const [args, setArgs] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !command.trim()) return;

    addServer({
      id: generateMcpServerId(),
      name: name.trim(),
      command: command.trim(),
      args: args
        .split(/\s+/)
        .map((a) => a.trim())
        .filter(Boolean),
      env: {},
      status: "disconnected",
      error: null,
      tools: [],
      resources: [],
    });

    setName("");
    setCommand("npx");
    setArgs("");
    onDone();
  };

  return (
    <div className="p-4 border-b space-y-3 shrink-0">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Server name (e.g., 'Filesystem')"
        className="w-full px-3 py-1.5 text-sm border rounded-md"
      />

      <div className="flex gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Command (e.g., 'npx')"
          className="flex-1 px-3 py-1.5 text-sm border rounded-md"
        />
        <input
          type="text"
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          placeholder="Args (e.g., '-y @mcp/server-filesystem /tmp')"
          className="flex-1 px-3 py-1.5 text-sm border rounded-md"
        />
      </div>

      <button
        onClick={handleSubmit}
        className="px-4 py-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/80"
      >
        Add Server
      </button>
    </div>
  );
}
