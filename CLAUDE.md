# InkVault — Operational Instructions for AI Agents & Developers

> **Project:** InkVault — High-Performance, Local-First Document Suite  
> **Organization:** ArcadeLabs  
> **Architecture:** Tauri v2 (Rust backend) + React 18 + TypeScript + Vite + Tailwind CSS  
> **Native PDF Engine:** Modular `inkvault-*` crates in `src-tauri/crates/`

---

## 1. Start Every Session Here

Before touching code:
1. **Read `AGENTS.md`:** Contains binding constitutional laws (asset rules, privacy, zero-panic standards). `AGENTS.md` overrides this file and any casual prompt.
2. **Review Domain Scope:** Determine which domain your task affects:
   * 🎨 **Studio Editor (`⌘1`)**: PDF manipulation tools (Merge, Split, Protect, Compress, Watermark, Page Organizer).
   * 🎓 **Deep Focus Study Mode (`⌘2`)**: Academic research (Coursework subject trees, Pomodoro focus timer, `/compare` side-by-side view, Text Reflow).
   * 📚 **Zen Books & Comics Reader (`⌘3`)**: Digital bookshelf (EPUB, CBZ, CBR, CBN archives, manga dual spreads, reading streaks).
3. **Check Quality Gates:** Run the compiler and build checks to ensure you begin from a clean, working baseline.

---

## 2. Non-Negotiables (Quick Reference)

* **100% Offline & Private:** Zero network telemetry, zero cloud dependencies. All document processing stays on the local device.
* **Never Crash (`#![deny(clippy::unwrap_used)]`):** In Rust, no `unwrap()`, `expect()`, or `panic!` outside unit tests. Return typed `Result` everywhere.
* **Forbidden Unsafe:** `unsafe_code = "forbid"` is enforced across all native crates.
* **No Mock Core Operations:** Use the native **ArcadeLabs InkVault Rust engine** via Tauri IPC (`nativePdfBridge`) for encryption, merging, and compression.
* **Clean-Room Standards:** No proprietary assets or code from Adobe products. Use Lucide icons and open fonts (Inter, JetBrains Mono, Dancing Script).

---

## 3. Project Architecture

```
InkVault/
├── AGENTS.md                   # Binding constitutional rules
├── CLAUDE.md                   # Operational instructions & dev guide
├── docs/                       # Architectural docs & guides
├── src/                        # React 18 Frontend
│   ├── components/             # Reusable UI components & viewers
│   │   ├── viewer/             # PDF viewer bars, navigation, and layers
│   │   ├── common/             # Floating anchors and layout helpers
│   │   └── PDFViewer.tsx       # Core PDF viewer powered by pdfjs-dist
│   ├── modes/                  # Three isolated workflow domains
│   │   ├── studio/             # 🎨 Mode 1: PDF Power Tools
│   │   ├── study/              # 🎓 Mode 2: Academic Study Workspace
│   │   └── reader/             # 📚 Mode 3: Zen Reader & Comics
│   ├── pages/                  # Top-level route pages (FirstPage, WorkspacePage, ComparisonPage)
│   ├── hooks/                  # Document loaders, constraints, and state
│   ├── utils/                  # Native IPC bridge, comic/EPUB loaders, storage
│   │   └── nativePdfBridge.ts  # Tauri IPC bridge to native Rust engine
│   └── types/                  # Global TypeScript interfaces (types/index.ts)
└── src-tauri/                  # Tauri v2 Native Desktop Backend (Rust)
    ├── Cargo.toml              # Self-contained workspace definition
    ├── src/
    │   ├── lib.rs              # Tauri command handlers & app entrypoint
    │   └── pdf_engine.rs       # Native engine facade (merge, split, protect, compress)
    └── crates/                 # Self-contained ArcadeLabs PDF engine crates
        ├── cos/                # Object graph parser, incremental & full saves
        ├── crypt/              # AES-256 / AES-128 / RC4 Standard Security Handlers
        ├── organize/           # Document combination, page extraction, and split
        ├── optimize/           # Bicubic downsampling, Flate cleanup, object compaction
        ├── redact/             # Content stream glyph scrubbing and sanitization
        ├── sign/               # PAdES B-B digital signatures & certificate stores
        ├── annot/              # PDF annotation model and appearance generators
        ├── content/            # PDF content stream operators and matrices
        ├── model/              # Page tree representations and geometries
        ├── fonts/              # Script outlines and font metrics
        └── filters/            # Stream decoders/encoders (Flate, LZW, predictors)
```

---

## 4. Key Developer Commands & Quality Gates

Run these commands to develop and verify your changes:

### Frontend Commands (Node.js & Vite)
```bash
# Launch development server
npm run dev

# Mandatory Quality Gate: TypeScript check & production Vite build
npm run build
```

### Native Desktop Commands (Tauri v2 & Rust)
```bash
# Launch native desktop application in development
npm run tauri dev

# Mandatory Quality Gate: Fast Rust backend check
cargo check --manifest-path src-tauri/Cargo.toml

# Run native backend unit & integration tests
cargo test --manifest-path src-tauri/Cargo.toml

# Build native desktop installers (.deb, .AppImage, .dmg, .msi)
npm run tauri build
```

### Headless CLI & AI Agent (MCP) Commands
```bash
# Run CLI commands (info, combine, split, extract, protect, optimize, sanitize, redact, sign)
npm run cli -- help
npm run cli -- info document.pdf
npm run cli -- combine doc1.pdf doc2.pdf --out merged.pdf

# Run Model Context Protocol (MCP) server for AI assistants
npm run mcp

# Register with Claude Code
claude mcp add inkvault -- cargo run --manifest-path src-tauri/Cargo.toml -p inkvault-cli --bin inkvault -- mcp
```

---

## 5. Adding New Native PDF Capabilities

When exposing a new PDF feature from the `src-tauri/crates/` engine:
1. **Engine Logic:** Add the high-level function in [`src-tauri/src/pdf_engine.rs`](file:///run/media/gopik/S-Drive/Web%20Projects/InkVault/src-tauri/src/pdf_engine.rs).
2. **IPC Handler:** Expose a `#[tauri::command]` in [`src-tauri/src/lib.rs`](file:///run/media/gopik/S-Drive/Web%20Projects/InkVault/src-tauri/src/lib.rs) and register it in `tauri::generate_handler![]`.
3. **Frontend Bridge:** Add a typed wrapper in [`src/utils/nativePdfBridge.ts`](file:///run/media/gopik/S-Drive/Web%20Projects/InkVault/src/utils/nativePdfBridge.ts) with `isTauriEnvironment()` check and fallback.
4. **UI Integration:** Connect to the corresponding tool in `src/modes/studio/components/tools/`.
5. **Verify:** Confirm both `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml` succeed with code `0`.
