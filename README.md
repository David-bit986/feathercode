<div align="center">
  <img src="public/logo.png" width="144" height="144" alt="FeatherCode" />
  <h1>FeatherCode</h1>

  <p><strong>A warm, ink-drawn AI-native dev workspace — built for the gravity you want.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="license" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey" alt="platform" />
  </p>
</div>

---

## ⚠️ Work in Progress

FeatherCode is actively being developed and **contains bugs**. Things may break, change, or look unfinished. Use at your own pace — and feel free to [report issues](https://github.com/crynta/feathercode/issues) if you find something off.

---

## About

FeatherCode is a personal fork of the [Terax](https://github.com/crynta/terax-ai) project (by [crynta](https://github.com/crynta)) — a lightweight, open-source AI-native terminal emulator with a PTY backend, multi-tab editor, and agentic AI side panel. I loved the core idea and wanted to build something that felt more like **Antigravity** in spirit: warm, tactile, with a hand-drawn aesthetic and deeper customisation.

### What FeatherCode adds on top of Terax

- **Warm ink-drawn identity** — hand-drawn feather logo, rounded amber accents, dark charcoal palette, and an Apple-inspired light mode
- **Custom AI support** — DeepSeek, Mistral, xAI, OpenRouter, LM Studio, MLX, and Ollama with their own branded logos in the model selector
- **Skills system** — import skill sets from any local folder (markdown + tools), toggle them on/off, and invoke with `/skill-name` slash commands
- **Per-project sessions** — each workspace gets its own isolated chat history, stored separately by project hash
- **Provider brand icons** — OpenAI, Anthropic, Google Gemini, xAI, Mistral, DeepSeek, OpenRouter, LM Studio, Ollama — each shown with their actual logo in the model picker
- **Fully rebranded** — no traces of the original Terax naming anywhere (events, shell integration paths, thread names, CSS classes, window titles, env vars, documentation)
- **Expanded theme system** — 10 built-in themes (Feather, Claude, Tokyo Night, Nord, Tide, Sage, Catppuccin, Gruvbox, Rosé Pine, Caffeine), each with complete light + dark palettes
- **AI panel width fix** — proper resizable panel that opens at a usable 40% width

### Credit

All the heavy engineering — the native PTY backend, WebGL terminal renderer, agentic AI pipeline, CodeMirror editor, git integration — is the incredible work of the [Terax team](https://github.com/crynta/terax-ai). FeatherCode is a personal remix built on their foundation.

## Features

### Terminal
- xterm.js with WebGL renderer, multi-tab with background streaming
- Native PTY backend via `portable-pty` (zsh, bash, pwsh, fish, cmd)
- Split panels (horizontal and vertical), inline search, link detection
- Per-tab workspace environments on Windows (Local, or any WSL distro)

### Code editor
- CodeMirror 6 (TS/JS, Rust, Python, Go, C/C++, Java, HTML/CSS, JSON, Markdown, etc.)
- Inline AI autocomplete, AI edit diffs (accept/reject hunk by hunk), Vim mode
- Ten built-in editor themes

### Source control
- Stage / unstage hunks, commit, push, branch display, git history with commit graph

### AI
- **BYOK providers:** OpenAI, Anthropic, Google (Gemini), Groq, xAI, Cerebras, OpenRouter, DeepSeek, Mistral + any OpenAI-compatible endpoint
- **Local / offline:** LM Studio, MLX, Ollama
- **Skills:** import from folder, toggle on/off, slash-command invocation
- **Agentic workflow:** plans, sub-agents, `PROJECT.md` memory, file tools, bash with approval gating
- **Composer:** snippets via `#handle`, files via `@path`, slash commands, voice input

### Themes
- 10 bundled presets with full light + dark variants
- Custom theme editor, import/export, background images with blur and opacity

## Install

Download the latest installer from [Releases](https://github.com/crynta/feathercode/releases/latest).

### Windows
- "Windows protected your PC" — click **More info** then **Run anyway** (not code-signed yet)
- Default shell: `pwsh.exe` > `powershell.exe` > `cmd.exe`

## Build from source

```bash
pnpm install
pnpm tauri dev          # development
pnpm tauri build        # production bundle
```

**Prerequisites:** Rust (stable), Node 20+, pnpm, Tauri platform prerequisites.

## Built on

Tauri 2, Rust, `portable-pty`, React 19, TypeScript, Vite, xterm.js, CodeMirror 6, Vercel AI SDK v6, Tailwind v4, shadcn/ui, Zustand, Lucide icons.

## License

Apache-2.0 — same as the upstream project.
