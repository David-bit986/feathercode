<div align="center">
  <img src="public/logo.png" width="144" height="144" alt="FeatherCode" />
  <h1>FeatherCode</h1>

  <p><strong>A customisable, AI-native dev workspace built on Terax.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey" alt="platform" />
  </p>
</div>

---

## ⚠️ Work in Progress

I develop this project. It contains bugs. Features break and layouts lack polish. [Report issues](https://github.com/David-bit986/feathercode/issues).

---

## About

FeatherCode forks [Terax](https://github.com/crynta/terax-ai) by [crynta](https://github.com/crynta). Antigravity lacks certain features I need, so I built them on top of Terax.

### Differences from Terax

- **Skills system**: Import skill sets from folders. Toggle them. Invoke them via `/skill-name` in the chat input.
- **More AI providers**: DeepSeek, Mistral, xAI, OpenRouter, LM Studio, MLX, and Ollama. The model picker displays brand logos.
- **Per-project sessions**: Each workspace maintains an isolated chat history.
- **10 themes**: Feather, Claude, Tokyo Night, Nord, Tide, Sage, Catppuccin, Gruvbox, Rosé Pine, and Caffeine. Each includes light and dark variants.
- **Complete rebrand**: The code, UI, shell integration, and config omit Terax branding.
- **Bug fixes**: The AI panel resizes. Terminal right-click copies text. You chat during agent execution. Clicking agent notifications opens the target session.

[Terax](https://github.com/crynta/terax-ai) provides the core engineering. This includes the PTY backend, WebGL terminal, agentic AI pipeline, CodeMirror editor, and git tools. Star their repo.

## Install

Download the installer from [Releases](https://github.com/David-bit986/feathercode/releases/latest).

### Windows
- Windows Defender shows "Windows protected your PC" on first launch. Click **More info**, then click **Run anyway**.
- Default shell priority: `pwsh.exe`, `powershell.exe`, `cmd.exe`.

## Build from source

```bash
pnpm install
pnpm tauri dev          # development
pnpm tauri build        # production bundle
```

**Prerequisites:** Rust (stable, [rustup.rs](https://rustup.rs)), Node 20+, [pnpm](https://pnpm.io), [Tauri prerequisites](https://tauri.app/start/prerequisites/).

## Tech stack

Tauri 2, Rust, portable-pty, React 19, TypeScript, Vite, xterm.js, CodeMirror 6, Vercel AI SDK v6, Tailwind v4, shadcn/ui, Zustand, Lucide.

