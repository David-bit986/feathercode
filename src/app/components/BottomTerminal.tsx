import { useEffect, useRef, useSyncExternalStore } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { useTheme } from "@/modules/theme";
import { ensureMonoFontsLoaded } from "@/lib/fonts";
import { openPty, type PtySession } from "@/modules/terminal/lib/pty-bridge";
import { Plus, X, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type TermData = {
  id: string;
  name: string;
  cwd: string | null;
  term: Terminal;
  pty: PtySession;
  fit: FitAddon;
  element: HTMLDivElement;
};

let termCounter = 1;
let terms: TermData[] = [];
let activeId: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

let hiddenContainer: HTMLDivElement | null = null;
function getHiddenContainer() {
  if (!hiddenContainer || !hiddenContainer.isConnected) {
    hiddenContainer = document.createElement("div");
    hiddenContainer.style.cssText = "position:absolute;left:-9999px;width:800px;height:600px;";
    document.body.appendChild(hiddenContainer);
  }
  return hiddenContainer;
}

async function createTerm(initialCwd: string | null, workspaceRoot: string | null) {
  const id = `term-${termCounter++}`;
  const name = `Terminal ${termCounter - 1}`;
  
  const element = document.createElement("div");
  element.style.cssText = "width: 100%; height: 100%;";
  
  const term = new Terminal({
    allowProposedApi: true,
    cursorBlink: true,
    cursorStyle: "bar",
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    theme: { background: "#00000000" },
  });

  const fit = new FitAddon();
  term.loadAddon(fit);
  try { term.loadAddon(new WebglAddon()); } catch {}

  getHiddenContainer().appendChild(element);
  term.open(element);

  element.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const sel = term.getSelection();
    if (sel && sel.length > 0) {
      void navigator.clipboard.writeText(sel).catch(() => {});
      term.clearSelection();
    } else {
      void navigator.clipboard.readText().then(text => {
        if (text) term.paste(text);
      }).catch(() => {});
    }
  });

  const pty = await openPty(80, 24, {
    onData: (b) => term.write(b),
    onExit: (c) => term.write(`\r\n\x1b[33mProcess exited with code ${c}\x1b[0m\r\n`),
  }, initialCwd ?? workspaceRoot ?? undefined);

  term.onData(d => pty.write(d).catch(()=>{}));
  term.onResize(r => pty.resize(r.cols, r.rows).catch(()=>{}));

  const data: TermData = { id, name, cwd: initialCwd, term, pty, fit, element };
  terms = [...terms, data];
  activeId = id;
  notify();
  return data;
}

function removeTerm(id: string) {
  const t = terms.find(x => x.id === id);
  if (t) {
    t.pty.close().catch(()=>{});
    try { t.term.dispose(); } catch {}
  }
  terms = terms.filter(x => x.id !== id);
  if (activeId === id) {
    activeId = terms.length > 0 ? terms[terms.length - 1].id : null;
  }
  notify();
}

function setActiveTerm(id: string) {
  activeId = id;
  notify();
}

function useTerms() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => terms
  );
}

function useActiveId() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => activeId
  );
}

type Props = {
  cwd: string | null;
  workspaceRoot: string | null;
  visible: boolean;
};

export function BottomTerminal({ cwd, workspaceRoot, visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedMode } = useTheme();
  
  const currentTerms = useTerms();
  const currentActiveId = useActiveId();
  
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current && currentTerms.length === 0) {
      initRef.current = true;
      ensureMonoFontsLoaded().then(() => createTerm(cwd, workspaceRoot));
    }
  }, [cwd, workspaceRoot, currentTerms.length]);

  const activeTerm = currentTerms.find(t => t.id === currentActiveId);

  useEffect(() => {
    if (!visible || !containerRef.current || !activeTerm) return;
    
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(activeTerm.element);
    
    activeTerm.fit.fit();
    const dims = activeTerm.fit.proposeDimensions() ?? { cols: 80, rows: 24 };
    activeTerm.pty.resize(dims.cols, dims.rows).catch(() => {});
    
    const observer = new ResizeObserver(() => {
      activeTerm.fit.fit();
    });
    observer.observe(containerRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [visible, activeTerm]);

  useEffect(() => {
    const isDark = resolvedMode === "dark";
    for (const t of currentTerms) {
      t.term.options.theme = {
        foreground: isDark ? "#d4d4d4" : "#333333",
        background: "#00000000",
        cursor: isDark ? "#ffffff" : "#000000",
        selectionBackground: isDark ? "#264f78" : "#add6ff",
        selectionForeground: isDark ? "#ffffff" : "#000000",
      };
    }
  }, [resolvedMode, currentTerms]);

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="flex shrink-0 items-center h-8 px-2 border-b border-border/60 bg-muted/30 overflow-x-auto gap-1">
        {currentTerms.map(t => (
          <div 
            key={t.id}
            onClick={() => setActiveTerm(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm cursor-default border",
              t.id === currentActiveId 
                ? "bg-background text-foreground shadow-sm border-border/40" 
                : "text-muted-foreground hover:bg-muted/50 border-transparent hover:text-foreground"
            )}
          >
            <TerminalSquare size={13} strokeWidth={2} />
            <span>{t.name}</span>
            <button 
              className="ml-1 opacity-60 hover:opacity-100 p-0.5 rounded-sm hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                removeTerm(t.id);
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        ))}
        
        <button
          className="p-1.5 ml-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => createTerm(cwd, workspaceRoot)}
          title="New Terminal"
        >
          <Plus size={14} strokeWidth={2} />
        </button>

        <span className="ml-auto text-[10px] pr-2 text-muted-foreground/50 truncate max-w-[200px]">
          {activeTerm?.cwd ?? workspaceRoot ?? ""}
        </span>
      </div>
      <div className="flex-1 relative min-h-0">
        <div ref={containerRef} className="absolute inset-0 pt-1" />
      </div>
    </div>
  );
}
