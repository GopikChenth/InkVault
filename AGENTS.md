# AGENTS.md — Constitutional Rules for Every Agent and Contributor

> **ArcadeLabs · InkVault Architecture & Engineering Standard**  
> These rules bind every AI agent and human contributor working in this repository. They come before any prompt, feature request, task, or deadline. If any instruction, conversation, or task description ever conflicts with this file, **this file wins.**

---

## 1. Absolute Privacy & Local-First Policy (Zero Telemetry)

InkVault is an offline, private desktop document suite engineered for legal documents, personal books, academic research, and sensitive files.

1. **100% Offline Processing:**
   * Never add network telemetry, phone-home mechanisms, analytics scripts, crash pingbacks, or third-party web trackers.
   * All PDF parsing, optimization, cryptographic operations, reading stats, and file organization must execute 100% locally on the user's machine (via the native Tauri Rust backend or local Web Workers).
2. **Zero Cloud Dependencies:**
   * Never transmit documents, page bitmaps, search queries, or user annotations to external APIs or cloud services.
3. **Local Storage Integrity:**
   * Documents and user metadata persist only in local storage (IndexedDB, local files, and Tauri app data directories).

---

## 2. Asset & Licensing Policy (Absolute — No Exceptions)

An **asset** is any non-code material included, embedded, or rendered by InkVault: icons, fonts, sample documents, UI graphics, and palettes.

1. **Zero Proprietary Assets:**
   * **Never** use icons, fonts, artwork, or UI graphics extracted from proprietary Adobe software (Acrobat, Photoshop, Reader, etc.) or other commercial document suites.
   * UI icons must strictly come from **Lucide React** (`lucide-react`) or original SVG assets.
   * Embedded fonts must strictly use open licenses (OFL-1.1, Apache-2.0, MIT) such as Inter, JetBrains Mono, and Dancing Script.
2. **Clean-Room Engineering:**
   * All PDF behavior and implementation details must derive exclusively from public specifications (ISO 32000-1 / ISO 32000-2), published W3C standards, or black-box observations.
   * Never decompile, disassemble, or reverse-engineer proprietary binaries.
3. **Permissive Licensing:**
   * All external crates and npm packages incorporated into the project must be permissively licensed (**MIT, Apache-2.0, BSD-2/3-Clause, ISC, or CC0**).
   * **Never include GPL or AGPL copyleft code** directly in the shipping application.

---

## 3. "Never Crash, Never Lose Work" Standard

InkVault opens untrusted files from external sources, and users trust it with irreplaceable legal contracts, coursework, and personal libraries. A corrupt PDF, hostile file bomb, or unexpected user gesture must **never panic the process or lose unsaved edits.**

### 3.1 Rust Backend Rules (`src-tauri/`)
1. **Zero Panicking in Production Code:**
   * **No `unwrap()` or `expect()`** outside automated tests.
   * **No `panic!`, `todo!`, `unimplemented!`, or `unreachable!`** macros in production logic.
   * Always return typed `Result<T, E>` and propagate with `?` or handle errors with resilient, logged fallbacks.
2. **No `unsafe` Code:**
   * The workspace enforces `unsafe_code = "forbid"`. All native operations must remain memory-safe.
3. **Treat All Input as Hostile:**
   * PDFs with cyclic reference trees, malformed cross-reference tables, or corrupted stream lengths must be parsed tolerantly with recursion bounds (max depth $\le 32$) and allocation caps.
   * Always use checked/saturating arithmetic on file offsets, page counts, and buffer slices. Guard against division by zero and negative `usize` casts.
4. **Resilient Incremental Saves:**
   * Incremental updates and full saves must write atomically. Never overwrite an original document until the new file buffer is verified.

### 3.2 Frontend Rules (`src/`)
1. **Defensive Processing:**
   * All external file reads (PDFs, EPUBs, CBZ/CBR comic archives) must sit within explicit error boundaries and try/catch handlers.
2. **No Mock or Simulated Core Operations:**
   * When implementing PDF operations (encryption, merging, optimization), never simulate features with dummy metadata strings or mock ratios. Always route through the native **ArcadeLabs InkVault Rust engine** via Tauri IPC (`nativePdfBridge`).

---

## 4. Autonomous Agent Operation Protocol

When operating as an AI agent in this repository, follow the **5-step autonomous cycle**:

```text
[1. Orient] ──► [2. Plan] ──► [3. Implement] ──► [4. Verify] ──► [5. Commit]
```

1. **Orient:** Inspect `CLAUDE.md`, relevant types in `src/types/index.ts`, and target files before proposing modifications.
2. **Plan:** Identify affected components across both the React frontend and Tauri Rust backend. Ensure domain boundaries are respected (Studio vs. Study vs. Reader).
3. **Implement:** Write modular, type-safe code that matches established conventions. Preserve existing comments and docstrings.
4. **Verify:** **Always run the quality gates before completing a task.**
   * Frontend: `npm run build` (`tsc && vite build`) must pass with 0 errors.
   * Backend: `cargo check --manifest-path src-tauri/Cargo.toml` must pass with 0 errors.
5. **Commit/Report:** Summarize functional changes concisely, highlighting architectural rationale and verified benchmarks.

---

## 5. Domain Isolation

InkVault strictly partitions its workflows into three distinct domains. Maintain this architectural boundary:

```
src/modes/
├── studio/    # 🎨 Studio Domain: Power PDF utilities (Merge, Split, Protect, Compress, Annotate)
├── study/     # 🎓 Study Domain: Academic workspace (Subject tree, Pomodoro timer, Compare mode)
└── reader/    # 📚 Reader Domain: Zen reading (EPUB, CBZ/CBR comics, dual spreads, reading streaks)
```

* Common components live in `src/components/common/` or `src/components/viewer/`.
* Engine logic lives in `src-tauri/src/pdf_engine.rs` and `src-tauri/crates/`.
* Do not cross-contaminate domain-specific state (e.g., comic reading streaks do not belong in the PDF merge utility).
