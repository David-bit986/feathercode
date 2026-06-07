<div align="center">
  <img src="public/logo.png" width="144" height="144" alt="FeatherCode" />
  <h1>FeatherCode</h1>

  <p><strong>A more customisable, AI-native dev workspace — built on Terax.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="license" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey" alt="platform" />
  </p>
</div>

---

## ⚠️ Work in Progress

This project is actively being worked on and still has bugs. Things may break or look rough. [Report issues](https://github.com/David-bit986/feathercode/issues) if you find something.

---

## About

FeatherCode is a fork of [Terax](https://github.com/crynta/terax-ai) by [crynta](https://github.com/crynta). I love using Antigravity but felt it was missing things I wanted — so I built them here on top of Terax's solid foundation.

### What's different from Terax

- **Skills system** — import skill sets from any folder, toggle them on/off, invoke with `/skill-name` in the chat input
- **More AI providers** — DeepSeek, Mistral, xAI, OpenRouter, LM Studio, MLX, and Ollama with proper brand logos in the model picker
- **Per-project sessions** — each workspace has its own isolated chat history
- **10 themes** — Feather, Claude, Tokyo Night, Nord, Tide, Sage, Catppuccin, Gruvbox, Rosé Pine, Caffeine — all with light + dark variants
- **Complete rebrand** — no Terax traces anywhere in code, UI, shell integration, or config
- **Various fixes** — AI panel resizes properly, terminal right-click copies text instead of "Copy image", you can chat while an agent is running, agent notifications switch to the right session when clicked

All the core engineering — PTY backend, WebGL terminal, agentic AI pipeline, CodeMirror editor, git tools — is [Terax's work](https://github.com/crynta/terax-ai). Go star their repo.

## Install

Download the latest installer from [Releases](https://github.com/David-bit986/feathercode/releases/latest).

### Windows
- First launch shows "Windows protected your PC" — click **More info** then **Run anyway**
- Default shell: `pwsh.exe` > `powershell.exe` > `cmd.exe`

## Build from source

```bash
pnpm install
pnpm tauri dev          # development
pnpm tauri build        # production bundle
```

**Prerequisites:** Rust (stable, [rustup.rs](https://rustup.rs)), Node 20+, [pnpm](https://pnpm.io), [Tauri prerequisites](https://tauri.app/start/prerequisites/).

## Tech stack

Tauri 2, Rust, portable-pty, React 19, TypeScript, Vite, xterm.js, CodeMirror 6, Vercel AI SDK v6, Tailwind v4, shadcn/ui, Zustand, Lucide.

## License

Apache-2.0 — same as upstream.
