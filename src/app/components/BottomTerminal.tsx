import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { useTheme } from "@/modules/theme";
import { ensureMonoFontsLoaded } from "@/lib/fonts";
import { openPty, type PtySession } from "@/modules/terminal/lib/pty-bridge";

type Props = {
  cwd: string | null;
  workspaceRoot: string | null;
  visible: boolean;
};

export function BottomTerminal({ cwd, workspaceRoot, visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const ptyRef = useRef<PtySession | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const { resolvedMode } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const term = new Terminal({
      allowProposedApi: true,
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'JetBrains Mono', monospace",
      theme: { background: "#00000000" },
    });

    terminalRef.current = term;

    const fit = new FitAddon();
    fitRef.current = fit;

    term.loadAddon(fit);

    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // WebGL not available, fallback to canvas
    }

    term.open(containerRef.current);

    const startPty = async () => {
      try {
        const initialCwd = cwd ?? workspaceRoot ?? undefined;
        
        fit.fit();
        const dims = fit.proposeDimensions() ?? { cols: 80, rows: 24 };

        const pty = await openPty(
          dims.cols,
          dims.rows,
          {
            onData: (bytes) => {
              term.write(bytes);
            },
            onExit: (code) => {
              term.write(`\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`);
            },
          },
          initialCwd
        );

        ptyRef.current = pty;
        setReady(true);

        term.onData((data) => {
          pty.write(data).catch(() => {});
        });

        term.onResize(({ cols, rows }) => {
          pty.resize(cols, rows).catch(() => {});
        });

        const observer = new ResizeObserver(() => {
          fit.fit();
        });
        observer.observe(containerRef.current!);
        ptyRef.current = Object.assign(pty, {
          close: async () => {
            observer.disconnect();
            await pty.close();
          }
        });

      } catch (err) {
        term.write(`\r\n\x1b[31mTerminal error: ${err}\x1b[0m\r\n`);
      }
    };

    ensureMonoFontsLoaded().then(() => startPty());

    return () => {
      ptyRef.current?.close().catch(() => {});
      try { term.dispose(); } catch {}
    };
  }, [visible, cwd, workspaceRoot]);

  useEffect(() => {
    if (!ready || !terminalRef.current) return;
    const t = terminalRef.current;
    const isDark = resolvedMode === "dark";
    t.options.theme = {
      foreground: isDark ? "#d4d4d4" : "#333333",
      background: "#00000000",
      cursor: isDark ? "#ffffff" : "#000000",
      selectionBackground: isDark ? "#264f78" : "#add6ff",
      selectionForeground: isDark ? "#ffffff" : "#000000",
    };
  }, [resolvedMode, ready]);

  return (
    <div className="h-full w-full relative">
      <div className="flex items-center h-7 px-3 border-b border-border/60 bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">Terminal</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50 truncate">
          {cwd ?? workspaceRoot ?? ""}
        </span>
      </div>
      <div ref={containerRef} className="absolute inset-x-0 bottom-0" style={{ top: 29 }} />
    </div>
  );
}
